import { Box, Typography, Divider } from '@mui/material';
import { SelectField, TextField, SwitchField } from '../fields/index.js';

const SOURCE_OPTIONS = [
  { value: 'event_id_from_url', label: 'Auto-detect from URL' },
  { value: 'specific_event', label: 'Specific event ID' },
  { value: 'manual', label: 'Manual event data' },
];
const STYLE_OPTIONS = [
  { value: 'dropdown', label: 'Dropdown button' },
  { value: 'inline', label: 'Inline buttons' },
];
const VARIANT_OPTIONS = [
  { value: 'compact', label: 'Compact (icons only inline)' },
  { value: 'full', label: 'Full (with labels)' },
];
const PROVIDERS = [
  { value: 'google', label: 'Google Calendar' },
  { value: 'apple', label: 'Apple / iCal' },
  { value: 'outlook', label: 'Outlook' },
  { value: 'yahoo', label: 'Yahoo Calendar' },
];

export default function AddToCalendarEditor({ data, onChange }) {
  const u = (field, value) => onChange({ ...data, [field]: value });
  const toggleProvider = (p) => {
    const current = data.providers || ['google', 'apple', 'outlook', 'yahoo'];
    const next = current.includes(p) ? current.filter(x => x !== p) : [...current, p];
    if (next.length === 0) return;
    u('providers', next);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
        Add to Calendar
      </Typography>
      <SelectField label="Event source" value={data.source || 'event_id_from_url'} options={SOURCE_OPTIONS} onChange={v => u('source', v)} />
      {data.source === 'specific_event' && (
        <TextField label="Event ID" value={data.eventId || ''} onChange={v => u('eventId', parseInt(v) || null)} type="number" />
      )}
      <SelectField label="Button style" value={data.buttonStyle || 'dropdown'} options={STYLE_OPTIONS} onChange={v => u('buttonStyle', v)} />
      <SelectField label="Variant" value={data.variant || 'compact'} options={VARIANT_OPTIONS} onChange={v => u('variant', v)} />
      <Divider sx={{ my: 1 }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
        Calendar Providers
      </Typography>
      {PROVIDERS.map(p => (
        <SwitchField key={p.value} label={p.label} checked={(data.providers || ['google', 'apple', 'outlook', 'yahoo']).includes(p.value)} onChange={() => toggleProvider(p.value)} />
      ))}
    </Box>
  );
}
