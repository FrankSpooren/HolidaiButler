import { useState, useEffect } from 'react';
import { NumberField, SelectField } from '../fields/index.js';
import {
  TextField, Typography, Box, Checkbox, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Chip, CircularProgress, Alert, Divider,
  ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import useDestinationStore from '../../../stores/destinationStore.js';
import contentService from '../../../api/contentService.js';

const COLUMN_OPTIONS = [
  { value: 2, label: '2 kolommen' },
  { value: 3, label: '3 kolommen' },
  { value: 4, label: '4 kolommen' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Nieuwste eerst' },
  { value: 'popular', label: 'Populairste eerst' },
  { value: 'score', label: 'Hoogste SEO-score' },
];

export default function BlogGridEditor({ block, onChange }) {
  const props = block.props || {};
  const update = (key, val) => onChange({ ...props, [key]: val });
  const selectedDestination = useDestinationStore(s => s.selectedDestination);
  const destinations = useDestinationStore(s => s.destinations);
  const destId = destinations.find(d => d.code === selectedDestination)?.id || 1;

  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(props.selectedIds?.length > 0 ? 'manual' : 'auto');

  // Selected blog IDs (for manual mode)
  const selectedIds = props.selectedIds || [];

  // Load all blog items from Content Studio
  useEffect(() => {
    setLoading(true);
    contentService.getItems(destId, { status: '', limit: 100 })
      .then(r => {
        const items = (r.data?.items || r.items || [])
          .filter(i => i.content_type === 'blog' && i.approval_status !== 'deleted');
        setBlogs(items);
      })
      .catch(() => setBlogs([]))
      .finally(() => setLoading(false));
  }, [destId]);

  const toggleBlog = (blogId) => {
    const current = [...selectedIds];
    const idx = current.indexOf(blogId);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(blogId);
    }
    update('selectedIds', current);
  };

  const selectAll = () => update('selectedIds', blogs.map(b => b.id));
  const deselectAll = () => update('selectedIds', []);

  return (
    <>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Toont blog artikelen uit Content Studio op de pagina.
      </Typography>

      <Box sx={{ mt: 1 }}>
        <TextField label="Titel boven de grid" value={props.title || ''} onChange={e => update('title', e.target.value)}
          fullWidth size="small" placeholder="bijv. Laatste blogs" />
      </Box>

      <NumberField label="Max. aantal blogs" value={props.limit || 9} onChange={v => update('limit', v)} min={1} max={24} />
      <SelectField label="Kolommen" value={props.columns || 3} onChange={v => update('columns', v)} options={COLUMN_OPTIONS} />
      <SelectField label="Sortering" value={props.sortBy || 'newest'} onChange={v => update('sortBy', v)} options={SORT_OPTIONS} />

      <Divider sx={{ my: 1.5 }} />

      {/* Mode toggle: auto (all published) vs manual (handpicked) */}
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Blog selectie</Typography>
      <ToggleButtonGroup value={mode} exclusive onChange={(_, v) => { if (v) { setMode(v); if (v === 'auto') update('selectedIds', []); } }}
        size="small" sx={{ mb: 1 }}>
        <ToggleButton value="auto">Automatisch (alle gepubliceerde)</ToggleButton>
        <ToggleButton value="manual">Handmatig kiezen</ToggleButton>
      </ToggleButtonGroup>

      {mode === 'auto' && (
        <Alert severity="info" sx={{ py: 0.5, '& .MuiAlert-message': { fontSize: 12 } }}>
          Toont automatisch de nieuwste gepubliceerde blogs, gesorteerd op de gekozen volgorde.
        </Alert>
      )}

      {mode === 'manual' && (
        <>
          <Box sx={{ display: 'flex', gap: 1, mb: 0.5, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              {selectedIds.length} van {blogs.length} geselecteerd
            </Typography>
            <Chip label="Alles selecteren" size="small" variant="outlined" onClick={selectAll} sx={{ cursor: 'pointer', height: 22, fontSize: 10 }} />
            <Chip label="Niets selecteren" size="small" variant="outlined" onClick={deselectAll} sx={{ cursor: 'pointer', height: 22, fontSize: 10 }} />
          </Box>

          {loading ? (
            <Box sx={{ textAlign: 'center', py: 2 }}><CircularProgress size={20} /></Box>
          ) : blogs.length === 0 ? (
            <Alert severity="warning" sx={{ py: 0.5 }}>Geen blog artikelen gevonden in Content Studio.</Alert>
          ) : (
            <List dense sx={{ maxHeight: 280, overflowY: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
              {blogs.map(blog => {
                const isSelected = selectedIds.includes(blog.id);
                const statusColor = blog.approval_status === 'published' ? 'success' : blog.approval_status === 'draft' ? 'default' : 'warning';
                return (
                  <ListItem key={blog.id} disablePadding>
                    <ListItemButton onClick={() => toggleBlog(blog.id)} dense sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Checkbox edge="start" checked={isSelected} size="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: isSelected ? 600 : 400, fontSize: 13 }}>
                              {blog.title}
                            </Typography>
                            <Chip label={blog.approval_status} size="small" color={statusColor}
                              sx={{ height: 16, fontSize: 9 }} />
                          </Box>
                        }
                        secondary={new Date(blog.created_at).toLocaleDateString('nl-NL')}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          )}
        </>
      )}
    </>
  );
}
