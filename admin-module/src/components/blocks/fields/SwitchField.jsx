import { FormControlLabel, Switch } from '@mui/material';

export default function SwitchField({ label, value, onChange, disabled, sx }) {
  return (
    <FormControlLabel
      control={<Switch checked={!!value} onChange={e => onChange(e.target.checked)} disabled={disabled} />}
      label={label}
      sx={{ mb: 1, ...sx }}
    />
  );
}
