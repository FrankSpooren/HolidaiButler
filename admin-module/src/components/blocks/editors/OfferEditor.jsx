import { Box, Typography, Divider } from '@mui/material';
import { SelectField, TextField, SwitchField } from '../fields/index.js';

export default function OfferEditor({ data, onChange }) {
  data = data || {};
  const u = (f, v) => onChange({ ...data, [f]: v });
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>Offer / Package</Typography>
      <SelectField label="Variant" value={data.variant || 'single_offer'} options={[{ value: 'single_offer', label: 'Single offer' }, { value: 'comparison', label: 'Comparison (side-by-side)' }, { value: 'bundle', label: 'Bundle' }]} onChange={v => u('variant', v)} />
      <SelectField label="Layout" value={data.layout || 'grid'} options={[{ value: 'grid', label: 'Grid' }, { value: 'horizontal', label: 'Horizontal scroll' }, { value: 'vertical', label: 'Vertical stack' }]} onChange={v => u('layout', v)} />
      <SwitchField label="Show countdown timer" checked={data.showCountdown || false} onChange={v => u('showCountdown', v)} />
      <Divider sx={{ my: 1 }} />
      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
        Configure individual offers in the JSON editor below. Each offer supports:
        title, description, image, originalPrice, discountedPrice, currency, validUntil,
        badge, features[], bookingUrl, bookingType (internal_ticket_shop/external_url/request_only).
        Schema.org Offer/AggregateOffer is automatically generated.
      </Typography>
    </Box>
  );
}
