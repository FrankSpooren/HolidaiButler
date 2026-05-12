import { Box, Typography, Divider } from '@mui/material';
import { SelectField, TextField, SwitchField } from '../fields/index.js';

const SOURCE_OPTIONS = [
  { value: 'manual_waypoints', label: 'Manual waypoints' },
  { value: 'saved_trip', label: 'From visitor\'s saved trip' },
];
const MODE_OPTIONS = [
  { value: 'foot', label: 'Walking' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'driving', label: 'Driving' },
];
const VARIANT_OPTIONS = [
  { value: 'timeline', label: 'Timeline' },
  { value: 'list', label: 'List' },
  { value: 'map_split', label: 'Map + Timeline split' },
];

export default function ItineraryEditor({ data, onChange }) {
  data = data || {};
  const u = (field, value) => onChange({ ...data, [field]: value });
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>Itinerary / Route</Typography>
      <TextField label="Title" value={data.title || ''} onChange={v => u('title', v)} />
      <SelectField label="Source" value={data.source || 'manual_waypoints'} options={SOURCE_OPTIONS} onChange={v => u('source', v)} />
      <SelectField label="Transport mode" value={data.mode || 'foot'} options={MODE_OPTIONS} onChange={v => u('mode', v)} />
      <SelectField label="Variant" value={data.variant || 'timeline'} options={VARIANT_OPTIONS} onChange={v => u('variant', v)} />
      <SwitchField label="Show map" checked={data.showMap !== false} onChange={v => u('showMap', v)} />
      <SwitchField label="Show time estimates" checked={data.showTimeEstimates !== false} onChange={v => u('showTimeEstimates', v)} />
      <Divider sx={{ my: 1 }} />
      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
        Routes are calculated via self-hosted OSRM (EU-first, Hetzner).
        If OSRM is unavailable, straight-line distances are shown as fallback.
        Use "saved_trip" source to let visitors generate routes from their plan.
      </Typography>
    </Box>
  );
}
