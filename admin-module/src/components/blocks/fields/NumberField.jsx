import { TextField } from '@mui/material';

export default function NumberField({ label, value, onChange, helperText, required, disabled, min, max, step = 1, fullWidth = true, size = 'small', sx }) {
  return (
    <TextField
      type="number"
      label={label}
      value={value ?? ''}
      onChange={e => {
        const v = e.target.value === '' ? undefined : Number(e.target.value);
        onChange(v);
      }}
      helperText={helperText}
      required={required}
      disabled={disabled}
      inputProps={{ min, max, step }}
      fullWidth={fullWidth}
      size={size}
      sx={{ mb: 2, ...sx }}
    />
  );
}
