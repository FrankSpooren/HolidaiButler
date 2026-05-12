import { Box, Typography } from '@mui/material';
import { SelectField, SwitchField } from '../fields/index.js';

export default function BreadcrumbsEditor({ data, onChange }) {
  data = data || {};
  const u = (f, v) => onChange({ ...data, [f]: v });
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>Breadcrumbs</Typography>
      <SelectField label="Source" value={data.source || 'auto_url'} options={[{ value: 'auto_url', label: 'Auto from URL' }, { value: 'manual', label: 'Manual items' }]} onChange={v => u('source', v)} />
      <SelectField label="Separator" value={data.separator || 'chevron'} options={[{ value: 'chevron', label: 'Chevron (›)' }, { value: '>', label: '>' }, { value: '/', label: '/' }, { value: '\u00B7', label: 'Dot (·)' }]} onChange={v => u('separator', v)} />
      <SwitchField label="Show home icon" checked={data.showHomeIcon !== false} onChange={v => u('showHomeIcon', v)} />
      <SelectField label="Variant" value={data.variant || 'full'} options={[{ value: 'full', label: 'Full' }, { value: 'compact', label: 'Compact (smaller text)' }]} onChange={v => u('variant', v)} />
      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>Schema.org BreadcrumbList is automatically generated for SEO.</Typography>
    </Box>
  );
}
