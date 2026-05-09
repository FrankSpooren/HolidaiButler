import { Box, Typography } from '@mui/material';
import { SelectField, TextField, SwitchField } from '../fields/index.js';

const SOURCE_OPTIONS = [
  { value: 'poi', label: 'From POI data' },
  { value: 'manual', label: 'Manual entry' },
];
const VARIANT_OPTIONS = [
  { value: 'detailed', label: 'Detailed (parking, transport, accessibility)' },
  { value: 'compact', label: 'Compact (address only)' },
];

export default function LocationDetailsEditor({ data, onChange }) {
  const u = (field, value) => onChange({ ...data, [field]: value });
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>Location Details</Typography>
      <SelectField label="Source" value={data.source || 'poi'} options={SOURCE_OPTIONS} onChange={v => u('source', v)} />
      {data.source === 'poi' && <TextField label="POI ID" value={data.poiId || ''} onChange={v => u('poiId', parseInt(v) || null)} type="number" />}
      <SelectField label="Variant" value={data.variant || 'detailed'} options={VARIANT_OPTIONS} onChange={v => u('variant', v)} />
      <SwitchField label="Show 'Open in Maps' button" checked={data.showOpenInMaps !== false} onChange={v => u('showOpenInMaps', v)} />
      <SwitchField label="Show 'Copy address' button" checked={data.showCopyAddress !== false} onChange={v => u('showCopyAddress', v)} />
    </Box>
  );
}
