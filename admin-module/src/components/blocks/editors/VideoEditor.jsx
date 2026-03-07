import { TranslatableField, TextField, ImageUploadField, SelectField, SwitchField } from '../fields/index.js';

const LAYOUT_OPTIONS = [
  { value: 'full-width', label: 'Full Width' },
  { value: 'contained', label: 'Contained' },
  { value: 'side-by-side', label: 'Side by Side' }
];

const BG_OPTIONS = [
  { value: 'transparent', label: 'Transparent' },
  { value: 'primary', label: 'Primary' },
  { value: 'surface', label: 'Surface' }
];

export default function VideoEditor({ block, onChange }) {
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });

  return (
    <>
      <TranslatableField label="Headline" value={props.headline} onChange={v => update('headline', v)} />
      <TranslatableField label="Description" value={props.description} onChange={v => update('description', v)} multiline rows={2} />
      <TextField label="YouTube URL" value={props.youtubeUrl} onChange={v => update('youtubeUrl', v)} helperText="e.g. https://youtube.com/watch?v=..." />
      <TextField label="Vimeo URL" value={props.vimeoUrl} onChange={v => update('vimeoUrl', v)} helperText="e.g. https://vimeo.com/123456" />
      <TextField label="Video File URL" value={props.videoFile} onChange={v => update('videoFile', v)} helperText="Direct .mp4/.webm URL" />
      <ImageUploadField label="Poster Image" value={props.posterImage} onChange={v => update('posterImage', v)} />
      <SelectField label="Layout" value={props.layout || 'contained'} onChange={v => update('layout', v)} options={LAYOUT_OPTIONS} />
      <SelectField label="Background" value={props.backgroundColor || 'transparent'} onChange={v => update('backgroundColor', v)} options={BG_OPTIONS} />
      <SwitchField label="Autoplay" value={props.autoplay} onChange={v => update('autoplay', v)} />
      <SwitchField label="Muted" value={props.muted} onChange={v => update('muted', v)} />
    </>
  );
}
