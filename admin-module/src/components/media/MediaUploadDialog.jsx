import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Button,
  LinearProgress, Chip, IconButton, Alert, Snackbar, Autocomplete, TextField,
  FormControl, Select, MenuItem, Collapse
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import client from '../../api/client.js';

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;  // 20MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB
const MAX_OTHER_SIZE = 50 * 1024 * 1024;  // 50MB
const ACCEPT = 'image/*,video/mp4,video/quicktime,video/webm,.gpx,application/pdf,audio/*';

function formatSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getMaxSize(file) {
  if (file.type?.startsWith('video/')) return MAX_VIDEO_SIZE;
  if (file.type?.startsWith('image/')) return MAX_IMAGE_SIZE;
  return MAX_OTHER_SIZE;
}

function getTypeIcon(file) {
  if (file.type?.startsWith('image/')) return '🖼️';
  if (file.type?.startsWith('video/')) return '🎬';
  if (file.type?.startsWith('audio/')) return '🎵';
  if (file.type === 'application/pdf') return '📄';
  if (file.name?.endsWith('.gpx')) return '🗺️';
  return '📎';
}

export default function MediaUploadDialog({ open, onClose, destId, onComplete }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [uploads, setUploads] = useState([]); // { file, status, progress, mediaId, error, metaOpen, tags, category }
  const [dragOver, setDragOver] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null); // { uploadIdx, existing }

  // Reset state when dialog opens
  useEffect(() => {
    if (open) setUploads([]);
  }, [open]);

  const addFiles = useCallback((fileList) => {
    const newUploads = Array.from(fileList).map(file => {
      const maxSize = getMaxSize(file);
      const tooLarge = file.size > maxSize;
      return {
        file,
        status: tooLarge ? 'error' : 'pending',
        progress: 0,
        mediaId: null,
        error: tooLarge ? `Te groot (max ${formatSize(maxSize)})` : null,
        metaOpen: false,
        tags: [],
        category: 'other'
      };
    });
    setUploads(prev => [...prev, ...newUploads]);
  }, []);

  // Drag & drop handlers
  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); };

  // Upload a single file
  const uploadFile = async (idx) => {
    const item = uploads[idx];
    if (!item || item.status !== 'pending') return;

    setUploads(prev => prev.map((u, i) => i === idx ? { ...u, status: 'uploading', progress: 0 } : u));

    try {
      const formData = new FormData();
      formData.append('files', item.file);
      formData.append('category', item.category || 'other');
      formData.append('destination_id', destId);

      const res = await client.post(`/media/upload?destinationId=${destId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000, // 5 min per file upload
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded / (e.total || 1)) * 100);
          setUploads(prev => prev.map((u, i) => i === idx ? { ...u, progress: pct } : u));
        }
      });

      const mediaItem = res.data?.data?.files?.[0];
      const mediaId = mediaItem?.id;

      setUploads(prev => prev.map((u, i) => i === idx ? { ...u, status: 'processing', progress: 100, mediaId } : u));

      // Poll for AI processing completion
      if (mediaId) pollProcessing(idx, mediaId);

    } catch (err) {
      setUploads(prev => prev.map((u, i) => i === idx ? { ...u, status: 'error', error: err.response?.data?.error?.message || err.message } : u));
    }
  };

  // Poll AI processing status
  const pollProcessing = (idx, mediaId) => {
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      try {
        const res = await client.get(`/media/${mediaId}`, { params: { destinationId: destId } });
        const item = res.data?.data;
        if (item?.ai_processed === 1) {
          clearInterval(poll);
          setUploads(prev => prev.map((u, i) => i === idx ? { ...u, status: 'done' } : u));
          // Check for duplicates
          checkDuplicate(idx, mediaId);
        } else if (item?.ai_processed === -1) {
          clearInterval(poll);
          setUploads(prev => prev.map((u, i) => i === idx ? { ...u, status: 'done' } : u)); // Done but AI failed
        }
      } catch { /* ignore poll errors */ }
      if (attempts > 30) { // 90s max
        clearInterval(poll);
        setUploads(prev => prev.map((u, i) => i === idx ? { ...u, status: 'done' } : u));
      }
    }, 3000);
  };

  // Check for duplicates via pHash
  const checkDuplicate = async (idx, mediaId) => {
    try {
      const res = await client.post(`/media/${mediaId}/duplicate-check`, {}, { params: { destinationId: destId } });
      const dupes = res.data?.data?.duplicates || [];
      if (dupes.length > 0) {
        setDuplicateWarning({ uploadIdx: idx, mediaId, existing: dupes[0] });
      }
    } catch { /* non-critical */ }
  };

  // Start all pending uploads
  const startAll = () => {
    uploads.forEach((u, i) => {
      if (u.status === 'pending') uploadFile(i);
    });
  };

  // Retry failed upload
  const retryUpload = (idx) => {
    setUploads(prev => prev.map((u, i) => i === idx ? { ...u, status: 'pending', error: null, progress: 0 } : u));
    setTimeout(() => uploadFile(idx), 100);
  };

  const removeUpload = (idx) => {
    setUploads(prev => prev.filter((_, i) => i !== idx));
  };

  const pendingCount = uploads.filter(u => u.status === 'pending').length;
  const doneCount = uploads.filter(u => u.status === 'done').length;
  const errorCount = uploads.filter(u => u.status === 'error').length;

  const handleClose = () => {
    if (doneCount > 0) {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      onComplete?.();
    }
    onClose();
  };

  const statusIcon = (status) => {
    switch (status) {
      case 'uploading': return <AutorenewIcon fontSize="small" color="info" sx={{ animation: 'spin 1s linear infinite', '@keyframes spin': { from: { transform: 'rotate(0)' }, to: { transform: 'rotate(360deg)' } } }} />;
      case 'processing': return <AutorenewIcon fontSize="small" color="warning" sx={{ animation: 'spin 1s linear infinite', '@keyframes spin': { from: { transform: 'rotate(0)' }, to: { transform: 'rotate(360deg)' } } }} />;
      case 'done': return <CheckCircleIcon fontSize="small" color="success" />;
      case 'error': return <ErrorIcon fontSize="small" color="error" />;
      default: return <InsertDriveFileIcon fontSize="small" color="action" />;
    }
  };

  const statusLabel = (status) => {
    switch (status) {
      case 'pending': return t('media.upload.pending', 'Wachtend');
      case 'uploading': return t('media.upload.uploading', 'Uploading...');
      case 'processing': return t('media.upload.processing', '🔄 AI Tagging...');
      case 'done': return t('media.upload.done', '✅ Verwerkt');
      case 'error': return t('media.upload.error', '❌ Fout');
      default: return '';
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {t('media.upload.title', 'Media uploaden')}
        <IconButton onClick={handleClose}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent>
        {/* Drop zone */}
        <Box
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          sx={{
            height: 160, border: '2px dashed', borderColor: dragOver ? 'primary.main' : 'divider',
            borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', mb: 2,
            bgcolor: dragOver ? 'action.hover' : 'transparent',
            transition: 'all 0.2s',
            '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' }
          }}
        >
          <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography color="text.secondary">{t('media.upload.dropzone', 'Sleep bestanden hierheen of klik om te selecteren')}</Typography>
          <Typography variant="caption" color="text.disabled">
            {t('media.upload.formats', 'Afbeeldingen (20MB), video (200MB), PDF, GPX, audio')}
          </Typography>
        </Box>
        <input ref={fileInputRef} type="file" multiple accept={ACCEPT} hidden onChange={e => addFiles(e.target.files)} />

        {/* Upload list */}
        {uploads.length > 0 && (
          <Box sx={{ mt: 1 }}>
            {uploads.map((item, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography sx={{ fontSize: 20, width: 28, textAlign: 'center' }}>{getTypeIcon(item.file)}</Typography>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" noWrap sx={{ flex: 1 }}>{item.file.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatSize(item.file.size)}</Typography>
                    {statusIcon(item.status)}
                  </Box>
                  {(item.status === 'uploading' || item.status === 'processing') && (
                    <LinearProgress
                      variant={item.status === 'processing' ? 'indeterminate' : 'determinate'}
                      value={item.progress}
                      sx={{ mt: 0.5, borderRadius: 1 }}
                    />
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Chip size="small" label={statusLabel(item.status)} variant="outlined"
                      color={item.status === 'done' ? 'success' : item.status === 'error' ? 'error' : 'default'} />
                    {item.error && <Typography variant="caption" color="error">{item.error}</Typography>}
                    {item.status === 'error' && (
                      <Button size="small" onClick={() => retryUpload(idx)}>Retry</Button>
                    )}
                  </Box>

                  {/* Quick metadata toggle */}
                  {item.status === 'pending' && (
                    <>
                      <Button size="small" sx={{ mt: 0.5, textTransform: 'none' }}
                        endIcon={item.metaOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        onClick={() => setUploads(prev => prev.map((u, i) => i === idx ? { ...u, metaOpen: !u.metaOpen } : u))}
                      >
                        {t('media.upload.metadata', 'Metadata')}
                      </Button>
                      <Collapse in={item.metaOpen}>
                        <Box sx={{ pl: 1, pr: 1, pb: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <FormControl size="small" sx={{ minWidth: 140 }}>
                            <Select value={item.category} onChange={e => setUploads(prev => prev.map((u, i) => i === idx ? { ...u, category: e.target.value } : u))}>
                              {['branding', 'pages', 'pois', 'video', 'documents', 'other'].map(c =>
                                <MenuItem key={c} value={c} sx={{ textTransform: 'capitalize' }}>{c}</MenuItem>
                              )}
                            </Select>
                          </FormControl>
                          <Autocomplete
                            multiple freeSolo size="small" sx={{ flex: 1, minWidth: 200 }}
                            options={[]}
                            value={item.tags}
                            onChange={(_, v) => setUploads(prev => prev.map((u, i) => i === idx ? { ...u, tags: v } : u))}
                            renderInput={(params) => <TextField {...params} placeholder="Tags..." />}
                          />
                        </Box>
                      </Collapse>
                    </>
                  )}
                </Box>
                <IconButton size="small" onClick={() => removeUpload(idx)} sx={{ opacity: 0.5 }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}

        {/* Duplicate warning */}
        {duplicateWarning && (
          <Alert severity="warning" sx={{ mt: 2 }} onClose={() => setDuplicateWarning(null)}>
            <Typography variant="body2" fontWeight={600}>
              {t('media.upload.duplicate', 'Mogelijk duplicaat gedetecteerd!')}
            </Typography>
            <Typography variant="caption">
              {t('media.upload.duplicateDesc', 'Dit bestand lijkt op een bestaand item in uw mediabibliotheek (perceptual hash match).')}
            </Typography>
          </Alert>
        )}

        {/* Summary */}
        {uploads.length > 0 && (
          <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
            {doneCount > 0 && <Chip label={`${doneCount} verwerkt`} color="success" size="small" />}
            {errorCount > 0 && <Chip label={`${errorCount} mislukt`} color="error" size="small" />}
            {pendingCount > 0 && <Chip label={`${pendingCount} wachtend`} size="small" />}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>{t('common.close', 'Sluiten')}</Button>
        {pendingCount > 0 && (
          <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={startAll}>
            {t('media.upload.startAll', `Upload ${pendingCount} bestand${pendingCount > 1 ? 'en' : ''}`)}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
