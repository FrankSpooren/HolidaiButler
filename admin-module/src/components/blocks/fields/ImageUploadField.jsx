import { useState } from 'react';
import { Box, TextField, Button, CircularProgress } from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import client from '../../../api/client.js';

export default function ImageUploadField({ label, value, onChange, helperText, disabled, sx }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return;
    const formData = new FormData();
    formData.append('image', file);
    setUploading(true);
    try {
      const { data } = await client.post('/blocks/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onChange(data.data?.url || data.url || value);
    } catch {
      // silently fail — user can still enter URL manually
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ mb: 2, ...sx }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          size="small"
          label={label}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          helperText={helperText || 'URL or upload an image'}
          disabled={disabled}
          fullWidth
        />
        <Button
          variant="outlined"
          component="label"
          disabled={disabled || uploading}
          sx={{ minWidth: 44, height: 40, p: 0 }}
        >
          {uploading ? <CircularProgress size={20} /> : <UploadIcon />}
          <input type="file" hidden accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleUpload} />
        </Button>
      </Box>
      {value && (
        <Box sx={{ mt: 1, maxWidth: 200 }}>
          <img src={value} alt="Preview" style={{ maxWidth: '100%', maxHeight: 100, borderRadius: 4, objectFit: 'cover' }} />
        </Box>
      )}
    </Box>
  );
}
