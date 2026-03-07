import { CategoryFilterField, NumberField, SelectField } from '../fields/index.js';

const COLUMN_OPTIONS = [
  { value: 2, label: '2 columns' },
  { value: 3, label: '3 columns' },
  { value: 4, label: '4 columns' }
];

export default function PoiGridEditor({ block, onChange }) {
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });

  return (
    <>
      <CategoryFilterField label="Category Filter" value={props.categoryFilter} onChange={v => update('categoryFilter', v)} />
      <NumberField label="Limit" value={props.limit || 12} onChange={v => update('limit', v)} min={1} max={50} />
      <SelectField label="Columns" value={props.columns || 3} onChange={v => update('columns', v)} options={COLUMN_OPTIONS} />
    </>
  );
}
