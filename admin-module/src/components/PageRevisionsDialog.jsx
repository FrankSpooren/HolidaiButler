import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemText,
  ListItemSecondaryAction, Typography, Box, Chip, Alert, CircularProgress
} from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import { useQuery } from '@tanstack/react-query';
import { pageService } from '../api/pageService.js';
import { useTranslation } from 'react-i18next';

export default function PageRevisionsDialog({ open, onClose, pageId, pageSlug, onRestored }) {
  const { t } = useTranslation();
  const [restoring, setRestoring] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['page-revisions', pageId],
    queryFn: () => pageService.revisions(pageId),
    enabled: open && !!pageId
  });

  const revisions = data?.data?.revisions || [];

  const handleRestore = async (revId) => {
    setRestoring(true);
    try {
      await pageService.restoreRevision(pageId, revId);
      onRestored?.();
      onClose();
    } catch {
      // error handled by parent
    } finally {
      setRestoring(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {t('pages.revisions.title', 'Revisie Geschiedenis')} — /{pageSlug}
      </DialogTitle>
      <DialogContent>
        {isLoading && (
          <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={32} /></Box>
        )}

        {error && (
          <Alert severity="error">{t('common.error')}</Alert>
        )}

        {!isLoading && revisions.length === 0 && (
          <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
            {t('pages.revisions.empty', 'Nog geen revisies. Revisies worden automatisch aangemaakt bij het opslaan.')}
          </Typography>
        )}

        {revisions.length > 0 && (
          <List dense>
            {revisions.map((rev, i) => (
              <ListItem
                key={rev.id}
                sx={{
                  bgcolor: i === 0 ? 'action.selected' : 'transparent',
                  borderRadius: 1, mb: 0.5
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {formatDate(rev.created_at)}
                      </Typography>
                      {i === 0 && <Chip label={t('pages.revisions.latest', 'Laatst')} size="small" color="primary" sx={{ height: 18, fontSize: '0.65rem' }} />}
                    </Box>
                  }
                  secondary={
                    <Box>
                      {rev.change_summary && (
                        <Typography variant="caption" color="text.secondary">{rev.change_summary}</Typography>
                      )}
                      {rev.title_nl && (
                        <Typography variant="caption" color="text.secondary" display="block">{t('pages.revisions.titlePrefix', 'Titel')}: {rev.title_nl}</Typography>
                      )}
                      {rev.block_count !== undefined && (
                        <Typography variant="caption" color="text.secondary"> · {rev.block_count} {t('pages.revisions.blocks', 'blocks')}</Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Button
                    size="small"
                    startIcon={<RestoreIcon />}
                    onClick={() => handleRestore(rev.id)}
                    disabled={restoring || i === 0}
                    variant={i === 0 ? 'text' : 'outlined'}
                  >
                    {t('pages.revisions.restore', 'Herstellen')}
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close', 'Sluiten')}</Button>
      </DialogActions>
    </Dialog>
  );
}
