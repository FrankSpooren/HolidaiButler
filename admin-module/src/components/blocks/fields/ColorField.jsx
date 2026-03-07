import { Box, TextField } from '@mui/material';

export default function ColorField({ label, value, onChange, sx }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, ...sx }}>
      <Box
        sx={{
          width: 36, height: 36, borderRadius: 1, border: '1px solid #ccc',
          bgcolor: value || '#ffffff', cursor: 'pointer', flexShrink: 0
        }}
        component="label"
      >
        <input
          type="color"
          value={value || '#ffffff'}
          onChange={e => onChange(e.target.value)}
          style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
        />
      </Box>
      <TextField
        size="small"
        label={label}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        sx={{ flex: 1 }}
        placeholder="#000000"
      />
    </Box>
  );
}
