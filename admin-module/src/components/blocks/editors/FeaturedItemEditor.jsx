import { Box, Typography, Divider } from '@mui/material';
import { SelectField, TextField, SwitchField, TranslatableField } from '../fields/index.js';

const TYPE_OPTIONS = [
  { value: 'poi', label: 'POI' },
  { value: 'event', label: 'Event' },
  { value: 'article', label: 'Article' },
];
const VARIANT_OPTIONS = [
  { value: 'large_card', label: 'Large Card' },
  { value: 'split_image_text', label: 'Split Image + Text' },
  { value: 'overlay_hero', label: 'Overlay Hero' },
];

export default function FeaturedItemEditor({ data, onChange }) {
  const u = (field, value) => onChange({ ...data, [field]: value });
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
        Featured Item
      </Typography>
      <SelectField label="Item type" value={data.itemType || 'poi'} options={TYPE_OPTIONS} onChange={v => u('itemType', v)} />
      <TextField label="Item ID" value={data.itemId || ''} onChange={v => u('itemId', parseInt(v) || null)} type="number" helperText="The ID of the POI, event, or article to feature" />
      <SelectField label="Variant" value={data.variant || 'large_card'} options={VARIANT_OPTIONS} onChange={v => u('variant', v)} />
      <Divider sx={{ my: 1 }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
        Overrides (optional)
      </Typography>
      <TextField label="Custom title" value={data.customTitle || ''} onChange={v => u('customTitle', v)} helperText="Overrides the item's own title" />
      <TextField label="Custom description" value={data.customDescription || ''} onChange={v => u('customDescription', v)} multiline />
      <TextField label="Badge text" value={data.badgeText || ''} onChange={v => u('badgeText', v)} helperText="e.g. 'Tip of the day', 'Bestseller'" />
      <Divider sx={{ my: 1 }} />
      <SwitchField label="Show CTA button" checked={data.showCta !== false} onChange={v => u('showCta', v)} />
      {data.showCta !== false && (
        <>
          <TextField label="CTA label" value={data.ctaLabel || ''} onChange={v => u('ctaLabel', v)} helperText="Default: 'View'" />
          <TextField label="CTA link (optional)" value={data.ctaHref || ''} onChange={v => u('ctaHref', v)} helperText="Override destination URL" />
        </>
      )}
    </Box>
  );
}
