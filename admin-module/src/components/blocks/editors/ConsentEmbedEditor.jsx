import { Box, Typography, Divider } from '@mui/material';
import { SelectField, TextField, SwitchField } from '../fields/index.js';

const EMBED_TYPES = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'vimeo', label: 'Vimeo' },
  { value: 'google_maps', label: 'Google Maps' },
  { value: 'spotify', label: 'Spotify' },
  { value: 'twitter', label: 'X / Twitter' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'iframe', label: 'Custom iframe' },
];
const ASPECT_OPTIONS = [
  { value: '16:9', label: '16:9 (video)' },
  { value: '4:3', label: '4:3' },
  { value: '1:1', label: '1:1 (square)' },
];

export default function ConsentEmbedEditor({ data, onChange }) {
  data = data || {};
  const u = (f, v) => onChange({ ...data, [f]: v });
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>Consent-aware Embed</Typography>
      <SelectField label="Embed type" value={data.embedType || 'youtube'} options={EMBED_TYPES} onChange={v => u('embedType', v)} />
      <TextField label="Embed URL" value={data.embedUrl || ''} onChange={v => u('embedUrl', v)} helperText="Full URL (e.g. https://youtube.com/watch?v=...)" />
      <SelectField label="Aspect ratio" value={data.aspectRatio || '16:9'} options={ASPECT_OPTIONS} onChange={v => u('aspectRatio', v)} />
      <TextField label="Height (px, optional)" value={data.height || ''} onChange={v => u('height', parseInt(v) || null)} type="number" />
      <Divider sx={{ my: 1 }} />
      <TextField label="Consent text" value={data.consentText || ''} onChange={v => u('consentText', v)} helperText="Default: 'Click to load [type] content'" />
      <TextField label="Privacy note" value={data.privacyNoteText || ''} onChange={v => u('privacyNoteText', v)} multiline />
      <TextField label="Privacy policy URL" value={data.privacyPolicyUrl || ''} onChange={v => u('privacyPolicyUrl', v)} />
      <TextField label="Thumbnail image URL" value={data.thumbnailImage || ''} onChange={v => u('thumbnailImage', v)} />
      <SwitchField label="Remember consent (per type)" checked={data.rememberConsent !== false} onChange={v => u('rememberConsent', v)} />
      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
        GDPR compliant: NO third-party requests before user consent.
        YouTube uses youtube-nocookie.com domain. Consent stored per embed type in localStorage.
      </Typography>
    </Box>
  );
}
