import { SelectField, SwitchField } from '../fields/index.js';

const LAYOUT_OPTIONS = [
  { value: 'compact', label: 'Compact' },
  { value: 'detailed', label: 'Detailed (5-day forecast)' }
];

export default function WeatherWidgetEditor({ block, onChange }) {
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });

  return (
    <>
      <SelectField label="Layout" value={props.layout || 'compact'} onChange={v => update('layout', v)} options={LAYOUT_OPTIONS} />
      <SwitchField label="Show Forecast" value={props.showForecast} onChange={v => update('showForecast', v)} />
    </>
  );
}
