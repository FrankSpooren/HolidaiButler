import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box, Typography, Card, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert,
  Snackbar, Chip, Tabs, Tab, Select, MenuItem, FormControl, InputLabel, Skeleton, Tooltip,
  ToggleButtonGroup, ToggleButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TranslateIcon from '@mui/icons-material/Translate';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import TabletIcon from '@mui/icons-material/Tablet';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useTranslation } from 'react-i18next';
import { translateTexts } from '../api/translationService.js';
import { usePages, usePageCreate, usePageUpdate, usePageDelete } from '../hooks/usePages.js';
import { useBrandingDestinations } from '../hooks/useBrandingEditor.js';
import { pageService } from '../api/pageService.js';
import BlockEditorCard from '../components/blocks/BlockEditorCard.jsx';
import BlockSelectorDialog from '../components/blocks/BlockSelectorDialog.jsx';
import debounce from 'lodash.debounce';

const TEMPLATES = {
  empty: { blocks: [] },
  homepage: {
    blocks: [
      { id: 'hero-1', type: 'hero', props: { headline: '', description: '', buttons: [] } },
      { id: 'poi-grid-1', type: 'poi_grid', props: { limit: 6, columns: 3 } },
      { id: 'event-cal-1', type: 'event_calendar', props: { limit: 4, layout: 'grid' } }
    ]
  },
  content: {
    blocks: [
      { id: 'hero-1', type: 'hero', props: { headline: '', description: '' } },
      { id: 'rich-text-1', type: 'rich_text', props: { content: '' } }
    ]
  }
};

export default function PagesPage() {
  const { t } = useTranslation();
  const { data: destData } = useBrandingDestinations();
  const destinations = destData?.data?.destinations?.filter(d => d.isActive) || [];
  const [destFilter, setDestFilter] = useState('');
  const destId = destFilter || (destinations[0]?.id) || '';
  const { data, isLoading, error, refetch } = usePages(destId);
  const createMut = usePageCreate();
  const updateMut = usePageUpdate();
  const deleteMut = usePageDelete();

  const pages = data?.data?.pages || [];

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(null);
  const [editPage, setEditPage] = useState(null);
  const [editTab, setEditTab] = useState(0);
  const [createForm, setCreateForm] = useState({ slug: '', title_en: '', title_nl: '', status: 'draft', template: 'empty', destination_id: '' });
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const [translating, setTranslating] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [previewViewport, setPreviewViewport] = useState('desktop');
  const previewRef = useRef(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleCreate = async () => {
    try {
      const layout = TEMPLATES[createForm.template] || TEMPLATES.empty;
      await createMut.mutateAsync({
        destination_id: createForm.destination_id || destId,
        slug: createForm.slug,
        title_en: createForm.title_en,
        title_nl: createForm.title_nl || null,
        status: createForm.status,
        layout
      });
      setCreateOpen(false);
      setCreateForm({ slug: '', title_en: '', title_nl: '', status: 'draft', template: 'empty', destination_id: '' });
      setSnack({ open: true, message: t('pages.created'), severity: 'success' });
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.error?.message || err.message, severity: 'error' });
    }
  };

  const [editLoading, setEditLoading] = useState(false);

  const openEdit = async (page) => {
    setEditLoading(true);
    try {
      const res = await pageService.get(page.id);
      const fullPage = res.data;
      let layout = fullPage.layout;
      if (typeof layout === 'string') {
        try { layout = JSON.parse(layout); } catch { layout = { blocks: [] }; }
      }
      setEditPage({ ...fullPage, layout: layout || { blocks: [] } });
      setEditTab(0);
      setEditOpen(true);
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.error?.message || err.message, severity: 'error' });
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editPage) return;
    try {
      const payload = {
        title_nl: editPage.title_nl,
        title_en: editPage.title_en,
        title_de: editPage.title_de,
        title_es: editPage.title_es,
        slug: editPage.slug,
        seo_title_en: editPage.seo_title_en,
        seo_title_nl: editPage.seo_title_nl,
        seo_description_en: editPage.seo_description_en,
        seo_description_nl: editPage.seo_description_nl,
        og_image_url: editPage.og_image_url,
        status: editPage.status,
        layout: editPage.layout
      };
      await updateMut.mutateAsync({ id: editPage.id, data: payload });
      setEditOpen(false);
      setSnack({ open: true, message: t('pages.saved'), severity: 'success' });
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.error?.message || err.message, severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteOpen) return;
    try {
      await deleteMut.mutateAsync(deleteOpen.id);
      setDeleteOpen(null);
      setSnack({ open: true, message: t('pages.deleted'), severity: 'success' });
    } catch (err) {
      setSnack({ open: true, message: err.message, severity: 'error' });
    }
  };

  const toggleStatus = async (page) => {
    const newStatus = page.status === 'published' ? 'draft' : 'published';
    try {
      await updateMut.mutateAsync({ id: page.id, data: { status: newStatus } });
      setSnack({ open: true, message: t('pages.statusUpdated'), severity: 'success' });
    } catch (err) {
      setSnack({ open: true, message: err.message, severity: 'error' });
    }
  };

  const handleAutoTranslate = async () => {
    if (!editPage?.title_en) return;
    setTranslating(true);
    try {
      const texts = [{ key: 'title', value: editPage.title_en }];
      if (editPage.seo_title_en) texts.push({ key: 'seoTitle', value: editPage.seo_title_en });
      if (editPage.seo_description_en) texts.push({ key: 'seoDescription', value: editPage.seo_description_en });
      const translations = await translateTexts(texts, 'en', ['nl', 'de', 'es']);
      setEditPage(p => ({
        ...p,
        title_nl: translations.title?.nl || p.title_nl,
        title_de: translations.title?.de || p.title_de,
        title_es: translations.title?.es || p.title_es,
        seo_title_nl: translations.seoTitle?.nl || p.seo_title_nl,
        seo_description_nl: translations.seoDescription?.nl || p.seo_description_nl,
      }));
      setSnack({ open: true, message: t('translate.success'), severity: 'success' });
    } catch {
      setSnack({ open: true, message: t('translate.error'), severity: 'error' });
    } finally {
      setTranslating(false);
    }
  };

  // Block editing helpers
  const addBlockOfType = (type) => {
    if (!editPage) return;
    const blocks = [...(editPage.layout?.blocks || [])];
    const id = `block-${Date.now()}`;
    blocks.push({ id, type, props: {} });
    setEditPage({ ...editPage, layout: { ...editPage.layout, blocks } });
  };

  const removeBlock = (idx) => {
    if (!editPage) return;
    const blocks = editPage.layout.blocks.filter((_, i) => i !== idx);
    setEditPage({ ...editPage, layout: { ...editPage.layout, blocks } });
  };

  const duplicateBlock = (idx) => {
    if (!editPage) return;
    const blocks = [...editPage.layout.blocks];
    const source = blocks[idx];
    const copy = { ...source, id: `block-${Date.now()}`, props: { ...source.props } };
    blocks.splice(idx + 1, 0, copy);
    setEditPage({ ...editPage, layout: { ...editPage.layout, blocks } });
  };

  const updateBlockProps = (idx, newProps) => {
    if (!editPage) return;
    const blocks = [...editPage.layout.blocks];
    blocks[idx] = { ...blocks[idx], props: newProps };
    setEditPage({ ...editPage, layout: { ...editPage.layout, blocks } });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !editPage) return;
    const blocks = editPage.layout.blocks;
    const oldIndex = blocks.findIndex(b => b.id === active.id);
    const newIndex = blocks.findIndex(b => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(blocks, oldIndex, newIndex);
    setEditPage({ ...editPage, layout: { ...editPage.layout, blocks: reordered } });
  };

  // Live preview: send layout updates to iframe
  const sendPreviewUpdate = useCallback(
    debounce((layout) => {
      if (previewRef.current?.contentWindow) {
        previewRef.current.contentWindow.postMessage({ type: 'layout-update', layout }, '*');
      }
    }, 300),
    []
  );

  useEffect(() => {
    if (editTab === 2 && editPage?.layout) {
      sendPreviewUpdate(editPage.layout);
    }
  }, [editPage?.layout, editTab, sendPreviewUpdate]);

  const viewportWidths = { desktop: '100%', tablet: '768px', mobile: '375px' };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="rounded" height={400} sx={{ mt: 2 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>{t('pages.title')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('pages.subtitle')}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>{t('pages.destination')}</InputLabel>
            <Select value={destFilter} label={t('pages.destination')} onChange={e => setDestFilter(e.target.value)}>
              {destinations.map(d => <MenuItem key={d.id} value={d.id}>{d.displayName}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setCreateForm(f => ({ ...f, destination_id: destId })); setCreateOpen(true); }}>
            {t('pages.create')}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Button onClick={refetch}>{t('common.retry')}</Button>}>
          {t('common.error')}
        </Alert>
      )}

      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('pages.table.slug')}</TableCell>
                <TableCell>{t('pages.table.titleEn')}</TableCell>
                <TableCell>{t('pages.table.destination')}</TableCell>
                <TableCell align="center">{t('pages.table.blocks')}</TableCell>
                <TableCell align="center">{t('pages.table.sortOrder')}</TableCell>
                <TableCell align="center">{t('pages.table.status')}</TableCell>
                <TableCell align="right">{t('pages.table.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {t('pages.noResults')}
                  </TableCell>
                </TableRow>
              ) : (
                pages.map(page => (
                  <TableRow key={page.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>/{page.slug}</TableCell>
                    <TableCell>{page.title_en || '\u2014'}</TableCell>
                    <TableCell>{page.destination_name || page.destination_code}</TableCell>
                    <TableCell align="center">{page.block_count ?? '\u2014'}</TableCell>
                    <TableCell align="center">{page.sort_order}</TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={page.status}
                        color={page.status === 'published' ? 'success' : 'default'}
                        onClick={() => toggleStatus(page)}
                        sx={{ cursor: 'pointer' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={t('common.edit')}>
                        <IconButton size="small" onClick={() => openEdit(page)} disabled={editLoading}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title={t('pages.delete')}>
                        <IconButton size="small" color="error" onClick={() => setDeleteOpen(page)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('pages.createTitle')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <FormControl size="small" fullWidth>
            <InputLabel>{t('pages.destination')}</InputLabel>
            <Select value={createForm.destination_id || destId} label={t('pages.destination')} onChange={e => setCreateForm(f => ({ ...f, destination_id: e.target.value }))}>
              {destinations.map(d => <MenuItem key={d.id} value={d.id}>{d.displayName}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label={t('pages.fields.slug')} value={createForm.slug} onChange={e => setCreateForm(f => ({ ...f, slug: e.target.value }))} placeholder="e.g. about, tickets, faq" />
          <TextField size="small" label={t('pages.fields.titleEn')} value={createForm.title_en} onChange={e => setCreateForm(f => ({ ...f, title_en: e.target.value }))} />
          <TextField size="small" label={t('pages.fields.titleNl')} value={createForm.title_nl} onChange={e => setCreateForm(f => ({ ...f, title_nl: e.target.value }))} />
          <FormControl size="small" fullWidth>
            <InputLabel>{t('pages.fields.template')}</InputLabel>
            <Select value={createForm.template} label={t('pages.fields.template')} onChange={e => setCreateForm(f => ({ ...f, template: e.target.value }))}>
              <MenuItem value="empty">{t('pages.templates.empty')}</MenuItem>
              <MenuItem value="homepage">{t('pages.templates.homepage')}</MenuItem>
              <MenuItem value="content">{t('pages.templates.content')}</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>{t('pages.fields.status')}</InputLabel>
            <Select value={createForm.status} label={t('pages.fields.status')} onChange={e => setCreateForm(f => ({ ...f, status: e.target.value }))}>
              <MenuItem value="draft">{t('pages.status.draft')}</MenuItem>
              <MenuItem value="published">{t('pages.status.published')}</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!createForm.slug || !createForm.title_en || createMut.isPending}>
            {createMut.isPending ? t('pages.creating') : t('pages.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit dialog (fullscreen-like) */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {t('pages.editTitle')}: /{editPage?.slug}
        </DialogTitle>
        <DialogContent>
          <Tabs value={editTab} onChange={(_, v) => setEditTab(v)} sx={{ mb: 2 }}>
            <Tab label={t('pages.tabs.basics')} />
            <Tab label={t('pages.tabs.blocks')} />
            <Tab label={t('pages.tabs.preview')} />
          </Tabs>

          {editTab === 0 && editPage && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField size="small" label={t('pages.fields.slug')} value={editPage.slug || ''} onChange={e => setEditPage(p => ({ ...p, slug: e.target.value }))} />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField size="small" label={t('pages.fields.titleEn')} value={editPage.title_en || ''} onChange={e => setEditPage(p => ({ ...p, title_en: e.target.value }))} sx={{ flex: 1 }} />
                <TextField size="small" label={t('pages.fields.titleNl')} value={editPage.title_nl || ''} onChange={e => setEditPage(p => ({ ...p, title_nl: e.target.value }))} sx={{ flex: 1 }} />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField size="small" label={t('pages.fields.titleDe')} value={editPage.title_de || ''} onChange={e => setEditPage(p => ({ ...p, title_de: e.target.value }))} sx={{ flex: 1 }} />
                <TextField size="small" label={t('pages.fields.titleEs')} value={editPage.title_es || ''} onChange={e => setEditPage(p => ({ ...p, title_es: e.target.value }))} sx={{ flex: 1 }} />
              </Box>
              <Button
                size="small" variant="outlined" startIcon={<TranslateIcon />}
                onClick={handleAutoTranslate} disabled={translating || !editPage.title_en}
                sx={{ alignSelf: 'flex-start' }}
              >
                {translating ? t('translate.translating') : t('translate.autoTranslate')}
              </Button>
              <TextField size="small" label={t('pages.fields.seoTitleEn')} value={editPage.seo_title_en || ''} onChange={e => setEditPage(p => ({ ...p, seo_title_en: e.target.value }))} />
              <TextField size="small" label={t('pages.fields.seoDescriptionEn')} value={editPage.seo_description_en || ''} onChange={e => setEditPage(p => ({ ...p, seo_description_en: e.target.value }))} multiline rows={2} />
              <TextField size="small" label={t('pages.fields.ogImageUrl')} value={editPage.og_image_url || ''} onChange={e => setEditPage(p => ({ ...p, og_image_url: e.target.value }))} />
              <FormControl size="small">
                <InputLabel>{t('pages.fields.status')}</InputLabel>
                <Select value={editPage.status || 'draft'} label={t('pages.fields.status')} onChange={e => setEditPage(p => ({ ...p, status: e.target.value }))}>
                  <MenuItem value="draft">{t('pages.status.draft')}</MenuItem>
                  <MenuItem value="published">{t('pages.status.published')}</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}

          {editTab === 1 && editPage && (
            <Box>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={(editPage.layout?.blocks || []).map(b => b.id)} strategy={verticalListSortingStrategy}>
                  {(editPage.layout?.blocks || []).map((block, idx) => (
                    <BlockEditorCard
                      key={block.id}
                      block={block}
                      index={idx}
                      onUpdate={newProps => updateBlockProps(idx, newProps)}
                      onRemove={() => removeBlock(idx)}
                      onDuplicate={() => duplicateBlock(idx)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setSelectorOpen(true)} sx={{ mt: 1 }}>
                {t('pages.addBlock', 'Add Block')}
              </Button>
            </Box>
          )}

          {editTab === 2 && editPage && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <ToggleButtonGroup value={previewViewport} exclusive onChange={(_, v) => v && setPreviewViewport(v)} size="small">
                  <ToggleButton value="desktop"><DesktopWindowsIcon fontSize="small" sx={{ mr: 0.5 }} /> Desktop</ToggleButton>
                  <ToggleButton value="tablet"><TabletIcon fontSize="small" sx={{ mr: 0.5 }} /> Tablet</ToggleButton>
                  <ToggleButton value="mobile"><PhoneIphoneIcon fontSize="small" sx={{ mr: 0.5 }} /> Mobile</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Box sx={{ width: viewportWidths[previewViewport], maxWidth: '100%', transition: 'width 0.3s', border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', bgcolor: '#f5f5f5' }}>
                  <iframe
                    ref={previewRef}
                    src={`https://dev.holidaibutler.com/preview`}
                    style={{ width: '100%', height: 600, border: 'none' }}
                    title="Page Preview"
                  />
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleEditSave} disabled={updateMut.isPending}>
            {updateMut.isPending ? t('pages.saving') : t('pages.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Block Selector Dialog */}
      <BlockSelectorDialog
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={addBlockOfType}
      />

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteOpen} onClose={() => setDeleteOpen(null)}>
        <DialogTitle>{t('pages.deleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography>{t('pages.deleteConfirm', { slug: deleteOpen?.slug })}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(null)}>{t('common.cancel')}</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleteMut.isPending}>
            {deleteMut.isPending ? t('pages.deleting') : t('pages.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
