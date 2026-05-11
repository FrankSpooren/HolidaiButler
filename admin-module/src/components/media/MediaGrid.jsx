import { useRef, useEffect, useCallback } from 'react';
import {
  Box, ImageList, ImageListItem, ImageListItemBar, Checkbox, Chip,
  Typography, Skeleton, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, useMediaQuery, useTheme
} from '@mui/material';
import PermMediaIcon from '@mui/icons-material/PermMedia';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useTranslation } from 'react-i18next';

const isImage = (file) => file.mime_type?.startsWith('image/');

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString();
}

function getFileUrl(file, apiBase) {
  if (file.url?.startsWith('http')) return file.url;
  return `${apiBase || ''}${file.url}`;
}

// Loading skeleton placeholders
function LoadingSkeleton({ view }) {
  const items = Array.from({ length: 6 }, (_, i) => i);
  if (view === 'list') {
    return (
      <Box>
        {items.map(i => (
          <Skeleton key={i} variant="rectangular" height={48} sx={{ mb: 1, borderRadius: 1 }} />
        ))}
      </Box>
    );
  }
  return (
    <ImageList cols={4} gap={8} sx={{ m: 0 }}>
      {items.map(i => (
        <ImageListItem key={i}>
          <Skeleton variant="rectangular" height={view === 'masonry' ? 120 + (i % 3) * 60 : 150} sx={{ borderRadius: 1 }} />
        </ImageListItem>
      ))}
    </ImageList>
  );
}

// Empty state
function EmptyState({ onUpload, t }) {
  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <PermMediaIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
      <Typography variant="h6" sx={{ mb: 1 }}>
        {t('media.empty.title', 'Nog geen media bestanden')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('media.empty.description', 'Upload je eerste media om te beginnen.')}
      </Typography>
      <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={onUpload}>
        {t('media.upload', 'Upload')}
      </Button>
    </Box>
  );
}

// Thumbnail item used in grid/masonry views
function ThumbnailItem({ file, isSelected, onSelect, onClick, apiBase }) {
  return (
    <ImageListItem
      sx={{
        cursor: 'pointer',
        borderRadius: 1,
        overflow: 'hidden',
        border: isSelected ? '2px solid' : '1px solid',
        borderColor: isSelected ? 'primary.main' : 'divider',
        position: 'relative',
      }}
      onClick={() => onClick(file)}
    >
      <Checkbox
        checked={isSelected}
        onClick={e => { e.stopPropagation(); onSelect(file.id, e); }}
        size="small"
        inputProps={{ 'aria-label': `Select ${file.original_name || file.filename}` }}
        sx={{
          position: 'absolute', top: 2, left: 2, zIndex: 2,
          bgcolor: 'rgba(255,255,255,0.8)', borderRadius: 0.5,
          p: 0.25, 'transition': 'transform 200ms ease, box-shadow 200ms ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: 4, bgcolor: 'rgba(255,255,255,0.95)' },
        }}
      />
      {isImage(file) ? (
        <img
          src={getFileUrl(file, apiBase)}
          alt={file.alt_text || file.original_name}
          loading="lazy"
          style={{ height: 150, objectFit: 'cover', width: '100%' }}
        />
      ) : file.media_type === 'video' ? (
        <Box sx={{ height: 150, position: 'relative', bgcolor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src={`${apiBase}/media-files/thumbnails/${file.id}_400.jpg`}
            alt={file.original_name}
            loading="lazy"
            style={{ height: '100%', width: '100%', objectFit: 'cover', opacity: 0.7 }}
            onError={e => { e.target.style.display = 'none'; }}
          />
          <Box sx={{ position: 'absolute', fontSize: 40, color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>▶</Box>
          {file.duration_seconds > 0 && (
            <Box sx={{ position: 'absolute', bottom: 4, right: 4, bgcolor: 'rgba(0,0,0,0.7)', color: 'white', px: 0.5, borderRadius: 0.5, fontSize: '0.65rem', fontWeight: 700 }}>
              {Math.floor(file.duration_seconds / 60)}:{String(Math.round(file.duration_seconds % 60)).padStart(2, '0')}
            </Box>
          )}
        </Box>
      ) : (
        <Box sx={{ height: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover' }}>
          <Typography sx={{ fontSize: 32, mb: 0.5 }}>
            {file.media_type === 'audio' ? '🎵' : file.media_type === 'pdf' ? '📄' : file.media_type === 'gpx' ? '🗺️' : '📎'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {file.media_type?.toUpperCase() || file.mime_type?.split('/')[1]?.toUpperCase() || 'FILE'}
          </Typography>
        </Box>
      )}
      <ImageListItemBar
        title={<span title={file.original_name || file.filename}>{file.original_name || file.filename}</span>}
        subtitle={<Chip size="small" label={file.category || file.mime_type?.split('/')[1]} sx={{ height: 18, fontSize: '0.65rem' }} />}
        sx={{ '& .MuiImageListItemBar-title': { fontSize: '0.7rem' } }}
      />
    </ImageListItem>
  );
}

// List view row
function ListViewRow({ file, isSelected, onSelect, onClick, apiBase, t }) {
  return (
    <TableRow
      hover
      sx={{ cursor: 'pointer' }}
      onClick={() => onClick(file)}
    >
      <TableCell padding="checkbox" onClick={e => e.stopPropagation()}>
        <Checkbox checked={isSelected} onChange={e => onSelect(file.id, e)} size="small" />
      </TableCell>
      <TableCell sx={{ width: 60, p: 0.5 }}>
        {isImage(file) ? (
          <Box
            component="img"
            src={getFileUrl(file, apiBase)}
            alt={file.alt_text || ''}
            sx={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 0.5 }}
          />
        ) : (
          <Box sx={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover', borderRadius: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {file.mime_type?.split('/')[1]?.toUpperCase() || 'FILE'}
            </Typography>
          </Box>
        )}
      </TableCell>
      <TableCell>{file.original_name}</TableCell>
      <TableCell>
        <Chip size="small" label={file.mime_type?.split('/')[1] || '—'} sx={{ height: 20, fontSize: '0.7rem' }} />
      </TableCell>
      <TableCell>{(Array.isArray(file.tags) ? file.tags : (() => { try { return JSON.parse(file.tags); } catch { return null; } })())?.join(', ') || '—'}</TableCell>
      <TableCell>{formatSize(file.size_bytes)}</TableCell>
      <TableCell>{formatDate(file.created_at)}</TableCell>
      <TableCell>{file.uploaded_by || '—'}</TableCell>
    </TableRow>
  );
}

export default function MediaGrid({
  items, view, selected, onSelect, onItemClick, loading, apiBase, onLoadMore, onUploadClick, cols = 4, focusIndex = -1
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const sentinelRef = useRef(null);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!sentinelRef.current || !onLoadMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onLoadMore(); },
      { rootMargin: '200px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [onLoadMore]);

  if (loading) return <LoadingSkeleton view={view} />;
  if (!items?.length) return <EmptyState onUpload={onUploadClick} t={t} />;

  const effectiveCols = isMobile ? 2 : cols;
  const selectedSet = selected instanceof Set ? selected : new Set(selected || []);

  if (view === 'list') {
    return (
      <>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell />
                <TableCell>{t('media.col.filename', 'Bestandsnaam')}</TableCell>
                <TableCell>{t('media.col.type', 'Type')}</TableCell>
                <TableCell>{t('media.col.tags', 'Tags')}</TableCell>
                <TableCell>{t('media.col.size', 'Grootte')}</TableCell>
                <TableCell>{t('media.col.date', 'Datum')}</TableCell>
                <TableCell>{t('media.col.owner', 'Eigenaar')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(file => (
                <ListViewRow
                  key={file.id}
                  file={file}
                  isSelected={selectedSet.has(file.id)}
                  onSelect={onSelect}
                  onClick={onItemClick}
                  apiBase={apiBase}
                  t={t}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box ref={sentinelRef} sx={{ height: 1 }} />
      </>
    );
  }

  // Grid or Masonry
  const variant = view === 'masonry' ? 'masonry' : 'standard';

  return (
    <>
      <ImageList variant={variant} cols={effectiveCols} gap={8} sx={{ m: 0 }}>
        {items.map(file => (
          <ThumbnailItem
            key={file.id}
            file={file}
            isSelected={selectedSet.has(file.id)}
            onSelect={onSelect}
            onClick={onItemClick}
            apiBase={apiBase}
          />
        ))}
      </ImageList>
      <Box ref={sentinelRef} sx={{ height: 1 }} />
    </>
  );
}
