import { RichTextField } from '../fields/index.js';

export default function RichTextEditor({ block, onChange }) {
  const props = block.props || {};
  return (
    <RichTextField
      label="Content"
      value={props.content}
      onChange={v => onChange({ ...props, content: v })}
    />
  );
}
