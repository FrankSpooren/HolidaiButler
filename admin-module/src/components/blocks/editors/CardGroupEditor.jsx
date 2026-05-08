import { TranslatableField, SelectField, ItemListField, TextField, ImageUploadField } from '../fields/index.js';

const VARIANT_OPTIONS = [
  { value: 'curated', label: 'Curated' },
  { value: 'offer', label: 'Aanbieding' },
  { value: 'related', label: 'Gerelateerd' }
];

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
  const variant = props.variant || 'curated';
  const update = (key, val) => onChange({ ...props, [key]: val });

  return (
    <>
      <SelectField label="Variant" value={variant} onChange={v => update('variant', v)} options={VARIANT_OPTIONS} />
      <TranslatableField label="Headline" value={props.headline} onChange={v => update('headline', v)} />
      <SelectField label="Columns" value={props.columns || 3} onChange={v => update('columns', v)} options={COLUMN_OPTIONS} />
      <SelectField label="Layout" value={props.layout || 'grid'} onChange={v => update('layout', v)} options={LAYOUT_OPTIONS} />
      <ItemListField
        label="Cards"
        value={props.cards}
        onChange={v => update('cards', v)}
        createItem={() => ({ title: '', description: '', image: '', href: '', badge: '', price: '' })}
        renderItem={(item, _idx, updateField) => (
          <>
            <TextField label="Title" value={item.title} onChange={v => updateField('title', v)} required />
            <TextField label="Description" value={item.description} onChange={v => updateField('description', v)} multiline rows={2} />
            <ImageUploadField label="Image" value={item.image} onChange={v => updateField('image', v)} />
            <TextField label="Link URL" value={item.href} onChange={v => updateField('href', v)} />
            <TextField label="Badge" value={item.badge} onChange={v => updateField('badge', v)} placeholder="Nieuw, Aanbieding, ..." />
            {variant === 'offer' && (
              <>
                <TextField label="Prijs" value={item.price} onChange={v => updateField('price', v)} placeholder="29.95" />
                <TextField label="Valuta" value={item.priceCurrency} onChange={v => updateField('priceCurrency', v)} placeholder="\u20ac" />
              </>
            )}
          </>
        )}
      />
    </>
  );
}
