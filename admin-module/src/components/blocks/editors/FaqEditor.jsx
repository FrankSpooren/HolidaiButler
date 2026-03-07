import { TranslatableField, ItemListField } from '../fields/index.js';

export default function FaqEditor({ block, onChange }) {
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });

  return (
    <>
      <TranslatableField label="Title" value={props.title} onChange={v => update('title', v)} />
      <ItemListField
        label="FAQ Items"
        value={props.items}
        onChange={v => update('items', v)}
        createItem={() => ({ question: '', answer: '' })}
        renderItem={(item, _idx, updateField) => (
          <>
            <TranslatableField label="Question" value={item.question} onChange={v => updateField('question', v)} required />
            <TranslatableField label="Answer" value={item.answer} onChange={v => updateField('answer', v)} multiline rows={3} />
          </>
        )}
      />
    </>
  );
}
