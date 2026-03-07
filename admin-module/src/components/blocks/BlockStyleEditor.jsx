import { Box, Typography, TextField, Grid, FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel } from '@mui/material';

const PADDING_OPTIONS = ['0', '16px', '24px', '32px', '48px', '64px', '80px', '96px'];

/**
 * BlockStyleEditor — Shared component added below every block editor.
 * Manages: backgroundColor, backgroundImage, borderColor, paddingY, fullWidth
 * Block JSON: { type, props, style: { ... } }
 */
export default function BlockStyleEditor({ style = {}, onChange }) {
  const update = (key, val) => {
    onChange({ ...style, [key]: val });
  };

  return (
    <Box sx={{ mt: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 1, border: '1px solid #e2e8f0' }}>
      <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary', mb: 1.5, display: 'block' }}>
        Block Style
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{ width: 28, height: 28, borderRadius: 0.5, border: '1px solid #ccc', bgcolor: style.backgroundColor || '#ffffff', cursor: 'pointer', flexShrink: 0 }}
              component="label"
            >
              <input
                type="color"
                value={style.backgroundColor || '#ffffff'}
                onChange={e => update('backgroundColor', e.target.value)}
                style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
              />
            </Box>
            <TextField
              size="small" fullWidth label="BG Color"
              value={style.backgroundColor || ''}
              onChange={e => update('backgroundColor', e.target.value)}
              placeholder="transparent"
            />
          </Box>
        </Grid>
        <Grid item xs={6} sm={3}>
          <TextField
            size="small" fullWidth label="BG Image URL"
            value={style.backgroundImage || ''}
            onChange={e => update('backgroundImage', e.target.value)}
            placeholder="/media-files/..."
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{ width: 28, height: 28, borderRadius: 0.5, border: '1px solid #ccc', bgcolor: style.borderColor || 'transparent', cursor: 'pointer', flexShrink: 0 }}
              component="label"
            >
              <input
                type="color"
                value={style.borderColor || '#e2e8f0'}
                onChange={e => update('borderColor', e.target.value)}
                style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
              />
            </Box>
            <TextField
              size="small" fullWidth label="Border Color"
              value={style.borderColor || ''}
              onChange={e => update('borderColor', e.target.value)}
              placeholder="none"
            />
          </Box>
        </Grid>
        <Grid item xs={6} sm={3}>
          <FormControl size="small" fullWidth>
            <InputLabel>Vertical Padding</InputLabel>
            <Select
              value={style.paddingY || '32px'}
              label="Vertical Padding"
              onChange={e => update('paddingY', e.target.value)}
            >
              {PADDING_OPTIONS.map(p => <MenuItem key={p} value={p}>{p === '0' ? 'None' : p}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={<Switch checked={style.fullWidth || false} onChange={e => update('fullWidth', e.target.checked)} size="small" />}
            label="Full-width (edge-to-edge)"
          />
        </Grid>
      </Grid>
    </Box>
  );
}
