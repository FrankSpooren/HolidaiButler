import { TranslatableField, SelectField, NumberField, SwitchField } from '../fields/index.js';

const PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' }
];

const COLUMN_OPTIONS = [
  { value: 2, label: '2 columns' },
  { value: 3, label: '3 columns' },
  { value: 4, label: '4 columns' }
];

export default function SocialFeedEditor({ block, onChange }) {
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });

  return (
    <>
      <SelectField label="Platform" value={props.platform || 'instagram'} onChange={v => update('platform', v)} options={PLATFORM_OPTIONS} required />
      <TranslatableField label="Headline" value={props.headline} onChange={v => update('headline', v)} />
      <NumberField label="Max Items" value={props.maxItems || 6} onChange={v => update('maxItems', v)} min={1} max={20} />
      <SelectField label="Columns" value={props.columns || 3} onChange={v => update('columns', v)} options={COLUMN_OPTIONS} />
      <SwitchField label="Show Follow Button" value={props.showFollowButton} onChange={v => update('showFollowButton', v)} />
    </>
  );
}
