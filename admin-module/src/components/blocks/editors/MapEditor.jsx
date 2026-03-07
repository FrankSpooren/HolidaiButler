import { NumberField, SwitchField, CategoryFilterField, TextField } from '../fields/index.js';

export default function MapEditor({ block, onChange }) {
  const props = block.props || {};
  const center = Array.isArray(props.center) ? props.center : [0, 0];
  const update = (key, val) => onChange({ ...props, [key]: val });

  return (
    <>
      <NumberField label="Latitude" value={center[0]} onChange={v => update('center', [v || 0, center[1]])} step={0.0001} />
      <NumberField label="Longitude" value={center[1]} onChange={v => update('center', [center[0], v || 0])} step={0.0001} />
      <NumberField label="Zoom Level" value={props.zoom || 13} onChange={v => update('zoom', v)} min={1} max={18} />
      <TextField label="Height" value={props.height} onChange={v => update('height', v)} helperText="e.g. 400px or 60vh" />
      <SwitchField label="Show Clusters" value={props.showClusters} onChange={v => update('showClusters', v)} />
      <CategoryFilterField label="Category Filter" value={props.categoryFilter} onChange={v => update('categoryFilter', v)} />
    </>
  );
}
