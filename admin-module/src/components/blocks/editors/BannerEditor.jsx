import { TranslatableField, SelectField, SwitchField, TextField } from '../fields/index.js';

const TYPE_OPTIONS = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'success', label: 'Success' },
  { value: 'promo', label: 'Promo' }
];

export default function BannerEditor({ block, onChange }) {
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });
  const link = props.link || { label: '', href: '' };

  return (
    <>
      <TranslatableField label="Message" value={props.message} onChange={v => update('message', v)} required />
      <SelectField label="Type" value={props.type || 'info'} onChange={v => update('type', v)} options={TYPE_OPTIONS} />
      <SwitchField label="Dismissible" value={props.dismissible} onChange={v => update('dismissible', v)} />
      <TextField label="Link Label" value={link.label} onChange={v => update('link', { ...link, label: v })} />
      <TextField label="Link URL" value={link.href} onChange={v => update('link', { ...link, href: v })} />
    </>
  );
}
