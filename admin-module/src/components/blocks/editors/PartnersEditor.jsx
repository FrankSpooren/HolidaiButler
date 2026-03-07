import { TranslatableField, NumberField, ItemListField, TextField, ImageUploadField } from '../fields/index.js';

export default function PartnersEditor({ block, onChange }) {
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });

  return (
    <>
      <TranslatableField label="Headline" value={props.headline} onChange={v => update('headline', v)} />
      <NumberField label="Columns" value={props.columns || 4} onChange={v => update('columns', v)} min={3} max={6} />
      <ItemListField
        label="Logos"
        value={props.logos}
        onChange={v => update('logos', v)}
        createItem={() => ({ src: '', alt: '', href: '' })}
        renderItem={(item, _idx, updateField) => (
          <>
            <ImageUploadField label="Logo" value={item.src} onChange={v => updateField('src', v)} />
            <TextField label="Alt text" value={item.alt} onChange={v => updateField('alt', v)} />
            <TextField label="Link URL" value={item.href} onChange={v => updateField('href', v)} />
          </>
        )}
      />
    </>
  );
}
