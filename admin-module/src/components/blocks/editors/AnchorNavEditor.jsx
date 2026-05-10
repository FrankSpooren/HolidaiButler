import { Box, Typography } from '@mui/material';
import { SelectField, SwitchField } from '../fields/index.js';

export default function AnchorNavEditor({ data, onChange }) {
  const u = (f, v) => onChange({ ...data, [f]: v });
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>Anchor Navigation</Typography>
      <SelectField label="Source" value={data.source || 'auto_h2'} options={[{ value: 'auto_h2', label: 'Auto-detect H2 headings' }, { value: 'manual', label: 'Manual anchors' }]} onChange={v => u('source', v)} />
      <SelectField label="Position" value={data.position || 'sticky_top'} options={[{ value: 'sticky_top', label: 'Sticky top' }, { value: 'top', label: 'Static top' }]} onChange={v => u('position', v)} />
      <SelectField label="Style" value={data.variant || 'pills'} options={[{ value: 'pills', label: 'Pills' }, { value: 'tabs', label: 'Tabs' }, { value: 'list', label: 'List' }]} onChange={v => u('variant', v)} />
      <SwitchField label="Show progress bar" checked={data.showProgressBar || false} onChange={v => u('showProgressBar', v)} />
      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>Active section is highlighted via IntersectionObserver. Smooth scroll on click.</Typography>
    </Box>
  );
}
