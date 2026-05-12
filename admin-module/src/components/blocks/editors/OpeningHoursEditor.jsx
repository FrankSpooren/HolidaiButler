import { Box, Typography } from '@mui/material';
import { SelectField, TextField, SwitchField } from '../fields/index.js';

const SOURCE_OPTIONS = [
  { value: 'poi', label: 'From POI data' },
  { value: 'manual', label: 'Manual entry' },
];
const VARIANT_OPTIONS = [
  { value: 'detailed', label: 'Detailed (with highlights)' },
  { value: 'compact', label: 'Compact' },
];

export default function OpeningHoursEditor({ data, onChange }) {
  data = data || {};
  const u = (field, value) => onChange({ ...data, [field]: value });
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>Opening Hours</Typography>
      <SelectField label="Source" value={data.source || 'poi'} options={SOURCE_OPTIONS} onChange={v => u('source', v)} />
      {data.source === 'poi' && <TextField label="POI ID" value={data.poiId || ''} onChange={v => u('poiId', parseInt(v) || null)} type="number" />}
      <SelectField label="Variant" value={data.variant || 'detailed'} options={VARIANT_OPTIONS} onChange={v => u('variant', v)} />
      <SwitchField label="Show 'Open now' indicator" checked={data.showOpenNow !== false} onChange={v => u('showOpenNow', v)} />
      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
        Place on POI detail pages. Auto-reads opening_hours_json from POI data.
      </Typography>
    </Box>
  );
}
