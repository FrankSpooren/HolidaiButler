import { SelectField, TextField } from '../fields/index.js';

const POSITION_OPTIONS = [
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'bottom-left', label: 'Bottom Left' }
];

export default function ChatbotWidgetEditor({ block, onChange }) {
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });

  return (
    <>
      <TextField label="Chatbot Name" value={props.chatbotName} onChange={v => update('chatbotName', v)} helperText="e.g. HoliBot, Tessa, Wijze Warre" />
      <SelectField label="Position" value={props.position || 'bottom-right'} onChange={v => update('position', v)} options={POSITION_OPTIONS} />
    </>
  );
}
