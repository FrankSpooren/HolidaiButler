import { TranslatableField, SelectField, ItemListField, TextField, SwitchField } from '../fields/index.js';

const LAYOUT_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'side-by-side', label: 'Side by Side' }
];

const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Phone' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'select', label: 'Select' }
];

export default function ContactFormEditor({ block, onChange }) {
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });

  return (
    <>
      <TranslatableField label="Headline" value={props.headline} onChange={v => update('headline', v)} />
      <TranslatableField label="Description" value={props.description} onChange={v => update('description', v)} multiline rows={2} />
      <SelectField label="Layout" value={props.layout || 'default'} onChange={v => update('layout', v)} options={LAYOUT_OPTIONS} />
      <ItemListField
        label="Form Fields"
        value={props.fields}
        onChange={v => update('fields', v)}
        createItem={() => ({ name: '', type: 'text', label: '', required: false, placeholder: '' })}
        renderItem={(item, _idx, updateField) => (
          <>
            <TextField label="Field Name" value={item.name} onChange={v => updateField('name', v)} required helperText="Internal name (e.g. 'email')" />
            <TextField label="Label" value={item.label} onChange={v => updateField('label', v)} required />
            <SelectField label="Type" value={item.type || 'text'} onChange={v => updateField('type', v)} options={FIELD_TYPE_OPTIONS} />
            <TextField label="Placeholder" value={item.placeholder} onChange={v => updateField('placeholder', v)} />
            <SwitchField label="Required" value={item.required} onChange={v => updateField('required', v)} />
            {item.type === 'select' && (
              <TextField label="Options (comma-separated)" value={(item.options || []).join(', ')} onChange={v => updateField('options', v.split(',').map(s => s.trim()).filter(Boolean))} />
            )}
          </>
        )}
      />
    </>
  );
}
