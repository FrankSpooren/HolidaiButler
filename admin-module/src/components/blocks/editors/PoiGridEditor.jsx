import { CategoryFilterField, NumberField, SelectField, SwitchField } from '../fields/index.js';

const COLUMN_OPTIONS = [
  { value: 2, label: '2 columns' },
  { value: 3, label: '3 columns (default)' },
  { value: 4, label: '4 columns' }
];

const LAYOUT_OPTIONS = [
  { value: 'grid', label: 'Grid' },
  { value: 'list', label: 'List' },
  { value: 'compact', label: 'Compact' }
];

const TIER_FILTER_OPTIONS = [
  { value: 0, label: 'All tiers' },
  { value: 1, label: 'Tier 1 only' },
  { value: 2, label: 'Tier 1-2' },
  { value: 3, label: 'Tier 1-3' },
];

const SORT_OPTIONS = [
  { value: 'rating', label: 'Rating (highest first)' },
  { value: 'relevance', label: 'Relevance' },
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'newest', label: 'Newest first' },
  { value: 'random', label: 'Random' },
];

export default function PoiGridEditor({ block, onChange }) {
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });

  return (
    <>
      <CategoryFilterField label="Category Filter" value={props.categoryFilter} onChange={v => update('categoryFilter', v)} />
      <NumberField label="Limit" value={props.limit || 12} onChange={v => update('limit', v)} min={1} max={50} />
      <SelectField label="Columns" value={props.columns || 3} onChange={v => update('columns', v)} options={COLUMN_OPTIONS} />
      <SelectField label="Layout" value={props.layout || 'grid'} onChange={v => update('layout', v)} options={LAYOUT_OPTIONS} />
      <SelectField label="Tier Filter" value={props.tierFilter || 0} onChange={v => update('tierFilter', v)} options={TIER_FILTER_OPTIONS} />
      <SelectField label="Sort Order" value={props.sortOrder || 'rating'} onChange={v => update('sortOrder', v)} options={SORT_OPTIONS} />
      <SwitchField label="Show Tier Badge" value={props.showTierBadge !== false} onChange={v => update('showTierBadge', v)} />
    </>
  );
}
