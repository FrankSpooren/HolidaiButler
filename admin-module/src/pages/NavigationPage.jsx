import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert,
  Snackbar, Chip, Switch, Tabs, Tab, FormControl, InputLabel, Select, MenuItem, Skeleton, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import SaveIcon from '@mui/icons-material/Save';
import TranslateIcon from '@mui/icons-material/Translate';
import { useTranslation } from 'react-i18next';
import { useNavigationDestinations, useNavigationUpdate } from '../hooks/useNavigation.js';
import { translateTexts } from '../api/translationService.js';

const EMPTY_ITEM = { label: { nl: '', en: '', de: '', es: '' }, href: '', featureFlag: '', sortOrder: 0, isActive: true };

export default function NavigationPage() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useNavigationDestinations();
  const updateMut = useNavigationUpdate();
  const [activeTab, setActiveTab] = useState(0);
  const [navItems, setNavItems] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editIdx, setEditIdx] = useState(-1);
  const [editForm, setEditForm] = useState(EMPTY_ITEM);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const [translating, setTranslating] = useState(false);

  const destinations = data?.data?.destinations?.filter(d => d.isActive) || [];
  const activeDest = destinations[activeTab];

  // Load nav_items from destination config
  useEffect(() => {
    if (activeDest) {
      const config = activeDest.config || {};
      const items = Array.isArray(config.nav_items) ? config.nav_items : [];
      setNavItems(items.map((item, i) => ({
        label: typeof item.label === 'object' ? item.label : { en: item.label || '', nl: '', de: '', es: '' },
        href: item.href || '',
        featureFlag: item.featureFlag || '',
        sortOrder: item.sortOrder ?? i,
        isActive: item.isActive !== false
      })));
    }
  }, [activeDest?.id]);

  const handleSave = async () => {
    if (!activeDest) return;
    try {
      const sorted = [...navItems].sort((a, b) => a.sortOrder - b.sortOrder);
      await updateMut.mutateAsync({ destinationId: activeDest.id, navItems: sorted });
      setSnack({ open: true, message: t('navigation.saved'), severity: 'success' });
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.error?.message || err.message, severity: 'error' });
    }
  };

  const openCreateDialog = () => {
    setEditIdx(-1);
    setEditForm({ ...EMPTY_ITEM, label: { nl: '', en: '', de: '', es: '' }, sortOrder: navItems.length });
    setEditOpen(true);
  };

  const openEditDialog = (idx) => {
    setEditIdx(idx);
    setEditForm({ ...navItems[idx], label: { ...navItems[idx].label } });
    setEditOpen(true);
  };

  const handleEditSave = () => {
    if (editIdx === -1) {
      setNavItems([...navItems, editForm]);
    } else {
      const updated = [...navItems];
      updated[editIdx] = editForm;
      setNavItems(updated);
    }
    setEditOpen(false);
  };

  const removeItem = (idx) => {
    setNavItems(navItems.filter((_, i) => i !== idx));
  };

  const moveItem = (idx, dir) => {
    const items = [...navItems];
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    [items[idx], items[target]] = [items[target], items[idx]];
    // Update sortOrder
    items.forEach((item, i) => { item.sortOrder = i; });
    setNavItems(items);
  };

  const toggleActive = (idx) => {
    const updated = [...navItems];
    updated[idx] = { ...updated[idx], isActive: !updated[idx].isActive };
    setNavItems(updated);
  };

  const handleTranslateLabel = async () => {
    if (!editForm.label?.en) return;
    setTranslating(true);
    try {
      const translations = await translateTexts([{ key: 'label', value: editForm.label.en }], 'en', ['nl', 'de', 'es']);
      setEditForm(f => ({
        ...f,
        label: {
          ...f.label,
          nl: translations.label?.nl || f.label.nl,
          de: translations.label?.de || f.label.de,
          es: translations.label?.es || f.label.es,
        }
      }));
      setSnack({ open: true, message: t('translate.success'), severity: 'success' });
    } catch {
      setSnack({ open: true, message: t('translate.error'), severity: 'error' });
    } finally {
      setTranslating(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="rounded" height={300} sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={<Button onClick={refetch}>{t('common.retry')}</Button>}>
          {t('common.error')}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>{t('navigation.title')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('navigation.subtitle')}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={openCreateDialog}>
            {t('navigation.addItem')}
          </Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={updateMut.isPending}>
            {updateMut.isPending ? t('navigation.saving') : t('navigation.save')}
          </Button>
        </Box>
      </Box>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        {destinations.map((d, i) => (
          <Tab key={d.id} label={d.displayName} value={i} />
        ))}
      </Tabs>

      <Card sx={{ mb: 3 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 60 }}>#</TableCell>
                <TableCell>{t('navigation.table.labelEn')}</TableCell>
                <TableCell>{t('navigation.table.labelNl')}</TableCell>
                <TableCell>{t('navigation.table.href')}</TableCell>
                <TableCell>{t('navigation.table.featureFlag')}</TableCell>
                <TableCell align="center">{t('navigation.table.active')}</TableCell>
                <TableCell align="right">{t('navigation.table.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {navItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {t('navigation.noItems')}
                  </TableCell>
                </TableRow>
              ) : (
                navItems.map((item, idx) => (
                  <TableRow key={idx} hover sx={{ opacity: item.isActive ? 1 : 0.5 }}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{item.label?.en || '—'}</TableCell>
                    <TableCell>{item.label?.nl || '—'}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{item.href}</TableCell>
                    <TableCell>
                      {item.featureFlag ? <Chip size="small" label={item.featureFlag} variant="outlined" /> : '—'}
                    </TableCell>
                    <TableCell align="center">
                      <Switch size="small" checked={item.isActive} onChange={() => toggleActive(idx)} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => moveItem(idx, -1)} disabled={idx === 0}>
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => moveItem(idx, 1)} disabled={idx === navItems.length - 1}>
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                      <Tooltip title={t('common.edit')}>
                        <IconButton size="small" onClick={() => openEditDialog(idx)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title={t('navigation.removeItem')}>
                        <IconButton size="small" color="error" onClick={() => removeItem(idx)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Preview */}
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary' }}>
          {t('navigation.preview')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 2, bgcolor: '#fafafa', borderRadius: 1 }}>
          <Typography sx={{ fontWeight: 700, color: activeDest?.branding?.colors?.primary || '#333' }}>
            {activeDest?.displayName}
          </Typography>
          {navItems.filter(i => i.isActive).map((item, idx) => (
            <Typography key={idx} sx={{ fontSize: '0.875rem', color: '#555', cursor: 'pointer', '&:hover': { color: '#000' } }}>
              {item.label?.en || item.label?.nl || item.href}
            </Typography>
          ))}
        </Box>
      </Card>

      {/* Create/Edit dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editIdx === -1 ? t('navigation.addTitle') : t('navigation.editTitle')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <Typography variant="subtitle2" color="text.secondary">{t('navigation.labelsPerLang')}</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField size="small" label="EN" value={editForm.label?.en || ''} onChange={e => setEditForm(f => ({ ...f, label: { ...f.label, en: e.target.value } }))} sx={{ flex: 1 }} />
            <TextField size="small" label="NL" value={editForm.label?.nl || ''} onChange={e => setEditForm(f => ({ ...f, label: { ...f.label, nl: e.target.value } }))} sx={{ flex: 1 }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField size="small" label="DE" value={editForm.label?.de || ''} onChange={e => setEditForm(f => ({ ...f, label: { ...f.label, de: e.target.value } }))} sx={{ flex: 1 }} />
            <TextField size="small" label="ES" value={editForm.label?.es || ''} onChange={e => setEditForm(f => ({ ...f, label: { ...f.label, es: e.target.value } }))} sx={{ flex: 1 }} />
          </Box>
          <Button
            size="small" variant="outlined" startIcon={<TranslateIcon />}
            onClick={handleTranslateLabel} disabled={translating || !editForm.label?.en}
          >
            {translating ? t('translate.translating') : t('translate.autoTranslate')}
          </Button>
          <TextField
            size="small"
            label={t('navigation.fields.href')}
            value={editForm.href}
            onChange={e => setEditForm(f => ({ ...f, href: e.target.value }))}
            placeholder="/explore, /events, /about"
          />
          <TextField
            size="small"
            label={t('navigation.fields.featureFlag')}
            value={editForm.featureFlag}
            onChange={e => setEditForm(f => ({ ...f, featureFlag: e.target.value }))}
            placeholder="agenda, ticketing (optional)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleEditSave} disabled={!editForm.href || !editForm.label?.en}>
            {editIdx === -1 ? t('navigation.addItem') : t('navigation.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
