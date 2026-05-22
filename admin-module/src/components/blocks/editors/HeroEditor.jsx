import { useState } from 'react';
import { Box, Typography, Chip, Divider, Slider, Tabs, Tab, CircularProgress, Tooltip } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { TranslatableField, ImageUploadField, ButtonListField, SelectField, TextField, ColorField, SwitchField } from '../fields/index.js';
import { useBrandingDestinations } from '../../../hooks/useBrandingEditor.js';
import { useDestination } from '../DestinationContext.jsx';
import apiClient from '../../../api/client.js';
import AltTextGeneratorButton from '../AltTextGeneratorButton.jsx';

const BG_TYPE_OPTIONS = [
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'color', label: 'Solid Color' }
];

const HEIGHT_OPTIONS = [
  { value: 'compact', label: 'Compact' },
  { value: 'default', label: 'Default' },
  { value: 'tall', label: 'Tall' },
  { value: 'fullscreen', label: 'Fullscreen' }
];

const TEXT_ALIGN_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' }
];

const HEADLINE_SIZE_OPTIONS = [
  { value: 'small', label: 'Small' },
  { value: 'default', label: 'Default' },
  { value: 'large', label: 'Large' },
  { value: 'xlarge', label: 'Extra Large' }
];

const SOURCE_TABS = [
  { value: 'all', label: 'Alle' },
  { value: 'brand', label: 'Brand' },
  { value: 'media', label: 'Media' },
  { value: 'poi', label: 'POIs' }
];

function BrandVisualPicker({ onSelect }) {
  const { destinationId, destinationName } = useDestination();
  const [sourceTab, setSourceTab] = useState(0);
  const source = SOURCE_TABS[sourceTab].value;

  const { data, isLoading, error } = useQuery({
    queryKey: ['brand-visuals', destinationId, source],
    queryFn: async () => {
      const r = await apiClient.get('/brand-visuals', {
        params: { destinationId, source, limit: 50 }
      });
      return r.data;
    },
    enabled: Boolean(destinationId),
    staleTime: 2 * 60 * 1000
  });

  if (!destinationId) {
    return (
      <Box sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Geen destinatie-context — selecteer een pagina om quick-pick visuals te tonen.
        </Typography>
      </Box>
    );
  }

  const items = data?.data?.items || [];
  const bySource = data?.data?.by_source || { brand: 0, media: 0, poi: 0 };
  const apiUrl = import.meta.env.VITE_API_URL || '';

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          Brand Visuals — quick pick {destinationName ? `(${destinationName})` : ''}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Brand: {bySource.brand} · Media: {bySource.media} · POI: {bySource.poi}
        </Typography>
      </Box>
      <Tabs
        value={sourceTab}
        onChange={(_, v) => setSourceTab(v)}
        sx={{ minHeight: 32, mb: 1, '& .MuiTab-root': { minHeight: 32, py: 0.5, px: 1.5, minWidth: 60, fontSize: '0.75rem' } }}
      >
        {SOURCE_TABS.map((t) => <Tab key={t.value} label={t.label} />)}
      </Tabs>
      {isLoading && <Box sx={{ p: 2, textAlign: 'center' }}><CircularProgress size={20} /></Box>}
      {error && (
        <Typography variant="caption" color="error" sx={{ display: 'block' }}>
          Fout bij laden brand visuals: {error.message}
        </Typography>
      )}
      {!isLoading && !error && items.length === 0 && (
        <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Geen visuals gevonden voor deze bron. Upload via "Brand Visuals" tab in Branding, of voeg media met tags 'hero'/'brand' toe.
          </Typography>
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', maxHeight: 280, overflowY: 'auto' }}>
        {items.map((it) => {
          const thumbSrc = it.url && it.url.startsWith('http') ? it.url : `${apiUrl}${it.url || ''}`;
          const fullSrc = it.source_url && it.source_url.startsWith('http') ? it.source_url : `${apiUrl}${it.source_url || ''}`;
          const sourceColor = it.source === 'brand' ? '#10b981' : it.source === 'media' ? '#3b82f6' : '#f59e0b';
          return (
            <Tooltip key={it.id} title={it.alt_text || it.poi_name || it.source} arrow>
              <Box
                onClick={() => onSelect(it.source_url)}
                sx={{
                  width: 140, height: 78, borderRadius: 1, overflow: 'hidden', cursor: 'pointer',
                  border: '2px solid transparent', '&:hover': { borderColor: 'primary.main' },
                  position: 'relative', flexShrink: 0
                }}
              >
                <Box
                  component="img"
                  src={thumbSrc}
                  alt={it.alt_text || it.poi_name || `Visual ${it.id}`}
                  loading="lazy"
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={(e) => { e.target.style.opacity = 0.3; }}
                />
                <Chip
                  label={it.source.toUpperCase()}
                  size="small"
                  sx={{ position: 'absolute', top: 2, left: 2, height: 14, fontSize: '0.55rem', bgcolor: sourceColor, color: '#fff', fontWeight: 600 }}
                />
                {it.poi_name && (
                  <Chip
                    label={it.poi_name.slice(0, 18)}
                    size="small"
                    sx={{ position: 'absolute', bottom: 2, left: 2, right: 2, height: 14, fontSize: '0.55rem', bgcolor: 'rgba(0,0,0,0.7)', color: '#fff' }}
                  />
                )}
              </Box>
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
}

export default function HeroEditor({ block, onChange }) {
  const props = block.props || {};
  const textStyle = props.textStyle || {};
  const update = (key, val) => onChange({ ...props, [key]: val });
  const updateTextStyle = (key, val) => update('textStyle', { ...textStyle, [key]: val });

  return (
    <>
      {/* Content */}
      <TranslatableField label="Headline" value={props.headline} onChange={v => update('headline', v)} required />
      <TranslatableField label="Description" value={props.description} onChange={v => update('description', v)} multiline rows={3} />
      <TranslatableField label="Tagline" value={props.tagline} onChange={v => update('tagline', v)} />

      {/* Background */}
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
        Background
      </Typography>
      <SelectField label="Background Type" value={props.backgroundType || 'image'} onChange={v => update('backgroundType', v)} options={BG_TYPE_OPTIONS} />
      <SelectField label="Height" value={props.height || 'default'} onChange={v => update('height', v)} options={HEIGHT_OPTIONS} />
      {(props.backgroundType || 'image') === 'image' && (
        <>
          <BrandVisualPicker onSelect={(url) => update('image', url)} />
          <ImageUploadField label="Background Image" value={props.image} onChange={v => update('image', v)} />
          <TranslatableField label="Background Image - alt text" value={props.imageAlt} onChange={v => update('imageAlt', v)} helperText="WCAG 2.1 AA - beschrijf wat zichtbaar is" />
          {props.image && <AltTextGeneratorButton imageUrl={props.image} currentAlt={props.imageAlt} onGenerated={v => update('imageAlt', v)} />}
        </>
      )}
      {props.backgroundType === 'video' && (
        <>
          <TextField label="Video URL" value={props.videoUrl} onChange={v => update('videoUrl', v)} helperText="YouTube, Vimeo, or direct video URL" />
          <ImageUploadField label="Video Poster Image" value={props.videoPosterImage} onChange={v => update('videoPosterImage', v)} />
        </>
      )}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary', fontSize: '0.8rem' }}>
          Overlay Opacity: {textStyle.overlayOpacity ?? 60}%
        </Typography>
        <Slider
          value={textStyle.overlayOpacity ?? 60}
          onChange={(_, v) => updateTextStyle('overlayOpacity', v)}
          min={0} max={100} step={5}
          valueLabelDisplay="auto"
          size="small"
        />
      </Box>

      {/* Text Styling */}
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
        Text Styling
      </Typography>
      <SelectField label="Text Alignment" value={textStyle.textAlign || 'left'} onChange={v => updateTextStyle('textAlign', v)} options={TEXT_ALIGN_OPTIONS} />
      <SelectField label="Headline Size" value={textStyle.headlineSize || 'default'} onChange={v => updateTextStyle('headlineSize', v)} options={HEADLINE_SIZE_OPTIONS} />
      <ColorField label="Headline Color" value={textStyle.headlineColor || ''} onChange={v => updateTextStyle('headlineColor', v)} />
      <ColorField label="Description Color" value={textStyle.descriptionColor || ''} onChange={v => updateTextStyle('descriptionColor', v)} />
      <SwitchField label="Text Shadow (improves readability)" value={textStyle.textShadow ?? false} onChange={v => updateTextStyle('textShadow', v)} />

      {/* Buttons */}
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
        Buttons
      </Typography>
      <ButtonListField label="Buttons" value={props.buttons} onChange={v => update('buttons', v)} />
    </>
  );
}
