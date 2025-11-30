# Feature Planning: Batch Import/Export CSV

**Feature ID:** #4
**Priority:** HIGH (Phase 2)
**Estimated Time:** 6-8 hours
**Status:** Planning
**Created:** 17 November 2025

---

## 📋 Executive Summary

Enable bulk operations for POI management through CSV import/export functionality. This feature allows admins to:
- Import hundreds of POIs from CSV files in one operation
- Export filtered POI lists to CSV for external use
- Update existing POIs in bulk
- Validate data before import
- Track import/export history

**Business Value:**
- Reduces time from hours to minutes for bulk POI management
- Enables easy data migration from other systems
- Supports offline editing and batch updates
- Improves data quality with validation

---

## 🎯 Feature Requirements

### Functional Requirements

**Import:**
1. ✅ Upload CSV file (drag & drop or file picker)
2. ✅ Parse CSV and detect columns automatically
3. ✅ Map CSV columns to POI database fields
4. ✅ Preview data before import (first 10 rows)
5. ✅ Validate all data (required fields, formats, duplicates)
6. ✅ Display validation errors with line numbers
7. ✅ Choose import mode: "Add New" or "Update Existing" or "Add & Update"
8. ✅ Progress indicator during import
9. ✅ Summary report (imported, updated, failed)
10. ✅ Activity logging (who imported what when)

**Export:**
1. ✅ Export all POIs or filtered subset
2. ✅ Choose which columns to export
3. ✅ Preview export (first 10 rows)
4. ✅ Download as CSV file
5. ✅ Include metadata (export date, filters applied)
6. ✅ Activity logging

**Data Validation:**
- Required fields: name, category, city, country
- Email format validation
- Phone number format validation
- Latitude/longitude range validation (-90 to 90, -180 to 180)
- URL format validation (website, booking_url)
- Status enum validation (active, inactive, pending)
- Price level validation (1-4)
- Duplicate detection (by name + city)

### Non-Functional Requirements

**Performance:**
- Import up to 1,000 POIs in < 30 seconds
- Validate 1,000 rows in < 5 seconds
- Export 10,000 POIs in < 10 seconds

**Reliability:**
- Transaction-based import (all or nothing option)
- Partial import option (skip errors, import valid rows)
- Import rollback capability
- Error recovery

**Usability:**
- Intuitive column mapping interface
- Clear error messages with line numbers
- Mobile-responsive design
- Progress indicators

**Security:**
- File size limit (10 MB)
- Allowed file types (.csv only)
- Permission check (pois.import, pois.export)
- Activity logging for audit trail

---

## 🏗️ Technical Architecture

### Frontend Components

```
src/pages/pois/
├── POIImport.jsx          (Main import interface)
├── POIExport.jsx          (Main export interface)
└── components/
    ├── ImportUpload.jsx       (File upload with drag & drop)
    ├── ImportMapping.jsx      (Column mapping UI)
    ├── ImportPreview.jsx      (Data preview table)
    ├── ImportProgress.jsx     (Progress bar & status)
    ├── ImportSummary.jsx      (Results summary)
    ├── ExportFilters.jsx      (Export filter options)
    ├── ExportColumns.jsx      (Column selector)
    └── ExportPreview.jsx      (Export preview)
```

### Backend Endpoints

```
POST   /api/admin/pois/import/upload    - Upload CSV file
POST   /api/admin/pois/import/validate  - Validate CSV data
POST   /api/admin/pois/import/execute   - Execute import
GET    /api/admin/pois/import/history   - Import history

POST   /api/admin/pois/export           - Export POIs to CSV
GET    /api/admin/pois/export/template  - Download CSV template
GET    /api/admin/pois/export/history   - Export history
```

### Backend Utilities

```
backend/utils/
├── csvParser.js           (Papa Parse wrapper)
├── csvValidator.js        (Data validation)
├── csvExporter.js         (CSV generation)
└── csvMapper.js           (Column mapping logic)
```

### Database Tables

```sql
-- Store import/export history
CREATE TABLE POI_ImportExportHistory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_user_id INT NOT NULL,
  operation_type ENUM('import', 'export') NOT NULL,
  file_name VARCHAR(255),
  row_count INT,
  success_count INT,
  error_count INT,
  filters JSON,           -- Export filters applied
  mapping JSON,           -- Column mapping used
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  error_details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (admin_user_id) REFERENCES AdminUsers(id)
);
```

---

## 📝 CSV Format Specification

### Standard CSV Template

```csv
name,category,description,city,country,latitude,longitude,address,postal_code,phone,email,website,booking_url,price_level,status,google_place_id,tags
"Restaurant Example","restaurant","Great food","Barcelona","Spain",41.3851,2.1734,"Carrer Example 1","08001","+34123456789","info@example.com","https://example.com","https://booking.example.com",2,"active","ChIJ1234567890","italian,pasta,pizza"
```

### Required Fields
- name (VARCHAR 255)
- category (ENUM: restaurant, attraction, hotel, activity)
- city (VARCHAR 100)
- country (VARCHAR 100)

### Optional Fields
- description (TEXT)
- latitude (DECIMAL 10,8)
- longitude (DECIMAL 11,8)
- address (VARCHAR 255)
- postal_code (VARCHAR 20)
- phone (VARCHAR 50)
- email (VARCHAR 255)
- website (VARCHAR 255)
- booking_url (VARCHAR 255)
- price_level (INT 1-4)
- status (ENUM: active, inactive, pending, closed_temporarily, closed_permanently)
- google_place_id (VARCHAR 255)
- tags (comma-separated string)

### Complex Fields (JSON)
- opening_hours (JSON object or leave empty)
- amenities (comma-separated: wifi,parking,accessible)
- accessibility_features (comma-separated: wheelchair,elevator,braille)

### Example with Complex Fields

```csv
name,category,city,country,opening_hours,amenities,accessibility_features
"Hotel Example","hotel","Madrid","Spain","{""monday"":""0:00-24:00"",""tuesday"":""0:00-24:00""}","wifi,parking,pool","wheelchair,elevator"
```

---

## 🎨 UI/UX Design

### Import Flow

```
┌─────────────────────────────────────────────────┐
│  Step 1: Upload CSV                             │
│  ┌────────────────────────────────────────┐    │
│  │   📁 Drag & Drop CSV File              │    │
│  │        or Click to Browse              │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  [Download CSV Template]  [View Documentation]  │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Step 2: Map Columns                            │
│  CSV Column          →    Database Field        │
│  ┌─────────────┐         ┌─────────────┐       │
│  │ Name        │    →    │ name        │ ✓     │
│  │ Type        │    →    │ category    │ ✓     │
│  │ City Name   │    →    │ city        │ ✓     │
│  │ Latitude    │    →    │ latitude    │ ✓     │
│  │ [ignore]    │    →    │ [skip]      │       │
│  └─────────────┘         └─────────────┘       │
│                                                  │
│  [Auto-Detect Mapping]  [Save as Preset]        │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Step 3: Validate & Preview                     │
│  ✅ 98 rows valid   ❌ 2 rows have errors       │
│                                                  │
│  Validation Errors:                             │
│  • Row 15: Missing required field 'city'        │
│  • Row 42: Invalid email format                 │
│                                                  │
│  Preview (first 10 rows):                       │
│  ┌────────────────────────────────────────┐    │
│  │ Name         │ Category    │ City       │    │
│  │ Restaurant 1 │ restaurant  │ Barcelona  │    │
│  │ Hotel 2      │ hotel       │ Madrid     │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  Import Mode:                                   │
│  ○ Add New Only                                 │
│  ● Add New & Update Existing (by name + city)   │
│  ○ Update Existing Only                         │
│                                                  │
│  [Fix Errors in CSV] [Import Valid Rows Only]   │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Step 4: Import Progress                        │
│  Importing 98 POIs...                           │
│  ████████████████░░░░░░░░░░ 65%                │
│                                                  │
│  Status: Processing row 64 of 98                │
│  • 63 imported successfully                     │
│  • 1 updated                                    │
│  • 0 failed                                     │
│                                                  │
│  [Cancel Import]                                │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Step 5: Summary                                │
│  ✅ Import Completed Successfully               │
│                                                  │
│  📊 Results:                                    │
│  • Total rows: 98                               │
│  • ✅ Imported: 85                              │
│  • 🔄 Updated: 12                               │
│  • ❌ Failed: 1                                 │
│                                                  │
│  Failed rows:                                   │
│  • Row 42: Duplicate POI (Restaurant X, Madrid) │
│                                                  │
│  [Download Error Report] [View Imported POIs]   │
│  [Import Another File]                          │
└─────────────────────────────────────────────────┘
```

### Export Flow

```
┌─────────────────────────────────────────────────┐
│  Export POIs to CSV                             │
│                                                  │
│  Filters:                                       │
│  ┌────────────┬────────────┬────────────┐      │
│  │ Category   │ Status     │ City       │      │
│  │ [All]  ▼   │ [All]  ▼   │ [All]  ▼   │      │
│  └────────────┴────────────┴────────────┘      │
│                                                  │
│  Columns to Export:                             │
│  ☑ Name          ☑ Category     ☑ City         │
│  ☑ Country       ☑ Address      ☑ Phone        │
│  ☑ Email         ☑ Website      ☑ Status       │
│  ☑ Latitude      ☑ Longitude    □ Description  │
│  □ Opening Hours □ Amenities    □ Images        │
│                                                  │
│  [Select All] [Deselect All] [Essential Only]   │
│                                                  │
│  Preview (1,234 POIs will be exported):         │
│  ┌────────────────────────────────────────┐    │
│  │ Name         │ Category    │ City       │    │
│  │ Restaurant 1 │ restaurant  │ Barcelona  │    │
│  │ Hotel 2      │ hotel       │ Madrid     │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  [Cancel] [Export to CSV]                       │
└─────────────────────────────────────────────────┘
```

---

## 💻 Implementation Plan

### Session 1: Frontend Upload & Mapping (3-4 hours)

**Tasks:**
1. Install Papa Parse library: `npm install papaparse`
2. Create POIImport.jsx page with stepper component
3. Implement ImportUpload.jsx (drag & drop)
4. Implement ImportMapping.jsx (column mapping UI)
5. Add CSV template download
6. Basic validation (required fields)

**Deliverables:**
```
frontend/src/pages/pois/POIImport.jsx
frontend/src/pages/pois/components/ImportUpload.jsx
frontend/src/pages/pois/components/ImportMapping.jsx
frontend/public/templates/poi-import-template.csv
```

**Code Example - ImportUpload.jsx:**
```javascript
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

export default function ImportUpload({ onFileLoad }) {
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        onFileLoad({
          fileName: file.name,
          headers: results.meta.fields,
          rows: results.data,
          rowCount: results.data.length
        });
      },
      error: (error) => {
        toast.error(`CSV parse error: ${error.message}`);
      }
    });
  }, [onFileLoad]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxSize: 10485760, // 10 MB
    multiple: false
  });

  return (
    <Box {...getRootProps()} sx={{
      border: 2,
      borderColor: isDragActive ? 'primary.main' : 'grey.300',
      borderStyle: 'dashed',
      borderRadius: 2,
      p: 6,
      textAlign: 'center',
      cursor: 'pointer',
      bgcolor: isDragActive ? 'action.hover' : 'background.paper'
    }}>
      <input {...getInputProps()} />
      <CloudUploadIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
      {isDragActive ? (
        <Typography>Drop the CSV file here...</Typography>
      ) : (
        <>
          <Typography variant="h6" gutterBottom>
            Drag & Drop CSV File
          </Typography>
          <Typography color="text.secondary">
            or click to browse (Max 10 MB)
          </Typography>
        </>
      )}
    </Box>
  );
}
```

---

### Session 2: Backend Import & Validation (3-4 hours)

**Tasks:**
1. Create POI_ImportExportHistory table
2. Create backend import endpoints
3. Implement data validation
4. Implement bulk insert with transactions
5. Add duplicate detection
6. Error handling and logging

**Deliverables:**
```
backend/routes/adminPOI.js (add import endpoints)
backend/utils/csvValidator.js
backend/utils/poiImporter.js
backend/migrations/04-create-import-export-history.sql
```

**Code Example - csvValidator.js:**
```javascript
class CSVValidator {
  static validatePOI(row, lineNumber) {
    const errors = [];

    // Required fields
    if (!row.name || row.name.trim() === '') {
      errors.push(`Line ${lineNumber}: Missing required field 'name'`);
    }

    if (!row.category) {
      errors.push(`Line ${lineNumber}: Missing required field 'category'`);
    } else if (!['restaurant', 'attraction', 'hotel', 'activity'].includes(row.category)) {
      errors.push(`Line ${lineNumber}: Invalid category '${row.category}'`);
    }

    if (!row.city || row.city.trim() === '') {
      errors.push(`Line ${lineNumber}: Missing required field 'city'`);
    }

    if (!row.country || row.country.trim() === '') {
      errors.push(`Line ${lineNumber}: Missing required field 'country'`);
    }

    // Email format
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      errors.push(`Line ${lineNumber}: Invalid email format '${row.email}'`);
    }

    // Coordinates
    if (row.latitude) {
      const lat = parseFloat(row.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.push(`Line ${lineNumber}: Invalid latitude '${row.latitude}'`);
      }
    }

    if (row.longitude) {
      const lng = parseFloat(row.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        errors.push(`Line ${lineNumber}: Invalid longitude '${row.longitude}'`);
      }
    }

    // Price level
    if (row.price_level) {
      const price = parseInt(row.price_level);
      if (isNaN(price) || price < 1 || price > 4) {
        errors.push(`Line ${lineNumber}: Invalid price_level '${row.price_level}' (must be 1-4)`);
      }
    }

    return errors;
  }

  static validateBatch(rows) {
    const allErrors = [];
    const validRows = [];

    rows.forEach((row, index) => {
      const lineNumber = index + 2; // +2 because CSV has header and is 1-indexed
      const errors = this.validatePOI(row, lineNumber);

      if (errors.length === 0) {
        validRows.push(row);
      } else {
        allErrors.push(...errors);
      }
    });

    return {
      valid: allErrors.length === 0,
      validRowCount: validRows.length,
      invalidRowCount: rows.length - validRows.length,
      errors: allErrors,
      validRows
    };
  }
}

module.exports = CSVValidator;
```

**Code Example - Import Endpoint:**
```javascript
// POST /api/admin/pois/import/execute
router.post('/import/execute', verifyAdminToken, async (req, res) => {
  const adminUserId = req.adminUser.id;

  // Permission check
  if (!AdminUser.hasPermission(req.adminUser, 'pois', 'create')) {
    return res.status(403).json({ success: false, message: 'Permission denied' });
  }

  try {
    const { rows, mapping, importMode } = req.body;

    // Validate data
    const validation = CSVValidator.validateBatch(rows);

    if (!validation.valid && importMode === 'strict') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    // Start import
    const historyId = await db.execute(
      `INSERT INTO POI_ImportExportHistory (admin_user_id, operation_type, row_count, status)
       VALUES (?, 'import', ?, 'processing')`,
      [adminUserId, rows.length]
    );

    // Import in transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      let importedCount = 0;
      let updatedCount = 0;
      let failedCount = 0;

      for (const row of validation.validRows) {
        try {
          // Check for duplicates
          const [existing] = await connection.execute(
            'SELECT id FROM POI WHERE name = ? AND city = ?',
            [row.name, row.city]
          );

          if (existing.length > 0 && importMode === 'update') {
            // Update existing
            await connection.execute(
              `UPDATE POI SET category=?, description=?, country=?, latitude=?, longitude=?,
               address=?, postal_code=?, phone=?, email=?, website=?, booking_url=?,
               price_level=?, status=?, updated_at=NOW()
               WHERE id=?`,
              [row.category, row.description, row.country, row.latitude, row.longitude,
               row.address, row.postal_code, row.phone, row.email, row.website,
               row.booking_url, row.price_level, row.status || 'active', existing[0].id]
            );
            updatedCount++;
          } else if (existing.length === 0) {
            // Insert new
            await connection.execute(
              `INSERT INTO POI (name, category, description, city, country, latitude, longitude,
               address, postal_code, phone, email, website, booking_url, price_level, status,
               created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
              [row.name, row.category, row.description, row.city, row.country, row.latitude,
               row.longitude, row.address, row.postal_code, row.phone, row.email, row.website,
               row.booking_url, row.price_level, row.status || 'active']
            );
            importedCount++;
          } else {
            failedCount++;
          }
        } catch (err) {
          console.error('Failed to import row:', row, err);
          failedCount++;
        }
      }

      await connection.commit();

      // Update history
      await db.execute(
        `UPDATE POI_ImportExportHistory
         SET status='completed', success_count=?, error_count=?, completed_at=NOW()
         WHERE id=?`,
        [importedCount + updatedCount, failedCount, historyId.insertId]
      );

      // Log activity
      await AdminUser.logActivity(adminUserId, 'import', 'pois', null, {
        imported: importedCount,
        updated: updatedCount,
        failed: failedCount
      });

      res.json({
        success: true,
        message: 'Import completed',
        results: {
          total: rows.length,
          imported: importedCount,
          updated: updatedCount,
          failed: failedCount
        }
      });

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ success: false, message: 'Import failed', error: err.message });
  }
});
```

---

### Session 3: Export Functionality (2 hours)

**Tasks:**
1. Create POIExport.jsx page
2. Implement filter options
3. Implement column selector
4. Create backend export endpoint
5. CSV generation utility
6. Download functionality

**Deliverables:**
```
frontend/src/pages/pois/POIExport.jsx
frontend/src/pages/pois/components/ExportFilters.jsx
frontend/src/pages/pois/components/ExportColumns.jsx
backend/utils/csvExporter.js
```

**Code Example - Export Endpoint:**
```javascript
// POST /api/admin/pois/export
router.post('/export', verifyAdminToken, async (req, res) => {
  const adminUserId = req.adminUser.id;

  if (!AdminUser.hasPermission(req.adminUser, 'pois', 'read')) {
    return res.status(403).json({ success: false, message: 'Permission denied' });
  }

  try {
    const { filters, columns } = req.body;

    // Build query
    let query = 'SELECT * FROM POI WHERE 1=1';
    const params = [];

    if (filters.category) {
      query += ' AND category = ?';
      params.push(filters.category);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.city) {
      query += ' AND city LIKE ?';
      params.push(`%${filters.city}%`);
    }

    const [pois] = await db.execute(query, params);

    // Generate CSV
    const csvData = CSVExporter.generateCSV(pois, columns);

    // Log export
    await db.execute(
      `INSERT INTO POI_ImportExportHistory (admin_user_id, operation_type, row_count,
       success_count, filters, status, completed_at)
       VALUES (?, 'export', ?, ?, ?, 'completed', NOW())`,
      [adminUserId, pois.length, pois.length, JSON.stringify(filters)]
    );

    await AdminUser.logActivity(adminUserId, 'export', 'pois', null, {
      count: pois.length,
      filters
    });

    // Send CSV file
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="pois-export-${Date.now()}.csv"`);
    res.send(csvData);

  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ success: false, message: 'Export failed', error: err.message });
  }
});
```

---

## 🧪 Testing Plan

### Unit Tests

```javascript
// csvValidator.test.js
describe('CSVValidator', () => {
  test('validates required fields', () => {
    const row = { name: '', category: 'restaurant', city: 'Barcelona', country: 'Spain' };
    const errors = CSVValidator.validatePOI(row, 1);
    expect(errors).toContain("Line 1: Missing required field 'name'");
  });

  test('validates email format', () => {
    const row = { name: 'Test', category: 'restaurant', city: 'Barcelona',
                  country: 'Spain', email: 'invalid-email' };
    const errors = CSVValidator.validatePOI(row, 1);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('validates coordinates', () => {
    const row = { name: 'Test', category: 'restaurant', city: 'Barcelona',
                  country: 'Spain', latitude: '100', longitude: '200' };
    const errors = CSVValidator.validatePOI(row, 1);
    expect(errors.length).toBe(2);
  });
});
```

### Integration Tests

```javascript
// Import API test
test('POST /api/admin/pois/import/execute', async () => {
  const token = await getAdminToken();

  const response = await request(app)
    .post('/api/admin/pois/import/execute')
    .set('Authorization', `Bearer ${token}`)
    .send({
      rows: [
        { name: 'Test POI', category: 'restaurant', city: 'Barcelona', country: 'Spain' }
      ],
      importMode: 'add'
    });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.results.imported).toBe(1);
});
```

### Manual Testing Checklist

**Import Tests:**
- [ ] Upload valid CSV file → success
- [ ] Upload invalid file type → error
- [ ] Upload file > 10 MB → error
- [ ] Import with all required fields → success
- [ ] Import with missing required fields → validation errors shown
- [ ] Import with invalid email → validation error
- [ ] Import with duplicate POIs → handled correctly
- [ ] Import mode "Add New" → adds new POIs only
- [ ] Import mode "Update" → updates existing POIs
- [ ] Import mode "Add & Update" → does both
- [ ] Cancel import mid-process → stops gracefully
- [ ] View import history → shows all imports

**Export Tests:**
- [ ] Export all POIs → downloads CSV
- [ ] Export with filters → downloads filtered subset
- [ ] Export with custom columns → includes only selected columns
- [ ] Export 0 POIs → shows appropriate message
- [ ] Export 10,000+ POIs → completes without timeout
- [ ] View export history → shows all exports

**Mobile Tests:**
- [ ] Upload on mobile → works
- [ ] Column mapping on mobile → usable
- [ ] Preview on mobile → scrollable
- [ ] Export on mobile → downloads

---

## 📊 Success Metrics

**Quantitative:**
- Import success rate > 95%
- Export generation time < 10 seconds for 10k POIs
- Validation accuracy > 99%
- Zero data loss incidents

**Qualitative:**
- User can complete import without assistance
- Clear error messages help users fix issues
- Column mapping is intuitive
- Mobile experience is acceptable

---

## 🚀 Deployment Checklist

**Before Release:**
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Manual testing completed
- [ ] Documentation updated
- [ ] CSV template created
- [ ] Database migration run
- [ ] Performance tested (1000+ POIs)
- [ ] Error handling tested
- [ ] Mobile responsiveness verified
- [ ] Permission checks working
- [ ] Activity logging working

**Post-Release:**
- [ ] Monitor import/export success rates
- [ ] Collect user feedback
- [ ] Monitor error logs
- [ ] Track usage metrics
- [ ] Plan improvements based on feedback

---

## 📚 Documentation Needed

**User Documentation:**
- CSV format specification
- Column mapping guide
- Import troubleshooting guide
- Export best practices

**Developer Documentation:**
- API endpoint reference
- CSV validation rules
- Import algorithm details
- Performance optimization notes

---

## 🔮 Future Enhancements

**Phase 2.1 (Optional):**
- Excel file support (.xlsx)
- Custom field mapping presets
- Scheduled exports (daily/weekly)
- Email notification on import completion
- Import from URL
- Integration with Google Sheets

**Phase 2.2 (Optional):**
- Advanced duplicate detection (fuzzy matching)
- Data transformation rules
- Bulk update by ID
- Import validation API
- Export templates (preconfigured column sets)

---

**Planning Complete: 17 November 2025**
**Next Step:** Review plan with user, then begin implementation
**Estimated Total Time:** 6-8 hours over 3 sessions
