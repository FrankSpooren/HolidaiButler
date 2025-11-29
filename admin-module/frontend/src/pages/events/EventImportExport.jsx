import { Box, Typography } from '@mui/material';
import ImportExport from '../../components/common/ImportExport';
import { eventsAPI } from '../../services/api';

const EVENT_IMPORT_TEMPLATE = `title_en,title_es,title_de,title_fr,title_nl,description_en,category,date,time,location_venue,location_address,location_city,location_country,capacity,pricing_isFree,pricing_basePrice,organizer_name,organizer_email
"Summer Music Festival","Festival de Música de Verano","Sommer Musikfestival","Festival de Musique d'Été","Zomer Muziekfestival","An amazing outdoor music festival",music,2024-07-15,18:00,"Central Park","Main Street 123","Amsterdam","Netherlands",5000,false,45.00,"Music Events Inc","info@musicevents.com"
"Tech Conference 2024","Conferencia de Tecnología 2024","Tech-Konferenz 2024","Conférence Tech 2024","Tech Conferentie 2024","Annual technology conference",technology,2024-09-20,09:00,"Convention Center","Tech Boulevard 456","Rotterdam","Netherlands",1000,false,150.00,"Tech Organizers","contact@techconf.com"`;

export default function EventImportExport() {
  const handleImport = async (file, content) => {
    try {
      // Parse CSV content
      const lines = content.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

      const results = {
        total: lines.length - 1,
        successful: 0,
        failed: 0,
        errors: [],
        warnings: []
      };

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        try {
          // Simple CSV parsing (in production, use a proper CSV parser library)
          const values = lines[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
          const cleanValues = values.map(v => v.trim().replace(/^"|"$/g, ''));

          const eventData = {
            title: {
              en: cleanValues[0] || '',
              es: cleanValues[1] || '',
              de: cleanValues[2] || '',
              fr: cleanValues[3] || '',
              nl: cleanValues[4] || ''
            },
            description: {
              en: cleanValues[5] || '',
              es: cleanValues[5] || '',
              de: cleanValues[5] || '',
              fr: cleanValues[5] || '',
              nl: cleanValues[5] || ''
            },
            category: cleanValues[6] || 'other',
            date: cleanValues[7] || '',
            time: cleanValues[8] || '',
            location: {
              venue: cleanValues[9] || '',
              address: cleanValues[10] || '',
              city: cleanValues[11] || '',
              country: cleanValues[12] || 'Netherlands'
            },
            capacity: parseInt(cleanValues[13]) || 100,
            pricing: {
              isFree: cleanValues[14]?.toLowerCase() === 'true',
              basePrice: parseFloat(cleanValues[15]) || 0,
              currency: 'EUR'
            },
            organizer: {
              name: cleanValues[16] || '',
              email: cleanValues[17] || ''
            },
            status: 'draft'
          };

          // Validate required fields
          if (!eventData.title.en) {
            throw new Error('Title (English) is required');
          }
          if (!eventData.date) {
            throw new Error('Date is required');
          }
          if (!eventData.location.city) {
            throw new Error('City is required');
          }

          // Create event via API
          const response = await eventsAPI.create(eventData);

          if (response.success) {
            results.successful++;
          } else {
            throw new Error(response.message || 'Failed to create event');
          }
        } catch (err) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            message: err.message || 'Unknown error'
          });
        }
      }

      return results;
    } catch (err) {
      throw new Error('Failed to parse CSV file: ' + err.message);
    }
  };

  const handleExport = async (options) => {
    try {
      const response = await eventsAPI.export({
        format: options.format,
        dateRange: options.dateRange
      });

      // If API doesn't support export, generate CSV locally
      if (!response.success) {
        // Fetch all events
        const eventsRes = await eventsAPI.getAll({ limit: 1000 });

        if (!eventsRes.success) {
          throw new Error('Failed to fetch events');
        }

        const events = eventsRes.data.events;

        let data = '';
        let mimeType = 'text/csv';
        let filename = `events_export_${new Date().toISOString().split('T')[0]}`;

        if (options.format === 'csv') {
          // Generate CSV
          const headers = [
            'ID', 'Title (EN)', 'Category', 'Date', 'Time',
            'Location', 'City', 'Capacity', 'Price', 'Status', 'Created'
          ];

          data = headers.join(',') + '\n';

          events.forEach(event => {
            const row = [
              event._id,
              `"${event.title?.en || event.title || ''}"`,
              event.category || '',
              event.date?.split('T')[0] || '',
              event.time || '',
              `"${event.location?.venue || ''}"`,
              event.location?.city || '',
              event.capacity || 0,
              event.pricing?.basePrice || 0,
              event.status || '',
              event.createdAt?.split('T')[0] || ''
            ];
            data += row.join(',') + '\n';
          });

          filename += '.csv';
        } else if (options.format === 'json') {
          // Generate JSON
          data = JSON.stringify(events, null, 2);
          mimeType = 'application/json';
          filename += '.json';
        } else if (options.format === 'excel') {
          // For Excel, fall back to CSV with different extension
          const headers = [
            'ID', 'Title (EN)', 'Category', 'Date', 'Time',
            'Location', 'City', 'Capacity', 'Price', 'Status', 'Created'
          ];

          data = headers.join(',') + '\n';

          events.forEach(event => {
            const row = [
              event._id,
              `"${event.title?.en || event.title || ''}"`,
              event.category || '',
              event.date?.split('T')[0] || '',
              event.time || '',
              `"${event.location?.venue || ''}"`,
              event.location?.city || '',
              event.capacity || 0,
              event.pricing?.basePrice || 0,
              event.status || '',
              event.createdAt?.split('T')[0] || ''
            ];
            data += row.join(',') + '\n';
          });

          mimeType = 'application/vnd.ms-excel';
          filename += '.xlsx';
        }

        return {
          data,
          mimeType,
          filename
        };
      }

      return response.data;
    } catch (err) {
      throw new Error('Export failed: ' + err.message);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Event Data Management
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Import events from CSV files or export your event data for backup and analysis.
        </Typography>
      </Box>

      <ImportExport
        title="Event Import & Export"
        moduleType="Events"
        onImport={handleImport}
        onExport={handleExport}
        importTemplate={EVENT_IMPORT_TEMPLATE}
        exportFormats={['csv', 'excel', 'json']}
      />
    </Box>
  );
}
