/**
 * ConceptDialog — Enterprise content concept viewer/editor
 * Shows 1 content concept with tabs per platform version.
 * Shared fields (title, media) at top, per-platform body in tabs.
 */
import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, IconButton, Tabs, Tab, Chip, TextField,
  Alert, CircularProgress, Tooltip, Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PublishIcon from '@mui/icons-material/Publish';
import ScheduleIcon from '@mui/icons-material/Schedule';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useTranslation } from 'react-i18next';
import contentService from '../../api/contentService.js';
import client from '../../api/client.js';

const PLATFORM_ICONS = {
  website: '🌐', facebook: '📘', instagram: '📸', linkedin: '💼',
  x: '𝕏', tiktok: '🎵', youtube: '▶️', pinterest: '📌',
};

const PLATFORM_COLORS = {
  facebook: '#1877F2', instagram: '#E4405F', linkedin: '#0A66C2',
  x: '#1DA1F2', tiktok: '#000000', youtube: '#FF0000', pinterest: '#BD081C',
  website: '#5E8B7E',
};

const STATUS_COLORS = {
  draft: 'default', pending_review: 'info', approved: 'success',
  scheduled: 'warning', published: 'success', failed: 'error',
  rejected: 'error', deleted: 'default',
};

export default function ConceptDialog({ open, onClose, conceptId, onUpdate }) {
  const { t } = useTranslation();
  const [concept, setConcept] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [editing, setEditing] = useState(null); // platform being edited
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !conceptId) return;
    setLoading(true);
    setActiveTab(0);
    contentService.getConcept(conceptId)
      .then(res => {
        setConcept(res.data);
        setItems(res.data?.items || []);
      })
      .catch(() => { setConcept(null); setItems([]); })
      .finally(() => setLoading(false));
  }, [open, conceptId]);

  const activeItem = items[activeTab] || null;

  const handleSaveBody = async () => {
    if (!activeItem || !editing) return;
    setSaving(true);
    try {
      await client.patch(`/content/items/${activeItem.id}`, { body_en: editBody });
      setItems(prev => prev.map(i => i.id === activeItem.id ? { ...i, body_en: editBody } : i));
      setEditing(null);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePublishItem = async (itemId) => {
    try {
      await client.post(`/content/items/${itemId}/publish-now`);
      // Refresh
      const res = await contentService.getConcept(conceptId);
      setItems(res.data?.items || []);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Publish failed:', err);
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await client.delete(`/content/items/${itemId}`);
      setItems(prev => prev.filter(i => i.id !== itemId));
      if (activeTab >= items.length - 1) setActiveTab(Math.max(0, activeTab - 1));
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { minHeight: '70vh' } }}>
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <CircularProgress />
        </Box>
      ) : !concept ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="error">Concept niet gevonden</Typography>
          <Button onClick={onClose} sx={{ mt: 2 }}>Sluiten</Button>
        </Box>
      ) : (
        <>
          {/* Header */}
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pb: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>{concept.title}</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip label={concept.content_type} size="small" variant="outlined" />
                <Chip label={concept.approval_status} size="small" color={STATUS_COLORS[concept.approval_status] || 'default'} />
                {items.length > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {items.length} {items.length === 1 ? 'platform' : 'platformen'}
                  </Typography>
                )}
              </Box>
            </Box>
            <IconButton onClick={onClose}><CloseIcon /></IconButton>
          </DialogTitle>

          <Divider />

          {/* Platform Tabs */}
          {items.length > 0 ? (
            <>
              <Tabs
                value={activeTab}
                onChange={(_, v) => { setActiveTab(v); setEditing(null); }}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
              >
                {items.map((item, idx) => (
                  <Tab
                    key={item.id}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <span>{PLATFORM_ICONS[item.target_platform] || '📄'}</span>
                        <span>{item.target_platform?.charAt(0).toUpperCase() + item.target_platform?.slice(1)}</span>
                        <Chip
                          label={item.approval_status}
                          size="small"
                          color={STATUS_COLORS[item.approval_status] || 'default'}
                          sx={{ height: 18, fontSize: 10, ml: 0.5 }}
                        />
                      </Box>
                    }
                    sx={{ textTransform: 'none', minHeight: 48 }}
                  />
                ))}
              </Tabs>

              {/* Active Platform Content */}
              {activeItem && (
                <DialogContent sx={{ pt: 2 }}>
                  {/* Platform badge */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{
                        width: 32, height: 32, borderRadius: '50%',
                        bgcolor: PLATFORM_COLORS[activeItem.target_platform] || '#666',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16,
                      }}>
                        {PLATFORM_ICONS[activeItem.target_platform]}
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {activeItem.target_platform?.charAt(0).toUpperCase() + activeItem.target_platform?.slice(1)}
                      </Typography>
                      {activeItem.seo_score && (
                        <Chip label={`SEO ${activeItem.seo_score}/100`} size="small"
                          color={activeItem.seo_score >= 80 ? 'success' : activeItem.seo_score >= 60 ? 'warning' : 'error'} />
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Bewerken">
                        <IconButton size="small" onClick={() => { setEditing(activeItem.target_platform); setEditBody(activeItem.body_en || ''); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Publiceren">
                        <IconButton size="small" color="primary" onClick={() => handlePublishItem(activeItem.id)}
                          disabled={activeItem.approval_status === 'published'}>
                          <PublishIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Verwijderen">
                        <IconButton size="small" color="error" onClick={() => handleDeleteItem(activeItem.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  {/* Content body */}
                  {editing === activeItem.target_platform ? (
                    <Box>
                      <TextField
                        multiline fullWidth minRows={8} maxRows={20}
                        value={editBody}
                        onChange={e => setEditBody(e.target.value)}
                        sx={{ mb: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}
                      />
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button variant="contained" size="small" onClick={handleSaveBody} disabled={saving}>
                          {saving ? <CircularProgress size={16} /> : 'Opslaan'}
                        </Button>
                        <Button size="small" onClick={() => setEditing(null)}>Annuleren</Button>
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{
                      p: 2, bgcolor: 'action.hover', borderRadius: 2,
                      whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: 1.6,
                      maxHeight: 400, overflowY: 'auto',
                      borderLeft: `4px solid ${PLATFORM_COLORS[activeItem.target_platform] || '#ccc'}`,
                    }}>
                      {activeItem.body_en || activeItem.body_nl || 'Geen content beschikbaar'}
                    </Box>
                  )}

                  {/* Translations available */}
                  <Box sx={{ mt: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {['en', 'nl', 'de', 'es', 'fr'].map(lang => (
                      <Chip
                        key={lang}
                        label={lang.toUpperCase()}
                        size="small"
                        variant={activeItem[`body_${lang}`] ? 'filled' : 'outlined'}
                        color={activeItem[`body_${lang}`] ? 'primary' : 'default'}
                        sx={{ height: 20, fontSize: 10 }}
                      />
                    ))}
                  </Box>

                  {/* Published info */}
                  {activeItem.published_at && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      Gepubliceerd op {new Date(activeItem.published_at).toLocaleString('nl-NL')}
                      {activeItem.publish_url && (
                        <Button size="small" href={activeItem.publish_url} target="_blank" sx={{ ml: 1 }}>Bekijk post</Button>
                      )}
                    </Alert>
                  )}

                  {activeItem.publish_error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      Publicatie mislukt: {activeItem.publish_error}
                    </Alert>
                  )}
                </DialogContent>
              )}
            </>
          ) : (
            <DialogContent>
              <Alert severity="info">Dit concept heeft nog geen platform versies.</Alert>
            </DialogContent>
          )}

          <DialogActions>
            <Button onClick={onClose}>{t('common.close', 'Sluiten')}</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
