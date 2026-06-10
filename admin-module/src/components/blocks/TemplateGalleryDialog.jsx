import { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Chip, CircularProgress, IconButton,
  Card, CardActionArea, CardContent, TextField, InputAdornment, Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import PublicIcon from '@mui/icons-material/Public';
import PlaceIcon from '@mui/icons-material/Place';
import { useDestination } from './DestinationContext.jsx';
import apiClient from '../../api/client.js';

/**
 * TemplateGalleryDialog (BLOK F6 — 22-05-2026)
 *
 * Toont saved block templates (destination-specific + global) met search-filter.
 * 1-klik insert kloont template.block_payload + retourneert via onInsert callback.
 *
 * @version BLOK F6 (22-05-2026)
 */

export default function TemplateGalleryDialog({ open, onClose, onInsert }) {
  const { destinationId } = useDestination();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  const fetchTemplates = () => {
    if (!destinationId) return;
    setLoading(true);
    setError(null);
    apiClient.get('/page-builder/templates', { params: { destinationId, includeGlobal: 'true' } })
      .then(r => setTemplates(r.data?.data?.items || []))
      .catch(err => setError(err?.response?.data?.error?.message || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, destinationId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return templates;
    const s = search.toLowerCase();
    return templates.filter(t =>
      String(t.name).toLowerCase().includes(s) ||
      String(t.description || '').toLowerCase().includes(s) ||
      String(t.block_type).toLowerCase().includes(s)
    );
  }, [templates, search]);

  const handleInsert = async (template) => {
    if (!template?.block_payload) return;
    const clone = JSON.parse(JSON.stringify(template.block_payload));
    clone.id = `${template.block_type}-${Date.now()}`;
    clone._updatedAt = new Date().toISOString();
    onInsert(clone);
    apiClient.post(`/page-builder/templates/${template.id}/use`).catch(() => {});
    onClose();
  };

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm('Template verwijderen?')) return;
    try {
      await apiClient.delete(`/page-builder/templates/${id}`);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      alert(`Verwijderen mislukt: ${err?.response?.data?.error?.message || err.message}`);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Template Library</Typography>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <TextField
          fullWidth
          size="small"
          placeholder="Zoek templates op naam, beschrijving of block-type..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ mb: 2 }}
        />

        {loading && <Box sx={{ py: 3, textAlign: 'center' }}><CircularProgress /></Box>}

        {error && (
          <Typography variant="body2" color="error">{error}</Typography>
        )}

        {!loading && !error && filtered.length === 0 && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {search.trim() ? 'Geen templates gevonden.' : 'Nog geen templates opgeslagen. Klik op een block en gebruik "Sla op als template".'}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 1.5 }}>
          {filtered.map((tmpl) => (
            <Card key={tmpl.id} variant="outlined" sx={{ position: 'relative' }}>
              <CardActionArea onClick={() => handleInsert(tmpl)} sx={{ height: '100%' }}>
                <CardContent sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    {tmpl.is_global ? (
                      <Tooltip title="Globaal beschikbaar"><PublicIcon sx={{ fontSize: 14, color: 'primary.main' }} /></Tooltip>
                    ) : (
                      <Tooltip title="Destination-specifiek"><PlaceIcon sx={{ fontSize: 14, color: 'success.main' }} /></Tooltip>
                    )}
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tmpl.name}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                    <Chip size="small" label={tmpl.block_type} sx={{ height: 18, fontSize: '0.6rem' }} />
                    {tmpl.use_count > 0 && (
                      <Chip size="small" label={`${tmpl.use_count}x gebruikt`} variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
                    )}
                  </Box>
                  {tmpl.description && (
                    <Typography variant="caption" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', color: 'text.secondary' }}>
                      {tmpl.description}
                    </Typography>
                  )}
                </CardContent>
              </CardActionArea>
              <IconButton
                size="small"
                onClick={(e) => handleDelete(tmpl.id, e)}
                sx={{ position: 'absolute', top: 2, right: 2 }}
                title="Verwijder template"
              >
                <DeleteIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Card>
          ))}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Sluiten</Button>
      </DialogActions>
    </Dialog>
  );
}
