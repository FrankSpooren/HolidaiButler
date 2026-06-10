import { useState, useEffect } from 'react';
import {
  Box, Typography, Divider, Autocomplete, TextField as MuiTextField,
  CircularProgress, Paper, Chip, Tooltip
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import StarIcon from '@mui/icons-material/Star';
import { SelectField, TextField, SwitchField, TranslatableField } from '../fields/index.js';
import { useDestination } from '../DestinationContext.jsx';
import apiClient from '../../../api/client.js';

/**
 * FeaturedItemEditor v2 (BLOK E4 — 22-05-2026)
 *
 * Verbeteringen t.o.v. v1:
 *   - Autocomplete-search van content-items uit destinatie via
 *     /admin-portal/content-items/featured-candidates (DTO via ContentItemResource.V1)
 *   - Brand-fit-score badges (Jaccard similarity item.keyword_cluster ∩
 *     destination.brand_profile.seo_keywords) — items met hoogste fit bovenaan
 *   - Live preview card met title + image (Image Resize Proxy URLs) + SEO-score
 *
 * Backend block-data: { itemType, itemId, variant, customTitle (i18n),
 * customDescription (i18n), badgeText (i18n), showCta, ctaLabel (i18n), ctaHref }
 */

const TYPE_OPTIONS = [
  { value: 'poi', label: 'POI' },
  { value: 'event', label: 'Event' },
  { value: 'article', label: 'Article / Content Item' },
];
const VARIANT_OPTIONS = [
  { value: 'large_card', label: 'Large Card' },
  { value: 'split_image_text', label: 'Split Image + Text' },
  { value: 'overlay_hero', label: 'Overlay Hero' },
];

function BrandFitBadge({ score }) {
  if (score === null || score === undefined) return null;
  const pct = Math.round(score * 100);
  let color, icon, label;
  if (pct >= 50) { color = 'success'; icon = <VerifiedIcon sx={{ fontSize: '0.85rem !important' }} />; label = `Brand-fit ${pct}%`; }
  else if (pct >= 25) { color = 'primary'; icon = <StarIcon sx={{ fontSize: '0.85rem !important' }} />; label = `Brand-fit ${pct}%`; }
  else { color = 'default'; icon = null; label = `Brand-fit ${pct}%`; }
  return (
    <Tooltip title={`Brand-fit score: ${pct}% — overeenkomst met destination brand_profile keywords`}>
      <Chip size="small" color={color} icon={icon} label={label} variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
    </Tooltip>
  );
}

function ContentItemSearch({ value, onChange, destinationId, itemType }) {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState(null);

  // Note: itemType=poi skips this search (POI selector zou apart endpoint zijn — buiten scope BLOK E4)
  const isContentItem = itemType === 'article';

  useEffect(() => {
    if (!destinationId || !isContentItem) return;
    let cancelled = false;
    setLoading(true);
    apiClient.get('/content-items/featured-candidates', { params: { destinationId, search: inputValue || undefined, limit: 25 } })
      .then(r => { if (!cancelled) setOptions(r.data?.data?.items || []); })
      .catch(() => { if (!cancelled) setOptions([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [destinationId, inputValue, isContentItem]);

  useEffect(() => {
    if (!value) { setSelectedDetails(null); return; }
    if (selectedDetails?.id === value) return;
    // Bij saved value: zoek naar match in options (geen separate fetch — house keeping eenvoudig)
    const match = options.find(o => o.id === value);
    if (match) setSelectedDetails(match);
  }, [value, options, selectedDetails?.id]);

  if (!isContentItem) {
    return (
      <Box>
        <TextField label="Item ID" value={value || ''} onChange={v => onChange(parseInt(v) || null)} type="number" helperText={`ID van de ${itemType}`} />
      </Box>
    );
  }

  return (
    <Autocomplete
      size="small"
      options={options}
      value={selectedDetails}
      onChange={(_, newVal) => onChange(newVal?.id || null)}
      onInputChange={(_, val) => setInputValue(val)}
      getOptionLabel={(opt) => opt ? `${opt.title || opt.title_en || `#${opt.id}`}` : ''}
      isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
      loading={loading}
      renderOption={(propsLi, opt) => (
        <li {...propsLi} key={opt.id}>
          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', py: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ flex: 1 }}>{opt.title || opt.title_en || `#${opt.id}`}</Typography>
              <BrandFitBadge score={opt.brand_fit_score} />
              {opt.seo_score && <Chip size="small" label={`SEO ${opt.seo_score}`} variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />}
            </Box>
            <Typography variant="caption" color="text.secondary">
              {opt.content_type} · {opt.approval_status} · {opt.keyword_count || 0} keywords
            </Typography>
          </Box>
        </li>
      )}
      renderInput={(params) => (
        <MuiTextField
          {...params}
          label="Content item zoeken"
          placeholder={destinationId ? 'Typ titel...' : 'Selecteer eerst een destinatie'}
          InputProps={{
            ...params.InputProps,
            endAdornment: <>{loading && <CircularProgress size={16} />}{params.InputProps.endAdornment}</>,
          }}
        />
      )}
    />
  );
}

function ItemPreview({ item }) {
  if (!item) return null;
  const imageUrl = item.images?.[0]?.thumbnail || item.images?.[0]?.url;
  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: 'grey.50' }}>
      <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 600, color: 'text.secondary' }}>
        Live preview
      </Typography>
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        {imageUrl && (
          <Box
            component="img"
            src={imageUrl}
            alt={item.title || ''}
            sx={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }}
          />
        )}
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.title || item.title_en || `#${item.id}`}</Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
            <BrandFitBadge score={item.brand_fit_score} />
            {item.seo_score && <Chip size="small" label={`SEO ${item.seo_score}`} variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />}
            <Chip size="small" label={item.approval_status} color={item.approval_status === 'published' ? 'success' : 'default'} variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}

export default function FeaturedItemEditor({ data, onChange }) {
  data = data || {};
  const u = (field, value) => onChange({ ...data, [field]: value });
  const { destinationId } = useDestination();
  const itemType = data.itemType || 'poi';

  // Selected item details (fetch on mount/itemId change voor preview)
  const [selectedItem, setSelectedItem] = useState(null);
  useEffect(() => {
    if (!data.itemId || itemType !== 'article' || !destinationId) { setSelectedItem(null); return; }
    let cancelled = false;
    apiClient.get('/content-items/featured-candidates', { params: { destinationId, limit: 100 } })
      .then(r => {
        if (cancelled) return;
        const found = (r.data?.data?.items || []).find(it => it.id === data.itemId);
        setSelectedItem(found || null);
      })
      .catch(() => { if (!cancelled) setSelectedItem(null); });
    return () => { cancelled = true; };
  }, [data.itemId, itemType, destinationId]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
        Featured Item
      </Typography>

      <SelectField label="Item type" value={itemType} options={TYPE_OPTIONS} onChange={v => u('itemType', v)} />

      <ContentItemSearch value={data.itemId} onChange={v => u('itemId', v)} destinationId={destinationId} itemType={itemType} />

      {selectedItem && <ItemPreview item={selectedItem} />}

      <SelectField label="Variant" value={data.variant || 'large_card'} options={VARIANT_OPTIONS} onChange={v => u('variant', v)} />

      <Divider sx={{ my: 1 }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
        Overrides (optioneel)
      </Typography>
      <TranslatableField label="Custom title" value={data.customTitle} onChange={v => u('customTitle', v)} helperText="Overschrijft item's eigen title" />
      <TranslatableField label="Custom description" value={data.customDescription} onChange={v => u('customDescription', v)} multiline rows={2} />
      <TranslatableField label="Badge text" value={data.badgeText} onChange={v => u('badgeText', v)} helperText="bv. 'Tip of the day', 'Bestseller'" />

      <Divider sx={{ my: 1 }} />
      <SwitchField label="Show CTA button" value={data.showCta !== false} onChange={v => u('showCta', v)} />
      {data.showCta !== false && (
        <>
          <TranslatableField label="CTA label" value={data.ctaLabel} onChange={v => u('ctaLabel', v)} helperText="Default: 'View'" />
          <TextField label="CTA link (optional)" value={data.ctaHref || ''} onChange={v => u('ctaHref', v)} helperText="Override destination URL" />
        </>
      )}
    </Box>
  );
}
