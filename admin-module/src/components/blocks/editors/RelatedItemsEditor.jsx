import { Box, Typography, Divider } from '@mui/material';
import { SelectField, TextField, SwitchField } from '../fields/index.js';

const TYPE_OPTIONS = [
  { value: 'poi', label: 'POIs' },
  { value: 'event', label: 'Events' },
];
const STRATEGY_OPTIONS = [
  { value: 'same_category', label: 'Same category' },
  { value: 'nearby', label: 'Nearby (by distance)' },
];
const LAYOUT_OPTIONS = [
  { value: 'grid', label: 'Grid' },
  { value: 'list', label: 'List' },
  { value: 'carousel', label: 'Carousel' },
];
const CONTEXT_OPTIONS = [
  { value: 'auto', label: 'Auto-detect from URL' },
  { value: 'explicit', label: 'Specific item ID' },
];

export default function RelatedItemsEditor({ data, onChange }) {
  const u = (field, value) => onChange({ ...data, [field]: value });
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
        Related Items
      </Typography>
      <TextField label="Title" value={data.title || ''} onChange={v => u('title', v)} helperText="Default: 'You might also like'" />
      <SelectField label="Item type" value={data.itemType || 'poi'} options={TYPE_OPTIONS} onChange={v => u('itemType', v)} />
      <SelectField label="Strategy" value={data.relationStrategy || 'same_category'} options={STRATEGY_OPTIONS} onChange={v => u('relationStrategy', v)} />
      <SelectField label="Layout" value={data.layout || 'grid'} options={LAYOUT_OPTIONS} onChange={v => u('layout', v)} />
      <TextField label="Limit" value={data.limit ?? 4} onChange={v => u('limit', parseInt(v) || 4)} type="number" />
      <Divider sx={{ my: 1 }} />
      <SelectField label="Source context" value={data.sourceContext || 'auto'} options={CONTEXT_OPTIONS} onChange={v => u('sourceContext', v)} />
      {data.sourceContext === 'explicit' && (
        <TextField label="Source item ID" value={data.sourceId || ''} onChange={v => u('sourceId', parseInt(v) || null)} type="number" />
      )}
      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
        Place on POI or Event detail pages. Auto-detect reads the item ID from the page URL.
      </Typography>
    </Box>
  );
}
