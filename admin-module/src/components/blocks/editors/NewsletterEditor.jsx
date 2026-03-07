import { TranslatableField, SelectField, TextField } from '../fields/index.js';

const LAYOUT_OPTIONS = [
  { value: 'stacked', label: 'Stacked' },
  { value: 'inline', label: 'Inline' }
];

const BG_OPTIONS = [
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'surface', label: 'Surface' }
];

export default function NewsletterEditor({ block, onChange }) {
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });

  return (
    <>
      <TranslatableField label="Headline" value={props.headline} onChange={v => update('headline', v)} />
      <TranslatableField label="Description" value={props.description} onChange={v => update('description', v)} multiline rows={2} />
      <SelectField label="Layout" value={props.layout || 'stacked'} onChange={v => update('layout', v)} options={LAYOUT_OPTIONS} />
      <SelectField label="Background Color" value={props.backgroundColor || 'primary'} onChange={v => update('backgroundColor', v)} options={BG_OPTIONS} />
      <TextField label="MailerLite Group ID" value={props.mailerliteGroupId} onChange={v => update('mailerliteGroupId', v)} helperText="Optional: specific MailerLite group" />
    </>
  );
}
