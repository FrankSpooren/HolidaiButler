import { Box, Typography } from '@mui/material';
import { SelectField, TextField, SwitchField } from '../fields/index.js';

const VARIANT_OPTIONS = [
  { value: 'view_my_plan', label: 'Full plan view (with remove + share)' },
  { value: 'add_button', label: 'Add button (for detail pages)' },
  { value: 'mini_widget', label: 'Mini widget (count badge)' },
];

export default function SaveToTripEditor({ data, onChange }) {
  data = data || {};
  const u = (field, value) => onChange({ ...data, [field]: value });
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>Save to Trip</Typography>
      <SelectField label="Variant" value={data.variant || 'view_my_plan'} options={VARIANT_OPTIONS} onChange={v => u('variant', v)} />
      <SwitchField label="Show item count" checked={data.showCount !== false} onChange={v => u('showCount', v)} />
      <TextField label="CTA label (add_button only)" value={data.ctaLabel || ''} onChange={v => u('ctaLabel', v)} />
      <TextField label="Empty state message" value={data.emptyStateMessage || ''} onChange={v => u('emptyStateMessage', v)} multiline />
      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
        Stores items in browser localStorage (anonymous, no account needed).
        Max 50 items. Cross-block sync via window events.
      </Typography>
    </Box>
  );
}
