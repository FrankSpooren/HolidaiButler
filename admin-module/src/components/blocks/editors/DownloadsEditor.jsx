import { TranslatableField, ItemListField, TextField, SelectField } from '../fields/index.js';

const FILE_TYPE_OPTIONS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'doc', label: 'DOC/DOCX' },
  { value: 'gpx', label: 'GPX' },
  { value: 'xlsx', label: 'Excel' },
  { value: 'zip', label: 'ZIP' },
  { value: 'other', label: 'Other' }
];

export default function DownloadsEditor({ block, onChange }) {
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });

  return (
    <>
      <TranslatableField label="Headline" value={props.headline} onChange={v => update('headline', v)} />
      <ItemListField
        label="Files"
        value={props.files}
        onChange={v => update('files', v)}
        createItem={() => ({ name: '', url: '', description: '', fileType: 'pdf', fileSize: '' })}
        renderItem={(item, _idx, updateField) => (
          <>
            <TextField label="Name" value={item.name} onChange={v => updateField('name', v)} required />
            <TextField label="Download URL" value={item.url} onChange={v => updateField('url', v)} required />
            <TextField label="Description" value={item.description} onChange={v => updateField('description', v)} />
            <SelectField label="File Type" value={item.fileType || 'pdf'} onChange={v => updateField('fileType', v)} options={FILE_TYPE_OPTIONS} />
            <TextField label="File Size" value={item.fileSize} onChange={v => updateField('fileSize', v)} helperText="e.g. 2.4 MB" />
          </>
        )}
      />
    </>
  );
}
