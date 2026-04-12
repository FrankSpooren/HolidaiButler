import { useState } from 'react';
import {
  Box, Typography, Button, Chip, ImageList, ImageListItem, ImageListItemBar,
  Checkbox, Alert, CircularProgress, Divider, Stack
} from '@mui/material';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArchiveIcon from '@mui/icons-material/Archive';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client.js';

const API_BASE = 'https://api.holidaibutler.com';

export default function MediaCleanupTab({ destId }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState('duplicates'); // 'duplicates' | 'unused'
  const [selected, setSelected] = useState(new Set());

  const { data: dupData, isLoading: dupLoading } = useQuery({
    queryKey: ['media-cleanup-duplicates', destId],
    queryFn: () => client.get('/media/cleanup/duplicates', { params: { destinationId: destId } }).then(r => r.data),
    enabled: mode === 'duplicates' && !!destId,
  });

  const { data: unusedData, isLoading: unusedLoading } = useQuery({
    queryKey: ['media-cleanup-unused', destId],
    queryFn: () => client.get('/media/cleanup/unused', { params: { destinationId: destId, months: 3 } }).then(r => r.data),
    enabled: mode === 'unused' && !!destId,
  });

  const archiveMut = useMutation({
    mutationFn: (ids) => client.post('/media/cleanup/archive', { media_ids: ids }, { params: { destinationId: destId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-cleanup-duplicates'] });
      queryClient.invalidateQueries({ queryKey: ['media-cleanup-unused'] });
      queryClient.invalidateQueries({ queryKey: ['media'] });
      setSelected(new Set());
    },
  });

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const dupGroups = dupData?.data?.groups || [];
  const unusedItems = unusedData?.data?.items || [];
  const unusedMb = unusedData?.data?.total_mb || 0;

  const getThumb = (item) => `${API_BASE}/media-files/${item.destination_id}/${item.filename}`;
  const formatSize = (bytes) => bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : '—';

  return (
    <Box>
      {/* Mode tabs */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <Button
          variant={mode === 'duplicates' ? 'contained' : 'outlined'}
          startIcon={<ContentCopyIcon />}
          onClick={() => { setMode('duplicates'); setSelected(new Set()); }}
          size="small"
        >
          {t('media.cleanup.duplicates', 'Duplicaten')}
          {dupGroups.length > 0 && <Chip label={dupGroups.length} size="small" sx={{ ml: 1 }} />}
        </Button>
        <Button
          variant={mode === 'unused' ? 'contained' : 'outlined'}
          startIcon={<DeleteSweepIcon />}
          onClick={() => { setMode('unused'); setSelected(new Set()); }}
          size="small"
        >
          {t('media.cleanup.unused', 'Ongebruikt')}
          {unusedItems.length > 0 && <Chip label={unusedItems.length} size="small" sx={{ ml: 1 }} />}
        </Button>
      </Box>

      {/* Archive button */}
      {selected.size > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}
          action={
            <Button color="warning" size="small" startIcon={<ArchiveIcon />}
              onClick={() => archiveMut.mutate([...selected])}
              disabled={archiveMut.isPending}
            >
              {t('media.cleanup.archiveSelected', `Archiveer ${selected.size} items`)}
            </Button>
          }
        >
          {selected.size} items geselecteerd voor archivering
        </Alert>
      )}

      {/* Duplicates view */}
      {mode === 'duplicates' && (
        dupLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : dupGroups.length === 0 ? (
          <Alert severity="success" icon={false}>
            {t('media.cleanup.noDuplicates', 'Geen duplicaten gevonden. Je mediabibliotheek is schoon!')}
          </Alert>
        ) : (
          <Stack spacing={3}>
            <Alert severity="info"
              action={
                <Button color="warning" variant="contained" size="small" startIcon={<ArchiveIcon />}
                  disabled={archiveMut.isPending}
                  onClick={() => {
                    const allDupIds = dupGroups.flatMap(g => g.items.slice(1).map(it => it.id));
                    if (allDupIds.length > 0 && window.confirm(`${allDupIds.length} duplicaten archiveren in alle ${dupGroups.length} groepen? Het oudste item per groep wordt bewaard.`)) {
                      archiveMut.mutate(allDupIds);
                    }
                  }}
                >
                  {t('media.cleanup.archiveAllDuplicates', `Alle duplicaten archiveren (${dupGroups.reduce((s, g) => s + g.items.length - 1, 0)})`)}
                </Button>
              }
            >
              {dupGroups.length} groepen met {dupGroups.reduce((s, g) => s + g.items.length, 0)} items — per groep wordt het oudste item bewaard.
            </Alert>
            {dupGroups.map((group, gi) => (
              <Box key={gi} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2">
                    {t('media.cleanup.group', 'Groep')} {gi + 1} — {group.count} vergelijkbare items
                  </Typography>
                  <Button size="small" color="warning" variant="outlined" startIcon={<ArchiveIcon />}
                    onClick={() => {
                      // Archive all except first (oldest = original)
                      const toArchive = group.items.slice(1).map(it => it.id);
                      if (toArchive.length > 0) archiveMut.mutate(toArchive);
                    }}
                    disabled={archiveMut.isPending}
                  >
                    {t('media.cleanup.keepFirst', 'Bewaar oudste, archiveer rest')}
                  </Button>
                </Box>
                <ImageList cols={Math.min(group.items.length, 4)} gap={8}>
                  {group.items.map((item, idx) => (
                    <ImageListItem key={item.id} sx={{ cursor: 'pointer', position: 'relative' }}
                      onClick={() => toggleSelect(item.id)}>
                      <img src={getThumb(item)} alt={item.original_name} loading="lazy"
                        style={{ height: 120, objectFit: 'cover', borderRadius: 4,
                          border: selected.has(item.id) ? '3px solid red' : idx === 0 ? '3px solid #4caf50' : 'none' }}
                        onError={e => { e.target.style.background = '#333'; }} />
                      {idx === 0 && (
                        <Chip label={t('media.cleanup.original', 'Origineel')} size="small" color="success"
                          sx={{ position: 'absolute', top: 4, left: 4, fontSize: '0.65rem' }} />
                      )}
                      <Checkbox
                        checked={selected.has(item.id)}
                        size="small"
                        sx={{ position: 'absolute', top: 0, right: 0, bgcolor: 'rgba(0,0,0,0.5)', borderRadius: '0 0 0 8px' }}
                      />
                      <ImageListItemBar
                        subtitle={`${item.original_name || item.filename} · ${formatSize(item.size_bytes)}`}
                        sx={{ '& .MuiImageListItemBar-subtitle': { fontSize: '0.65rem' } }}
                      />
                    </ImageListItem>
                  ))}
                </ImageList>
              </Box>
            ))}
          </Stack>
        )
      )}

      {/* Unused view */}
      {mode === 'unused' && (
        unusedLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : unusedItems.length === 0 ? (
          <Alert severity="success" icon={false}>
            {t('media.cleanup.noUnused', 'Alle media items worden actief gebruikt!')}
          </Alert>
        ) : (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              {unusedItems.length} items niet gebruikt in content (ouder dan 3 maanden) — {unusedMb} MB
            </Alert>
            <ImageList cols={4} gap={8}>
              {unusedItems.map(item => (
                <ImageListItem key={item.id} sx={{ cursor: 'pointer', position: 'relative' }}
                  onClick={() => toggleSelect(item.id)}>
                  <img src={getThumb(item)} alt={item.original_name} loading="lazy"
                    style={{ height: 120, objectFit: 'cover', borderRadius: 4, border: selected.has(item.id) ? '3px solid orange' : 'none' }}
                    onError={e => { e.target.style.background = '#333'; }} />
                  <Checkbox
                    checked={selected.has(item.id)}
                    size="small"
                    sx={{ position: 'absolute', top: 0, left: 0, bgcolor: 'rgba(0,0,0,0.5)', borderRadius: '0 0 8px 0' }}
                  />
                  <ImageListItemBar
                    subtitle={`${item.original_name || item.filename} · ${formatSize(item.size_bytes)}`}
                    sx={{ '& .MuiImageListItemBar-subtitle': { fontSize: '0.65rem' } }}
                  />
                </ImageListItem>
              ))}
            </ImageList>
          </Box>
        )
      )}
    </Box>
  );
}
