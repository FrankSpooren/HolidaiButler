import { useState } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { TranslatableField, ImageUploadField, ButtonListField, SelectField, TextField } from '../fields/index.js';
import { useBrandingDestinations } from '../../../hooks/useBrandingEditor.js';

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

function BrandVisualPicker({ onSelect }) {
  const { data } = useBrandingDestinations();
  const destinations = data?.data?.destinations?.filter(d => d.isActive) || [];
  const allVisuals = destinations.flatMap(d => (d.branding?.brandVisuals || []).map(url => ({ url, dest: d.displayName })));

  if (allVisuals.length === 0) return null;

  const apiUrl = import.meta.env.VITE_API_URL || '';
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
        Brand Visuals (quick pick)
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {allVisuals.map(({ url, dest }, i) => (
          <Box
            key={i}
            onClick={() => onSelect(url)}
            sx={{
              width: 120, height: 60, borderRadius: 1, overflow: 'hidden', cursor: 'pointer',
              border: '2px solid transparent', '&:hover': { borderColor: 'primary.main' },
              position: 'relative'
            }}
          >
            <Box
              component="img"
              src={url.startsWith('http') ? url : `${apiUrl}${url}`}
              alt={`Visual ${i + 1}`}
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <Chip label={dest} size="small" sx={{ position: 'absolute', bottom: 2, left: 2, height: 16, fontSize: '0.55rem', bgcolor: 'rgba(0,0,0,0.6)', color: '#fff' }} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function HeroEditor({ block, onChange }) {
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });

  return (
    <>
      <TranslatableField label="Headline" value={props.headline} onChange={v => update('headline', v)} required />
      <TranslatableField label="Description" value={props.description} onChange={v => update('description', v)} multiline rows={3} />
      <TextField label="Tagline" value={props.tagline} onChange={v => update('tagline', v)} />
      <SelectField label="Background Type" value={props.backgroundType || 'image'} onChange={v => update('backgroundType', v)} options={BG_TYPE_OPTIONS} />
      <SelectField label="Height" value={props.height || 'default'} onChange={v => update('height', v)} options={HEIGHT_OPTIONS} />
      {(props.backgroundType || 'image') === 'image' && (
        <>
          <BrandVisualPicker onSelect={(url) => update('image', url)} />
          <ImageUploadField label="Background Image" value={props.image} onChange={v => update('image', v)} />
        </>
      )}
      {props.backgroundType === 'video' && (
        <>
          <TextField label="Video URL" value={props.videoUrl} onChange={v => update('videoUrl', v)} helperText="YouTube, Vimeo, or direct video URL" />
          <ImageUploadField label="Video Poster Image" value={props.videoPosterImage} onChange={v => update('videoPosterImage', v)} />
        </>
      )}
      <ButtonListField label="Buttons" value={props.buttons} onChange={v => update('buttons', v)} />
    </>
  );
}
