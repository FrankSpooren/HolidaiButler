import { useState } from 'react';
import {
  Box, Typography, Card, Grid, Button, TextField, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, Snackbar, Skeleton, IconButton,
  FormControl, InputLabel, Select, MenuItem, Tooltip, ImageList, ImageListItem,
  ImageListItemBar
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client.js';
import { useBrandingDestinations } from '../hooks/useBrandingEditor.js';

const CATEGORIES = ['all', 'branding', 'pages', 'pois', 'video', 'documents', 'other'];

export default function MediaPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: destData } = useBrandingDestinations();
  const destinations = destData?.data?.destinations?.filter(d => d.isActive) || [];
  const [destFilter, setDestFilter] = useState('');
  const destId = destFilter || (destinations[0]?.id) || '';
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [detailOpen, setDetailOpen] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['media', destId, category, search],
    queryFn: () => client.get('/media', { params: { destinationId: destId, category: category !== 'all' ? category : undefined, search: search || undefined, limit: 100 } }).then(r => r.data),
    enabled: !!destId
  });

  const files = data?.data?.files || [];

  const uploadMut = useMutation({
    mutationFn: async (formData) => {
      const res = await client.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      setSnack({ open: true, message: 'Files uploaded', severity: 'success' });
    },
    onError: (err) => {
      setSnack({ open: true, message: err.response?.data?.error?.message || err.message, severity: 'error' });
    }
  });

  const deleteMut = useMutation({
    mutationFn: (id) => client.delete(`/media/${id}`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      setDetailOpen(null);
      setSnack({ open: true, message: 'File deleted', severity: 'success' });
    }
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data: updateData }) => client.put(`/media/${id}`, updateData).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      setSnack({ open: true, message: 'Updated', severity: 'success' });
    }
  });

  const handleUpload = (e) => {
    const uploadFiles = e.target.files;
    if (!uploadFiles?.length) return;
    const formData = new FormData();
    formData.append('destination_id', destId);
    formData.append('category', category !== 'all' ? category : 'other');
    for (const file of uploadFiles) {
      formData.append('files', file);
    }
    uploadMut.mutate(formData);
    e.target.value = '';
  };

  const apiUrl = import.meta.env.VITE_API_URL || '';
  const getUrl = (file) => `${apiUrl}${file.url}`;
  const isImage = (file) => file.mime_type?.startsWith('image/');

  if (isLoading) {
    return <Box sx={{ p: 3 }}><Skeleton variant="rounded" height={400} /></Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Media Library</Typography>
          <Typography variant="body2" color="text.secondary">{files.length} files</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Destination</InputLabel>
            <Select value={destFilter} label="Destination" onChange={e => setDestFilter(e.target.value)}>
              {destinations.map(d => <MenuItem key={d.id} value={d.id}>{d.displayName}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Category</InputLabel>
            <Select value={category} label="Category" onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} sx={{ width: 160 }} />
          <Button variant="contained" startIcon={<UploadIcon />} component="label" disabled={uploadMut.isPending}>
            {uploadMut.isPending ? 'Uploading...' : 'Upload'}
            <input type="file" hidden multiple accept="image/*,video/*,.pdf,.gpx" onChange={handleUpload} />
          </Button>
        </Box>
      </Box>

      {files.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No media files yet. Upload your first file.</Typography>
        </Card>
      ) : (
        <ImageList cols={6} gap={8} sx={{ m: 0 }}>
          {files.map(file => (
            <ImageListItem key={file.id} sx={{ cursor: 'pointer', borderRadius: 1, overflow: 'hidden', border: '1px solid #e2e8f0' }} onClick={() => setDetailOpen(file)}>
              {isImage(file) ? (
                <img src={getUrl(file)} alt={file.alt_text || file.original_name} loading="lazy" style={{ height: 150, objectFit: 'cover' }} />
              ) : (
                <Box sx={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f1f5f9' }}>
                  <Typography variant="h6" color="text.secondary">{file.mime_type?.split('/')[1]?.toUpperCase() || 'FILE'}</Typography>
                </Box>
              )}
              <ImageListItemBar
                title={file.original_name}
                subtitle={<Chip size="small" label={file.category} sx={{ height: 18, fontSize: '0.65rem' }} />}
                sx={{ '& .MuiImageListItemBar-title': { fontSize: '0.7rem' } }}
              />
            </ImageListItem>
          ))}
        </ImageList>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detailOpen} onClose={() => setDetailOpen(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Media Detail</DialogTitle>
        {detailOpen && (
          <DialogContent>
            {isImage(detailOpen) && (
              <Box component="img" src={getUrl(detailOpen)} alt={detailOpen.alt_text} sx={{ width: '100%', maxHeight: 300, objectFit: 'contain', mb: 2, borderRadius: 1, bgcolor: '#f8fafc' }} />
            )}
            <Typography variant="body2"><strong>Filename:</strong> {detailOpen.original_name}</Typography>
            <Typography variant="body2"><strong>Type:</strong> {detailOpen.mime_type}</Typography>
            <Typography variant="body2"><strong>Size:</strong> {Math.round(detailOpen.size_bytes / 1024)} KB</Typography>
            {detailOpen.width && <Typography variant="body2"><strong>Dimensions:</strong> {detailOpen.width}x{detailOpen.height}</Typography>}
            <Typography variant="body2" sx={{ mt: 1 }}><strong>URL:</strong></Typography>
            <TextField size="small" fullWidth value={detailOpen.url} sx={{ mt: 0.5, mb: 2 }} InputProps={{ readOnly: true }}
              onClick={e => { e.target.select(); navigator.clipboard?.writeText(detailOpen.url); setSnack({ open: true, message: 'URL copied', severity: 'info' }); }}
            />
            <TextField
              size="small" fullWidth label="Alt Text" sx={{ mb: 1 }}
              value={detailOpen.alt_text || ''}
              onChange={e => setDetailOpen(prev => ({ ...prev, alt_text: e.target.value }))}
              onBlur={() => updateMut.mutate({ id: detailOpen.id, data: { alt_text: detailOpen.alt_text } })}
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={detailOpen.category || 'other'}
                label="Category"
                onChange={e => {
                  setDetailOpen(prev => ({ ...prev, category: e.target.value }));
                  updateMut.mutate({ id: detailOpen.id, data: { category: e.target.value } });
                }}
              >
                {CATEGORIES.filter(c => c !== 'all').map(c => <MenuItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</MenuItem>)}
              </Select>
            </FormControl>
          </DialogContent>
        )}
        <DialogActions>
          <Button color="error" startIcon={<DeleteIcon />} onClick={() => deleteMut.mutate(detailOpen?.id)} disabled={deleteMut.isPending}>
            {t('common.delete', 'Delete')}
          </Button>
          <Button onClick={() => setDetailOpen(null)}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
