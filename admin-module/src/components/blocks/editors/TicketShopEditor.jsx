import { TranslatableField, NumberField, SelectField, SwitchField } from '../fields/index.js';

const LAYOUT_OPTIONS = [
  { value: 'grid', label: 'Grid' },
  { value: 'list', label: 'List' }
];

export default function TicketShopEditor({ block, onChange }) {
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });

  return (
    <>
      <TranslatableField label="Headline" value={props.headline} onChange={v => update('headline', v)} />
      <TranslatableField label="Description" value={props.description} onChange={v => update('description', v)} multiline rows={2} />
      <NumberField label="Limit" value={props.limit || 10} onChange={v => update('limit', v)} min={1} max={50} />
      <SelectField label="Layout" value={props.layout || 'grid'} onChange={v => update('layout', v)} options={LAYOUT_OPTIONS} />
      <SwitchField label="Show Prices" value={props.showPrices !== false} onChange={v => update('showPrices', v)} />
    </>
  );
}
