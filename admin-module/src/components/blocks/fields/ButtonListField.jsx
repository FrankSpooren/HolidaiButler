import { Box, TextField, IconButton, Button, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

const VARIANT_OPTIONS = [
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'outline', label: 'Outline' }
];

export default function ButtonListField({ label, value, onChange, disabled, sx }) {
  const buttons = Array.isArray(value) ? value : [];

  const updateButton = (idx, field, val) => {
    const updated = buttons.map((b, i) => i === idx ? { ...b, [field]: val } : b);
    onChange(updated);
  };

  const addButton = () => {
    onChange([...buttons, { label: '', href: '', variant: 'primary' }]);
  };

  const removeButton = (idx) => {
    onChange(buttons.filter((_, i) => i !== idx));
  };

  return (
    <Box sx={{ mb: 2, ...sx }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.secondary' }}>{label || 'Buttons'}</Box>
        <Button size="small" startIcon={<AddIcon />} onClick={addButton} disabled={disabled}>Add</Button>
      </Box>
      {buttons.map((btn, idx) => (
        <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'flex-start' }}>
          <TextField size="small" label="Label" value={btn.label || ''} onChange={e => updateButton(idx, 'label', e.target.value)} disabled={disabled} sx={{ flex: 1 }} />
          <TextField size="small" label="URL" value={btn.href || ''} onChange={e => updateButton(idx, 'href', e.target.value)} disabled={disabled} sx={{ flex: 1.5 }} />
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Style</InputLabel>
            <Select value={btn.variant || 'primary'} label="Style" onChange={e => updateButton(idx, 'variant', e.target.value)} disabled={disabled}>
              {VARIANT_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>
          <IconButton size="small" onClick={() => removeButton(idx)} disabled={disabled}><DeleteIcon fontSize="small" /></IconButton>
        </Box>
      ))}
    </Box>
  );
}
