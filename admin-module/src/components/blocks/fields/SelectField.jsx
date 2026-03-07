import { FormControl, InputLabel, Select, MenuItem, FormHelperText } from '@mui/material';

export default function SelectField({ label, value, onChange, options = [], helperText, required, disabled, fullWidth = true, size = 'small', sx }) {
  const id = `select-${label?.replace(/\s/g, '-')?.toLowerCase() || 'field'}`;
  return (
    <FormControl fullWidth={fullWidth} size={size} sx={{ mb: 2, ...sx }} required={required} disabled={disabled}>
      <InputLabel id={`${id}-label`}>{label}</InputLabel>
      <Select
        labelId={`${id}-label`}
        value={value ?? ''}
        label={label}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(opt => {
          const v = typeof opt === 'object' ? opt.value : opt;
          const l = typeof opt === 'object' ? opt.label : opt;
          return <MenuItem key={v} value={v}>{l}</MenuItem>;
        })}
      </Select>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
}
