import { useState } from 'react';
import {
  Box, Button, Chip, Typography, Dialog, DialogTitle, DialogContent,
  DialogActions, Autocomplete, TextField, Snackbar, Alert
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import LabelIcon from '@mui/icons-material/Label';
import FolderIcon from '@mui/icons-material/Folder';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearIcon from '@mui/icons-material/Clear';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client.js';

export default function MediaBulkActionsBar({ selectedIds, destId, onClear, onCollectionClick }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const count = selectedIds.length;
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [bulkTags, setBulkTags] = useState([]);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const bulkTagMut = useMutation({
    mutationFn: () => client.post('/media/bulk/tag', { media_ids: selectedIds, tags: bulkTags }, { params: { destinationId: destId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      setTagDialogOpen(false);
      setBulkTags([]);
      setSnack({ open: true, message: `Tags toegepast op ${count} items`, severity: 'success' });
    }
  });

  const bulkDeleteMut = useMutation({
    mutationFn: () => client.post('/media/bulk/delete', { media_ids: selectedIds }, { params: { destinationId: destId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      onClear();
      setSnack({ open: true, message: `${count} items gearchiveerd`, severity: 'success' });
    }
  });

  const bulkDownloadMut = useMutation({
    mutationFn: () => client.post('/media/bulk/download', { media_ids: selectedIds }, { params: { destinationId: destId } }),
    onSuccess: (res) => {
      const files = res.data?.data?.files || [];
      setSnack({ open: true, message: `${files.length} bestanden beschikbaar`, severity: 'info' });
    }
  });

  if (count === 0) return null;

  return (
    <>
      <Box sx={{
        position: 'sticky', top: 64, zIndex: 10,
        bgcolor: 'primary.main', color: 'primary.contrastText',
        px: 2, py: 1, borderRadius: 1, mb: 2,
        display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
        animation: 'slideDown 0.25s ease',
        '@keyframes slideDown': { from: { transform: 'translateY(-100%)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } }
      }}>
        <Chip label={`${count} geselecteerd`} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit', fontWeight: 700 }} />

        <Button size="small" startIcon={<DownloadIcon />} sx={{ color: 'inherit' }}
          onClick={() => bulkDownloadMut.mutate()} disabled={bulkDownloadMut.isPending}>
          {t('media.bulk.download', 'Download')}
        </Button>

        <Button size="small" startIcon={<LabelIcon />} sx={{ color: 'inherit' }}
          onClick={() => setTagDialogOpen(true)}>
          {t('media.bulk.tag', 'Tags')}
        </Button>

        <Button size="small" startIcon={<FolderIcon />} sx={{ color: 'inherit' }}
          onClick={onCollectionClick}>
          {t('media.bulk.collection', 'Collectie')}
        </Button>

        <Button size="small" startIcon={<DeleteIcon />} sx={{ color: 'inherit' }}
          onClick={() => bulkDeleteMut.mutate()} disabled={bulkDeleteMut.isPending}>
          {t('media.bulk.delete', 'Verwijderen')}
        </Button>

        <Box sx={{ flex: 1 }} />

        <Button size="small" startIcon={<ClearIcon />} sx={{ color: 'inherit' }} onClick={onClear}>
          {t('media.bulk.clear', 'Wis selectie')}
        </Button>
      </Box>

      {/* Bulk Tag Dialog */}
      <Dialog open={tagDialogOpen} onClose={() => setTagDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('media.bulk.tagTitle', 'Tags toewijzen aan selectie')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {count} items geselecteerd
          </Typography>
          <Autocomplete
            multiple freeSolo options={[]}
            value={bulkTags}
            onChange={(_, v) => setBulkTags(v)}
            renderInput={(params) => <TextField {...params} label="Tags" placeholder="Voeg tags toe..." autoFocus />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTagDialogOpen(false)}>{t('common.cancel', 'Annuleren')}</Button>
          <Button variant="contained" onClick={() => bulkTagMut.mutate()} disabled={bulkTags.length === 0 || bulkTagMut.isPending}>
            {t('media.bulk.applyTags', 'Tags toepassen')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </>
  );
}
