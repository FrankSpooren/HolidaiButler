import { TextField as MuiTextField } from '@mui/material';

export default function TextField({ label, value, onChange, helperText, required, disabled, multiline, rows, placeholder, fullWidth = true, size = 'small', sx }) {
  return (
    <MuiTextField
      label={label}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      helperText={helperText}
      required={required}
      disabled={disabled}
      multiline={multiline}
      rows={rows}
      placeholder={placeholder}
      fullWidth={fullWidth}
      size={size}
      sx={{ mb: 2, ...sx }}
    />
  );
}
