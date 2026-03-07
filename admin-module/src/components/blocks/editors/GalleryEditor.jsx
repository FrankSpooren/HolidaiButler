import { SelectField, ItemListField, TextField, ImageUploadField } from '../fields/index.js';

const COLUMN_OPTIONS = [
  { value: 2, label: '2 columns' },
  { value: 3, label: '3 columns' },
  { value: 4, label: '4 columns' }
];

const LAYOUT_OPTIONS = [
  { value: 'grid', label: 'Grid' },
  { value: 'masonry', label: 'Masonry' }
];

const TYPE_OPTIONS = [
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' }
];

export default function GalleryEditor({ block, onChange }) {
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });

  // Use items (mixed media) if present, otherwise convert images to items
  const items = props.items || (props.images || []).map(img => ({ type: 'image', url: img.src, alt: img.alt, caption: img.caption }));

  return (
    <>
      <SelectField label="Columns" value={props.columns || 3} onChange={v => update('columns', v)} options={COLUMN_OPTIONS} />
      <SelectField label="Layout" value={props.layout || 'grid'} onChange={v => update('layout', v)} options={LAYOUT_OPTIONS} />
      <ItemListField
        label="Gallery Items"
        value={items}
        onChange={v => {
          update('items', v);
          // Also update legacy images array for backward compat
          update('images', v.filter(i => i.type === 'image').map(i => ({ src: i.url, alt: i.alt, caption: i.caption })));
        }}
        createItem={() => ({ type: 'image', url: '', alt: '', caption: '' })}
        renderItem={(item, _idx, updateField) => (
          <>
            <SelectField label="Type" value={item.type || 'image'} onChange={v => updateField('type', v)} options={TYPE_OPTIONS} />
            {item.type === 'video' ? (
              <TextField label="Video URL" value={item.url} onChange={v => updateField('url', v)} required helperText="YouTube, Vimeo, or direct URL" />
            ) : (
              <ImageUploadField label="Image" value={item.url} onChange={v => updateField('url', v)} />
            )}
            {item.type === 'video' && (
              <ImageUploadField label="Thumbnail" value={item.thumbnailUrl} onChange={v => updateField('thumbnailUrl', v)} />
            )}
            <TextField label="Alt Text" value={item.alt} onChange={v => updateField('alt', v)} />
            <TextField label="Caption" value={item.caption} onChange={v => updateField('caption', v)} />
          </>
        )}
      />
    </>
  );
}
