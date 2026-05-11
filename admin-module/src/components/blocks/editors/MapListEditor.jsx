import { Box, Typography, Divider } from '@mui/material';
import { SelectField, TextField, SwitchField } from '../fields/index.js';

const SOURCE_OPTIONS = [
  { value: 'pois', label: 'POIs' },
  { value: 'events', label: 'Events' },
];

const LAYOUT_OPTIONS = [
  { value: 'split_60_40', label: '60/40 (map larger)' },
  { value: 'split_50_50', label: '50/50 (equal)' },
  { value: 'split_70_30', label: '70/30 (map dominant)' },
];

const HEIGHT_OPTIONS = [
  { value: 'compact', label: 'Compact (50vh)' },
  { value: 'medium', label: 'Medium (65vh)' },
  { value: 'full', label: 'Full (80vh)' },
];

/**
 * MapListEditor — Admin block editor for Map+List block (VII-E2 A3)
 */
export default function MapListEditor({ data, onChange }) {
  data = data || {};
  const updateField = (field, value) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
        Map + List Configuration
      </Typography>

      <TextField
        label="Title (optional)"
        value={data.title || ''}
        onChange={(val) => updateField('title', val)}
      />

      <SelectField
        label="Data source"
        value={data.source || 'pois'}
        options={SOURCE_OPTIONS}
        onChange={(val) => updateField('source', val)}
      />

      <SelectField
        label="Layout"
        value={data.layout || 'split_60_40'}
        options={LAYOUT_OPTIONS}
        onChange={(val) => updateField('layout', val)}
      />

      <SelectField
        label="Height"
        value={data.height || 'medium'}
        options={HEIGHT_OPTIONS}
        onChange={(val) => updateField('height', val)}
      />

      <Divider sx={{ my: 1 }} />

      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
        Filters
      </Typography>

      <TextField
        label="Categories (comma-separated)"
        value={(data.categories || []).join(', ')}
        onChange={(val) => updateField('categories', val.split(',').map(s => s.trim()).filter(Boolean))}
        helperText="Leave empty for tourist categories. Example: Natuur, Eten & Drinken"
      />

      <TextField
        label="Minimum rating"
        value={data.minRating ?? 3.5}
        onChange={(val) => updateField('minRating', parseFloat(val) || 0)}
        type="number"
      />

      <TextField
        label="Max items"
        value={data.limit ?? 30}
        onChange={(val) => updateField('limit', parseInt(val) || 30)}
        type="number"
      />

      <SwitchField
        label="Enable marker clustering"
        checked={data.enableClustering || false}
        onChange={(val) => updateField('enableClustering', val)}
      />

      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, fontSize: '0.75rem' }}>
        Bidirectional sync: clicking a card flies the map to the marker, clicking a marker scrolls to the card.
        On mobile, a tab switcher toggles between Map and List views.
      </Typography>
    </Box>
  );
}
