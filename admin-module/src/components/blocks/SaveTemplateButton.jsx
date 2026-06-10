import { useState } from 'react';
import {
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, FormControlLabel, Switch, Snackbar, Alert, Tooltip
} from '@mui/material';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import { useDestination } from './DestinationContext.jsx';
import apiClient from '../../api/client.js';

/**
 * SaveTemplateButton — saves block as reusable template via POST
 * /admin-portal/page-builder/templates.
 *
 * Modal: name + description + isGlobal toggle (platform_admin only zinvol).
 *
 * @version BLOK F6 (22-05-2026)
 */

export default function SaveTemplateButton({ block }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const { destinationId, destinationName } = useDestination();

  const handleOpen = (e) => {
    e?.stopPropagation();
    setName(`${block.type} template`);
    setDescription('');
    setIsGlobal(false);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { data } = await apiClient.post('/page-builder/templates', {
        destinationId, name, description, block, isGlobal, category: 'content'
      });
      if (data?.success) {
        setSnack({ open: true, message: `Template "${name}" opgeslagen (#${data.data.id}).`, severity: 'success' });
        setOpen(false);
      } else {
        setSnack({ open: true, message: data?.error?.message || 'Save failed', severity: 'error' });
      }
    } catch (err) {
      setSnack({ open: true, message: err?.response?.data?.error?.message || err.message, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Tooltip title="Sla op als herbruikbaar template">
        <IconButton size="small" onClick={handleOpen}>
          <BookmarkAddIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Block opslaan als template</DialogTitle>
        <DialogContent dividers>
          <TextField
            autoFocus
            fullWidth
            label="Template naam"
            value={name}
            onChange={e => setName(e.target.value)}
            helperText={`Block type: ${block.type}`}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Beschrijving (optioneel)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={<Switch checked={isGlobal} onChange={e => setIsGlobal(e.target.checked)} />}
            label={`Globaal beschikbaar (alle destinations) ${isGlobal ? '' : `— anders alleen voor ${destinationName || 'huidige destinatie'}`}`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={saving}>Annuleren</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving || !name.trim()}>
            {saving ? 'Opslaan...' : 'Template opslaan'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </>
  );
}
