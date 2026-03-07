import { TranslatableField, NumberField, SwitchField } from '../fields/index.js';

export default function ReservationWidgetEditor({ block, onChange }) {
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });

  return (
    <>
      <TranslatableField label="Headline" value={props.headline} onChange={v => update('headline', v)} />
      <TranslatableField label="Description" value={props.description} onChange={v => update('description', v)} multiline rows={2} />
      <NumberField label="Default POI ID" value={props.defaultPoiId} onChange={v => update('defaultPoiId', v)} helperText="Optional: pre-select a specific POI" />
      <SwitchField label="Show Search" value={props.showSearch !== false} onChange={v => update('showSearch', v)} />
    </>
  );
}
