import { Autocomplete, Chip, TextField } from '@mui/material';

const DEFAULT_CATEGORIES = [
  'restaurant', 'cafe', 'bar', 'hotel', 'museum', 'park', 'beach', 'shop',
  'attraction', 'nature', 'sport', 'nightlife', 'cultural', 'market',
  'pharmacy', 'supermarket', 'bakery', 'church', 'viewpoint', 'parking',
  // Dutch (Texel)
  'eetcafe', 'natuur', 'strand', 'musea', 'actief', 'winkels'
];

export default function CategoryFilterField({ label, value, onChange, helperText, disabled, sx }) {
  const categories = Array.isArray(value) ? value : [];

  return (
    <Autocomplete
      multiple
      freeSolo
      options={DEFAULT_CATEGORIES}
      value={categories}
      onChange={(_, newVal) => onChange(newVal)}
      disabled={disabled}
      renderTags={(val, getTagProps) =>
        val.map((option, index) => (
          <Chip {...getTagProps({ index })} key={option} label={option} size="small" />
        ))
      }
      renderInput={(params) => (
        <TextField {...params} label={label || 'Categories'} size="small" helperText={helperText} placeholder="Type or select..." />
      )}
      sx={{ mb: 2, ...sx }}
    />
  );
}
