import { TranslatableField, ButtonListField, SelectField } from '../fields/index.js';

const BG_STYLE_OPTIONS = [
  { value: 'primary', label: 'Primary' },
  { value: 'accent', label: 'Accent' },
  { value: 'gradient', label: 'Gradient' }
];

export default function CtaEditor({ block, onChange }) {
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });

  return (
    <>
      <TranslatableField label="Headline" value={props.headline} onChange={v => update('headline', v)} required />
      <TranslatableField label="Description" value={props.description} onChange={v => update('description', v)} multiline rows={2} />
      <SelectField label="Background Style" value={props.backgroundStyle || 'primary'} onChange={v => update('backgroundStyle', v)} options={BG_STYLE_OPTIONS} />
      <ButtonListField label="Buttons" value={props.buttons} onChange={v => update('buttons', v)} />
    </>
  );
}
