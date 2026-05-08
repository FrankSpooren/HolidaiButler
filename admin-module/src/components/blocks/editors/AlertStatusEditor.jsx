import { TranslatableField, SelectField, SwitchField, TextField } from '../fields/index.js';

const SEVERITY_OPTIONS = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Waarschuwing' },
  { value: 'error', label: 'Fout / Kritiek' }
];

const CONTEXT_OPTIONS = [
  { value: 'general', label: 'Algemeen' },
  { value: 'closure', label: 'Sluiting' },
  { value: 'weather', label: 'Weersalarm' },
  { value: 'capacity', label: 'Capaciteit vol' },
  { value: 'soldout', label: 'Uitverkocht' }
];

export default function AlertStatusEditor({ block, onChange }) {
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });

  return (
    <>
      <SelectField label="Severity" value={props.severity || 'warning'} onChange={v => update('severity', v)} options={SEVERITY_OPTIONS} />
      <TranslatableField label="Message" value={props.message} onChange={v => update('message', v)} required />
      <SelectField label="Context" value={props.context || 'general'} onChange={v => update('context', v)} options={CONTEXT_OPTIONS} />
      <SwitchField label="Dismissible" value={props.dismissible || false} onChange={v => update('dismissible', v)} />
      <TextField label="Verloopt op (ISO datum)" value={props.expiresAt || ''} onChange={v => update('expiresAt', v)} placeholder="2026-06-01T18:00:00" />
    </>
  );
}
