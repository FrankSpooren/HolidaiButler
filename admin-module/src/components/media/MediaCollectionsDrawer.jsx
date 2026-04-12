import { useState } from 'react';
import {
  Drawer, Box, Typography, Button, List, ListItemButton, ListItemText,
  ListItemIcon, TextField, Snackbar, Alert, Chip, Divider
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client.js';

export default function MediaCollectionsDrawer({ open, onClose, selectedIds, destId, onOpenDetail }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const { data } = useQuery({
    queryKey: ['media-collections', destId],
    queryFn: () => client.get('/media-collections', { params: { destinationId: destId } }).then(r => r.data),
    enabled: open && !!destId,
  });
  const collections = data?.data || [];

  const createMut = useMutation({
    mutationFn: () => client.post('/media-collections', { name: newName, description: newDesc || undefined }, {
      headers: { 'X-Destination-ID': destId }
    }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['media-collections'] });
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      // If items selected, add them immediately
      const collId = res.data?.data?.id;
      if (collId && selectedIds.length > 0) addToCollection(collId);
      else setSnack({ open: true, message: 'Collectie aangemaakt', severity: 'success' });
    }
  });

  const addItemsMut = useMutation({
    mutationFn: (collId) => client.post(`/media-collections/${collId}/items`, { media_ids: selectedIds }, {
      headers: { 'X-Destination-ID': destId }
    }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['media-collections'] });
      const added = res.data?.data?.added || 0;
      setSnack({ open: true, message: `${added} item${added !== 1 ? 's' : ''} toegevoegd`, severity: 'success' });
    }
  });

  const addToCollection = (collId) => {
    if (selectedIds.length === 0) {
      onOpenDetail?.(collId);
      return;
    }
    addItemsMut.mutate(collId);
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 360, bgcolor: 'background.paper' } }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={700}>
          {t('media.collections.title', 'Collecties')}
          {selectedIds.length > 0 && (
            <Chip size="small" label={`${selectedIds.length} items`} color="primary" sx={{ ml: 1 }} />
          )}
        </Typography>
        <Button size="small" startIcon={<CloseIcon />} onClick={onClose}>{t('common.close', 'Sluiten')}</Button>
      </Box>

      <Divider />

      {/* Collections list */}
      <List sx={{ flex: 1, overflow: 'auto' }}>
        {collections.map(coll => (
          <ListItemButton key={coll.id} onClick={() => addToCollection(coll.id)}
            sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <FolderIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary={coll.name}
              secondary={`${coll.item_count || 0} items`}
              primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }}
              secondaryTypographyProps={{ fontSize: '0.75rem' }}
            />
          </ListItemButton>
        ))}
        {collections.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <FolderIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary" variant="body2">
              {t('media.collections.empty', 'Nog geen collecties')}
            </Typography>
          </Box>
        )}
      </List>

      <Divider />

      {/* Create new collection */}
      <Box sx={{ p: 2 }}>
        {showCreate ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField
              size="small" fullWidth autoFocus
              label={t('media.collections.name', 'Naam')}
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <TextField
              size="small" fullWidth multiline rows={2}
              label={t('media.collections.description', 'Beschrijving')}
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" size="small" fullWidth
                onClick={() => createMut.mutate()}
                disabled={!newName.trim() || createMut.isPending}>
                {t('media.collections.create', 'Aanmaken')}
              </Button>
              <Button size="small" onClick={() => setShowCreate(false)}>
                {t('common.cancel', 'Annuleren')}
              </Button>
            </Box>
          </Box>
        ) : (
          <Button fullWidth variant="outlined" startIcon={<AddIcon />} onClick={() => setShowCreate(true)}>
            {t('media.collections.new', '+ Nieuwe collectie')}
          </Button>
        )}
      </Box>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Drawer>
  );
}
