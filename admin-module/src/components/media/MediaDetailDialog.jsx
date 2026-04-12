import { useState, forwardRef, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Box, Typography, IconButton, Tabs, Tab,
  TextField, Chip, Select, MenuItem, FormControl, InputLabel, Switch,
  FormControlLabel, Autocomplete, Skeleton, Stack, Divider, Slide, Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import { lazy, Suspense } from 'react';
const MediaImageEditor = lazy(() => import('./MediaImageEditor.jsx'));
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import SmartDisplayIcon from '@mui/icons-material/SmartDisplay';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client.js';

const SlideTransition = forwardRef(function SlideTransition(props, ref) {
  return <Slide direction="left" ref={ref} {...props} />;
});

const USAGE_RIGHTS = ['internal', 'online', 'offline', 'commercial', 'informational', 'all'];
const LICENSE_TYPES = ['own', 'stock_pexels', 'stock_flickr', 'stock_unsplash', 'creative_commons', 'rights_managed'];
const CONSENT_STATUSES = ['not_required', 'pending', 'approved', 'expired'];

const TIER_COLORS = { low: 'error', medium: 'warning', high: 'success', ultra: 'info' };

function formatFileSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString();
}

export default function MediaDetailDialog({ open, mediaId, destId, onClose, onUpdate, apiBase, onNavigate }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);

  const { data: media, isLoading } = useQuery({
    queryKey: ['media-detail', mediaId],
    queryFn: () => client.get(`/media/${mediaId}`, { params: { destinationId: destId } }).then(r => r.data?.data),
    enabled: open && !!mediaId,
  });

  const { data: tagSuggestions } = useQuery({
    queryKey: ['media-tags-ac', destId],
    queryFn: () => client.get('/media/tags/autocomplete', { params: { destinationId: destId } }).then(r => r.data?.data || []),
    enabled: open && tab === 1 && !!destId,
    staleTime: 60000,
  });

  const saveMutation = useMutation({
    mutationFn: (updates) => {
      console.log('[MediaDetail] PATCH /media/' + mediaId, 'destId=' + destId, 'updates:', updates);
      return client.patch(`/media/${mediaId}`, updates, { params: { destinationId: destId } });
    },
    onSuccess: (res) => {
      console.log('[MediaDetail] SAVE SUCCESS:', res?.data);
      queryClient.invalidateQueries({ queryKey: ['media-detail', mediaId] });
      onUpdate?.();
    },
    onError: (err) => {
      console.error('[MediaDetail] SAVE ERROR:', err?.response?.data || err.message);
    },
  });

  const handleFieldSave = useCallback((field, value) => {
    console.log('[MediaDetail] SAVE:', field, '=', value, 'mediaId:', mediaId, 'destId:', destId);
    saveMutation.mutate({ [field]: value });
  }, [saveMutation, mediaId, destId]);

  const isImage = media?.mime_type?.startsWith('image/');
  const isVideo = media?.mime_type?.startsWith('video/');
  const isAudio = media?.mime_type?.startsWith('audio/');
  const fileUrl = media?.url?.startsWith('http') ? media.url : `${apiBase || ''}${media?.url || ''}`;

  return (
    <>
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      TransitionComponent={SlideTransition}
      PaperProps={{ sx: { height: '90vh' } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h6" noWrap sx={{ maxWidth: '80%' }}>
          {media?.original_name || media?.filename || t('media.detail', 'Media detail')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {media?.mime_type?.startsWith('image/') && (
            <IconButton onClick={() => setEditorOpen(true)} size="small" title={t('media.edit', 'Bewerken')}><EditIcon /></IconButton>
          )}
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', gap: 2, p: 2, overflow: 'hidden' }}>
        {/* Left Panel — Preview */}
        <Box sx={{ width: '60%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', bgcolor: 'action.hover', borderRadius: 2, overflow: 'hidden', minHeight: 0 }}>
          {isLoading ? (
            <Skeleton variant="rectangular" width="100%" height="100%" />
          ) : isImage ? (
            <Box component="img" src={fileUrl} alt={media?.alt_text || ''} sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : isVideo ? (
            <Box component="video" src={fileUrl} controls sx={{ maxWidth: '100%', maxHeight: '100%' }} />
          ) : isAudio ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <AudioFileIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Box component="audio" src={fileUrl} controls sx={{ width: '100%' }} />
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <InsertDriveFileIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{media?.original_name || media?.filename}</Typography>
            </Box>
          )}

          {/* Navigation arrows */}
          {onNavigate && (
            <>
              <IconButton onClick={() => onNavigate('prev')} sx={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', bgcolor: 'background.paper', '&:hover': { bgcolor: 'action.selected' } }}>
                <ArrowBackIcon />
              </IconButton>
              <IconButton onClick={() => onNavigate('next')} sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', bgcolor: 'background.paper', '&:hover': { bgcolor: 'action.selected' } }}>
                <ArrowForwardIcon />
              </IconButton>
            </>
          )}
        </Box>

        {/* Right Panel — Tabs */}
        <Box sx={{ width: '40%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
            <Tab label={t('media.tabInfo', 'Info')} />
            <Tab label={t('media.tabTags', 'Tags')} />
            <Tab label={t('media.tabRights', 'Rechten')} />
            <Tab label={t('media.tabVersions', 'Versies')} />
            <Tab label={t('media.tabUsage', 'Gebruik')} />
          </Tabs>

          <Box sx={{ flex: 1, overflow: 'auto', pr: 0.5 }}>
            {isLoading ? (
              <Stack spacing={1.5} sx={{ p: 1 }}>
                {[...Array(6)].map((_, i) => <Skeleton key={i} variant="rectangular" height={40} sx={{ borderRadius: 1 }} />)}
              </Stack>
            ) : (
              <>
                {tab === 0 && <InfoTab media={media} onSave={handleFieldSave} t={t} />}
                {tab === 1 && <TagsTab media={media} onSave={handleFieldSave} suggestions={tagSuggestions || []} t={t} />}
                {tab === 2 && <RightsTab media={media} onSave={handleFieldSave} t={t} />}
                {tab === 3 && <VersionsTab media={media} t={t} />}
                {tab === 4 && <UsageTab media={media} t={t} />}
              </>
            )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>

    {/* Image Editor */}
    {editorOpen && media && (
      <Suspense fallback={null}>
        <MediaImageEditor
          open={editorOpen}
          media={media}
          destId={destId}
          apiBase={apiBase}
          onClose={() => setEditorOpen(false)}
          onSaved={() => { queryClient.invalidateQueries({ queryKey: ['media-detail', mediaId] }); onUpdate?.(); }}
        />
      </Suspense>
    )}
    </>
  );
}

/* ── Tab 0: Info ── */
function InfoTab({ media, onSave, t }) {
  const [fields, setFields] = useState({});

  const getVal = (key) => fields[key] ?? media?.[key] ?? '';

  const handleBlur = (key) => {
    if (fields[key] !== undefined && fields[key] !== (media?.[key] ?? '')) {
      onSave(key, fields[key]);
    }
  };

  return (
    <Stack spacing={2} sx={{ p: 1 }}>
      <ReadOnlyField label={t('media.filename', 'Bestandsnaam')} value={media?.original_name || media?.filename} />
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip label={media?.media_type || 'unknown'} size="small" />
        {media?.quality_tier && (
          <Chip label={media.quality_tier} size="small" color={TIER_COLORS[media.quality_tier] || 'default'} />
        )}
        {media?.ai_badge && <Chip label="🤖 AI-bewerkt" size="small" variant="outlined" />}
      </Box>
      {media?.width && media?.height && (
        <ReadOnlyField label={t('media.dimensions', 'Afmetingen')} value={`${media.width} × ${media.height}`} />
      )}
      <ReadOnlyField label={t('media.fileSize', 'Bestandsgrootte')} value={formatFileSize(media?.size_bytes)} />
      <ReadOnlyField label={t('media.created', 'Aangemaakt')} value={formatDate(media?.created_at)} />

      <Divider />

      <TextField
        label={t('media.altText', 'Alt tekst')}
        value={getVal('alt_text')}
        onChange={(e) => setFields(p => ({ ...p, alt_text: e.target.value }))}
        onBlur={() => handleBlur('alt_text')}
        multiline rows={2} size="small" fullWidth
      />
      <TextField
        label={t('media.descriptionNl', 'Beschrijving NL')}
        value={getVal('description')}
        onChange={(e) => setFields(p => ({ ...p, description: e.target.value }))}
        onBlur={() => handleBlur('description')}
        multiline rows={3} size="small" fullWidth
      />
      <TextField
        label={t('media.ownerName', 'Eigenaar naam')}
        value={getVal('owner_name')}
        onChange={(e) => setFields(p => ({ ...p, owner_name: e.target.value }))}
        onBlur={() => handleBlur('owner_name')}
        size="small" fullWidth
      />
      <TextField
        label={t('media.ownerEmail', 'Eigenaar email')}
        value={getVal('owner_email')}
        onChange={(e) => setFields(p => ({ ...p, owner_email: e.target.value }))}
        onBlur={() => handleBlur('owner_email')}
        size="small" fullWidth
      />
      <TextField
        label={t('media.locationName', 'Locatie')}
        value={getVal('location_name')}
        onChange={(e) => setFields(p => ({ ...p, location_name: e.target.value }))}
        onBlur={() => handleBlur('location_name')}
        size="small" fullWidth
      />
    </Stack>
  );
}

/* ── Tab 1: Tags ── */
function TagsTab({ media, onSave, suggestions, t }) {
  const rawAiTags = media?.tags_ai;
  const aiTags = typeof rawAiTags === 'string' ? JSON.parse(rawAiTags) : (rawAiTags || []);
  const rawTags = media?.tags;
  const manualTags = typeof rawTags === 'string' ? JSON.parse(rawTags) : (rawTags || []);

  return (
    <Stack spacing={2} sx={{ p: 1 }}>
      <Box>
        <Typography variant="subtitle2" gutterBottom>{t('media.aiTags', 'AI Tags')}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          {t('media.aiTagsSub', 'AI gegenereerd')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {aiTags.length ? aiTags.map((tag, i) => (
            <Chip key={i} label={tag} size="small" sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }} />
          )) : (
            <Typography variant="body2" color="text.secondary">—</Typography>
          )}
        </Box>
      </Box>

      <Divider />

      <Box>
        <Typography variant="subtitle2" gutterBottom>{t('media.manualTags', 'Handmatige tags')}</Typography>
        <Autocomplete
          multiple freeSolo
          options={suggestions}
          value={manualTags}
          onChange={(_, newVal) => onSave('tags', newVal)}
          renderInput={(params) => <TextField {...params} placeholder={t('media.tagPlaceholder', 'Tag toevoegen en Enter om te bewaren')} size="small" />}
          renderTags={(val, getTagProps) =>
            val.map((tag, i) => <Chip key={i} label={tag} size="small" {...getTagProps({ index: i })} />)
          }
        />
      </Box>
    </Stack>
  );
}

/* ── Tab 2: Rights ── */
function RightsTab({ media, onSave, t }) {
  return (
    <Stack spacing={2} sx={{ p: 1 }}>
      <FormControl size="small" fullWidth>
        <InputLabel>{t('media.usageRights', 'Gebruiksrechten')}</InputLabel>
        <Select
          value={media?.usage_rights || ''}
          label={t('media.usageRights', 'Gebruiksrechten')}
          onChange={(e) => onSave('usage_rights', e.target.value)}
        >
          {USAGE_RIGHTS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </Select>
      </FormControl>

      <FormControl size="small" fullWidth>
        <InputLabel>{t('media.licenseType', 'Licentie type')}</InputLabel>
        <Select
          value={media?.license_type || ''}
          label={t('media.licenseType', 'Licentie type')}
          onChange={(e) => onSave('license_type', e.target.value)}
        >
          {LICENSE_TYPES.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
        </Select>
      </FormControl>

      {media?.license_type && media.license_type !== 'own' && (
        <TextField
          label={t('media.licenseExpiry', 'Licentie vervaldatum')}
          type="date"
          value={media?.license_expiry ? media.license_expiry.slice(0, 10) : ''}
          onChange={(e) => onSave('license_expiry', e.target.value)}
          size="small" fullWidth
          InputLabelProps={{ shrink: true }}
        />
      )}

      <FormControl size="small" fullWidth>
        <InputLabel>{t('media.consentStatus', 'Toestemming')}</InputLabel>
        <Select
          value={media?.consent_status || ''}
          label={t('media.consentStatus', 'Toestemming')}
          onChange={(e) => onSave('consent_status', e.target.value)}
        >
          {CONSENT_STATUSES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </Select>
      </FormControl>

      {media?.consent_status && media.consent_status !== 'not_required' && (
        <TextField
          label={t('media.consentFormUrl', 'Toestemmingsformulier URL')}
          value={media?.consent_form_url || ''}
          onChange={(e) => onSave('consent_form_url', e.target.value)}
          size="small" fullWidth
        />
      )}

      <FormControlLabel
        control={
          <Switch
            checked={!!media?.ai_badge}
            onChange={(e) => onSave('ai_badge', e.target.checked)}
          />
        }
        label={t('media.aiBadge', 'AI badge')}
      />
    </Stack>
  );
}

/* ── Tab 3: Versions ── */
function VersionsTab({ media, t }) {
  const versions = media?.versions || [];

  if (!versions.length) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">{t('media.noVersions', 'Nog geen versies')}</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1} sx={{ p: 1 }}>
      {versions.map((v, i) => (
        <Box
          key={i}
          sx={{
            p: 1.5, borderRadius: 1,
            bgcolor: v.is_current ? 'action.selected' : 'transparent',
            border: 1, borderColor: v.is_current ? 'primary.main' : 'divider',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="subtitle2">
              v{v.version}
              {v.is_current && <Chip label={t('media.current', 'Huidig')} size="small" sx={{ ml: 1 }} color="primary" />}
            </Typography>
            <Typography variant="caption" color="text.secondary">{formatDate(v.created_at)}</Typography>
          </Box>
          {v.changed_by && <Typography variant="caption" color="text.secondary">{v.changed_by}</Typography>}
          {v.description && <Typography variant="body2" sx={{ mt: 0.5 }}>{v.description}</Typography>}
        </Box>
      ))}
    </Stack>
  );
}

/* ── Tab 4: Usage ── */
function UsageTab({ media, t }) {
  const contentItems = media?.usage_in_content || [];
  const auditLog = media?.audit || [];

  return (
    <Stack spacing={2} sx={{ p: 1 }}>
      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <StatBox label={t('media.downloads', 'Downloads')} value={media?.download_count ?? 0} />
        <StatBox label={t('media.usageCount', 'Gebruikt')} value={media?.usage_count ?? 0} />
        <StatBox label={t('media.lastUsed', 'Laatst gebruikt')} value={formatDate(media?.last_used_at)} />
      </Box>

      <Divider />

      {/* Content items */}
      <Typography variant="subtitle2">{t('media.usedIn', 'Gebruikt in')}</Typography>
      {contentItems.length ? contentItems.map((item, i) => (
        <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
          <Typography variant="body2">{item.title}</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip label={item.status} size="small" variant="outlined" />
            <Typography variant="caption" color="text.secondary">{formatDate(item.date)}</Typography>
          </Box>
        </Box>
      )) : (
        <Typography variant="body2" color="text.secondary">—</Typography>
      )}

      <Divider />

      {/* Audit log */}
      <Typography variant="subtitle2">{t('media.auditLog', 'Audit log')}</Typography>
      {auditLog.length ? auditLog.map((entry, i) => (
        <Box key={i} sx={{ py: 0.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">{entry.action}</Typography>
            <Typography variant="caption" color="text.secondary">{formatDate(entry.date)}</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {entry.user}{entry.details ? ` — ${entry.details}` : ''}
          </Typography>
        </Box>
      )) : (
        <Typography variant="body2" color="text.secondary">—</Typography>
      )}
    </Stack>
  );
}

/* ── Helpers ── */
function ReadOnlyField({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2">{value || '—'}</Typography>
    </Box>
  );
}

function StatBox({ label, value }) {
  return (
    <Box sx={{ textAlign: 'center', minWidth: 80 }}>
      <Typography variant="h6">{value}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Box>
  );
}
