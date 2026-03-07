import { TranslatableField, NumberField, SelectField, SwitchField } from '../fields/index.js';

const LAYOUT_OPTIONS = [
  { value: 'list', label: 'List' },
  { value: 'grid', label: 'Grid' },
  { value: 'compact', label: 'Compact' }
];

export default function EventCalendarEditor({ block, onChange }) {
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });

  return (
    <>
      <TranslatableField label="Title" value={props.title} onChange={v => update('title', v)} />
      <NumberField label="Max Events" value={props.limit || 10} onChange={v => update('limit', v)} min={1} max={50} />
      <SelectField label="Layout" value={props.layout || 'list'} onChange={v => update('layout', v)} options={LAYOUT_OPTIONS} />
      <SwitchField label="Show Past Events" value={props.showPastEvents} onChange={v => update('showPastEvents', v)} />
    </>
  );
}
