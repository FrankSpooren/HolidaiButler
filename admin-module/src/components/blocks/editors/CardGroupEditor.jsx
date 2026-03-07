import { TranslatableField, SelectField, ItemListField, TextField, ImageUploadField } from '../fields/index.js';

const COLUMN_OPTIONS = [
  { value: 2, label: '2 columns' },
  { value: 3, label: '3 columns' },
  { value: 4, label: '4 columns' }
];

const LAYOUT_OPTIONS = [
  { value: 'grid', label: 'Grid' },
  { value: 'carousel', label: 'Carousel' }
];

export default function CardGroupEditor({ block, onChange }) {
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });

  return (
    <>
      <TranslatableField label="Headline" value={props.headline} onChange={v => update('headline', v)} />
      <SelectField label="Columns" value={props.columns || 3} onChange={v => update('columns', v)} options={COLUMN_OPTIONS} />
      <SelectField label="Layout" value={props.layout || 'grid'} onChange={v => update('layout', v)} options={LAYOUT_OPTIONS} />
      <ItemListField
        label="Cards"
        value={props.cards}
        onChange={v => update('cards', v)}
        createItem={() => ({ title: '', description: '', image: '', href: '' })}
        renderItem={(item, _idx, updateField) => (
          <>
            <TextField label="Title" value={item.title} onChange={v => updateField('title', v)} required />
            <TextField label="Description" value={item.description} onChange={v => updateField('description', v)} multiline rows={2} />
            <ImageUploadField label="Image" value={item.image} onChange={v => updateField('image', v)} />
            <TextField label="Link URL" value={item.href} onChange={v => updateField('href', v)} />
          </>
        )}
      />
    </>
  );
}
