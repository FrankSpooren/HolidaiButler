import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Button,
  ImageList, ImageListItem, ImageListItemBar, IconButton, TextField, Chip,
  Snackbar, Alert
} from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloseIcon from '@mui/icons-material/Close';
import LockIcon from '@mui/icons-material/Lock';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client.js';

export default function MediaCollectionDetailDialog({ open, collectionId, destId, onClose, apiBase }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharePassword, setSharePassword] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const { data, isLoading } = useQuery({
    queryKey: ['media-collection-detail', collectionId],
    queryFn: () => client.get(`/media-collections/${collectionId}`, { params: { destinationId: destId } }).then(r => r.data?.data),
    enabled: open && !!collectionId,
  });

  const shareMut = useMutation({
    mutationFn: () => client.post(`/media-collections/${collectionId}/share`,
      sharePassword ? { password: sharePassword } : {},
      { headers: { 'X-Destination-ID': destId } }
    ),
    onSuccess: (res) => {
      const url = res.data?.data?.share_url || '';
      setShareUrl(url);
      setSnack({ open: true, message: 'Share link aangemaakt', severity: 'success' });
    }
  });

  const removeItemMut = useMutation({
    mutationFn: (mediaId) => client.delete(`/media-collections/${collectionId}/items`, {
      data: { media_ids: [mediaId] },
      headers: { 'X-Destination-ID': destId }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-collection-detail', collectionId] });
    }
  });

  const deleteMut = useMutation({
    mutationFn: () => client.delete(`/media-collections/${collectionId}`, {
      headers: { 'X-Destination-ID': destId }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-collections'] });
      onClose();
    }
  });

  const collection = data;
  const items = collection?.items || [];

  const getThumbUrl = (item) => {
    const base = apiBase || '';
    return item.thumbnail || `${base}/media-files/${item.destination_id}/${item.filename}`;
  };

  const copyShareUrl = () => {
    navigator.clipboard?.writeText(shareUrl);
    setSnack({ open: true, message: 'Link gekopieerd', severity: 'info' });
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>{collection?.name || 'Collectie'}</Typography>
            {collection?.description && (
              <Typography variant="body2" color="text.secondary">{collection.description}</Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Chip label={`${items.length} items`} size="small" />
            <IconButton onClick={onClose}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {items.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography color="text.secondary">{t('media.collections.noItems', 'Geen items in deze collectie')}</Typography>
            </Box>
          ) : (
            <ImageList cols={4} gap={8} sx={{ mt: 0 }}>
              {items.map(item => (
                <ImageListItem key={item.id} sx={{ borderRadius: 1, overflow: 'hidden', cursor: 'pointer' }}>
                  <img
                    src={getThumbUrl(item)}
                    alt={item.alt_text || item.filename}
                    loading="lazy"
                    style={{ height: 160, objectFit: 'cover' }}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  <ImageListItemBar
                    title={item.original_name || item.filename}
                    actionIcon={
                      <IconButton size="small" sx={{ color: 'white' }}
                        onClick={(e) => { e.stopPropagation(); removeItemMut.mutate(item.id); }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    }
                    sx={{ '& .MuiImageListItemBar-title': { fontSize: '0.75rem' } }}
                  />
                </ImageListItem>
              ))}
            </ImageList>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
          <Button color="error" startIcon={<DeleteIcon />} onClick={() => deleteMut.mutate()} disabled={deleteMut.isPending}>
            {t('media.collections.delete', 'Collectie verwijderen')}
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button startIcon={<ShareIcon />} onClick={() => setShareDialogOpen(true)}>
              {t('media.collections.share', 'Delen')}
            </Button>
            <Button onClick={onClose}>{t('common.close', 'Sluiten')}</Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('media.collections.shareTitle', 'Collectie delen')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('media.collections.shareDesc', 'Genereer een publieke link naar deze collectie. Optioneel met wachtwoord.')}
          </Typography>
          <TextField
            size="small" fullWidth sx={{ mb: 2 }}
            label={t('media.collections.password', 'Wachtwoord (optioneel)')}
            type="password"
            value={sharePassword}
            onChange={e => setSharePassword(e.target.value)}
            InputProps={{ startAdornment: <LockIcon fontSize="small" sx={{ mr: 1, color: 'text.disabled' }} /> }}
          />
          {shareUrl && (
            <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField size="small" fullWidth value={shareUrl} InputProps={{ readOnly: true }} />
              <IconButton onClick={copyShareUrl}><ContentCopyIcon fontSize="small" /></IconButton>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>{t('common.close', 'Sluiten')}</Button>
          <Button variant="contained" startIcon={<ShareIcon />} onClick={() => shareMut.mutate()} disabled={shareMut.isPending}>
            {t('media.collections.generateLink', 'Link genereren')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </>
  );
}
