import { TranslatableField, ImageUploadField, ButtonListField, SelectField, TextField } from '../fields/index.js';

const BG_TYPE_OPTIONS = [
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'color', label: 'Solid Color' }
];

export default function HeroEditor({ block, onChange }) {
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });

  return (
    <>
      <TranslatableField label="Headline" value={props.headline} onChange={v => update('headline', v)} required />
      <TranslatableField label="Description" value={props.description} onChange={v => update('description', v)} multiline rows={3} />
      <TextField label="Tagline" value={props.tagline} onChange={v => update('tagline', v)} />
      <SelectField label="Background Type" value={props.backgroundType || 'image'} onChange={v => update('backgroundType', v)} options={BG_TYPE_OPTIONS} />
      {(props.backgroundType || 'image') === 'image' && (
        <ImageUploadField label="Background Image" value={props.image} onChange={v => update('image', v)} />
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
