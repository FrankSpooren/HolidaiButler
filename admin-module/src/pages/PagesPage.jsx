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
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import HistoryIcon from '@mui/icons-material/History';
import TranslateIcon from '@mui/icons-material/Translate';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import TabletIcon from '@mui/icons-material/Tablet';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import UploadIcon from '@mui/icons-material/Upload';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useTranslation } from 'react-i18next';
import { translateTexts } from '../api/translationService.js';
import client from '../api/client.js';
import { usePages, usePageCreate, usePageUpdate, usePageDelete } from '../hooks/usePages.js';
import { useBrandingDestinations } from '../hooks/useBrandingEditor.js';
import { pageService } from '../api/pageService.js';
import BlockEditorCard from '../components/blocks/BlockEditorCard.jsx';
import BlockSelectorDialog from '../components/blocks/BlockSelectorDialog.jsx';
import PageTemplateDialog from '../components/PageTemplateDialog.jsx';
import PageRevisionsDialog from '../components/PageRevisionsDialog.jsx';
import debounce from 'lodash.debounce';

export default function PagesPage({ embedded = false }) {
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
  const [templateOpen, setTemplateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(null);
  const [editPage, setEditPage] = useState(null);
  const [editTab, setEditTab] = useState(0);
  const [createForm, setCreateForm] = useState({ slug: '', title_en: '', title_nl: '', status: 'draft', destination_id: '', parent_id: '' });
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const [translating, setTranslating] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [previewViewport, setPreviewViewport] = useState('desktop');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [expandedParents, setExpandedParents] = useState({});
  const [revisionsPage, setRevisionsPage] = useState(null);
  const previewRef = useRef(null);

  // Build tree: group children under their parent
  const parentPages = pages.filter(p => !p.parent_id);
  const childrenByParent = {};
  pages.filter(p => p.parent_id).forEach(p => {
    if (!childrenByParent[p.parent_id]) childrenByParent[p.parent_id] = [];
    childrenByParent[p.parent_id].push(p);
  });

  const toggleParentExpand = (parentId) => {
    setExpandedParents(prev => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleCreate = async () => {
    try {
      const layout = selectedTemplate?.layout || { blocks: [] };
      await createMut.mutateAsync({
        destination_id: createForm.destination_id || destId,
        slug: createForm.slug,
        title_en: createForm.title_en,
        title_nl: createForm.title_nl || null,
        status: createForm.status,
        parent_id: createForm.parent_id || null,
        layout
      });
      setCreateOpen(false);
      setSelectedTemplate(null);
      setCreateForm({ slug: '', title_en: '', title_nl: '', status: 'draft', destination_id: '', parent_id: '' });
      setSnack({ open: true, message: t('pages.created'), severity: 'success' });
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.error?.message || err.message, severity: 'error' });
    }
  };

  const handleDuplicate = async (page) => {
    try {
      await pageService.duplicate(page.id);
      refetch();
      setSnack({ open: true, message: t('pages.duplicated', 'Page duplicated'), severity: 'success' });
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
        og_image_path: editPage.og_image_path,
        parent_id: editPage.parent_id || null,
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

  const updateBlockStyle = (idx, newStyle) => {
    if (!editPage) return;
    const blocks = [...editPage.layout.blocks];
    blocks[idx] = { ...blocks[idx], style: newStyle };
    setEditPage({ ...editPage, layout: { ...editPage.layout, blocks } });
  };

  const updateBlockVisibility = (idx, visibility) => {
    if (!editPage) return;
    const blocks = [...editPage.layout.blocks];
    blocks[idx] = { ...blocks[idx], visibility };
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

  // Live preview: send layout updates to iframe (waits for preview-ready)
  const previewReadyRef = useRef(false);

  const sendPreviewUpdate = useCallback((layout) => {
    if (previewRef.current?.contentWindow && previewReadyRef.current) {
      previewRef.current.contentWindow.postMessage({ type: 'layout-update', layout }, '*');
    }
  }, []);

  // Listen for 'preview-ready' from iframe, then send initial layout
  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type === 'preview-ready') {
        previewReadyRef.current = true;
        // Send layout immediately now that preview is ready
        if (editTab === 2 && editPage?.layout) {
          sendPreviewUpdate(editPage.layout);
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [editTab, editPage?.layout, sendPreviewUpdate]);

  // Auto-refresh live preview when tab switches to VOORBEELD
  useEffect(() => {
    if (editTab === 2 && previewRef.current) {
      // Reload iframe to show latest saved content
      const timer = setTimeout(() => {
        if (previewRef.current) {
          previewRef.current.src = previewRef.current.src;
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [editTab]);

  // Reset preview-ready when iframe src changes (new page selected)
  useEffect(() => {
    previewReadyRef.current = false;
  }, [editPage?.id]);

  const viewportWidths = { desktop: '100%', tablet: '768px', mobile: '375px' };

  // WYSIWYG live preview: real page URL (VII-E4)
  const DEV_PREVIEW_DOMAINS = {
    texel: 'https://dev.texelmaps.nl',
    warrewijzer: 'https://dev.warrewijzer.be',
    alicante: 'https://dev.alicante.holidaibutler.com',
  };
  const getPreviewUrl = () => {
    const pageDestId = editPage?.destination_id || destId;
    const dest = destinations.find(d => d.id === pageDestId || String(d.id) === String(pageDestId));
    if (!dest || dest.code === 'calpe' || String(pageDestId) === '1') return null;
    const baseDomain = DEV_PREVIEW_DOMAINS[dest.code];
    if (!baseDomain) return null;
    const slug = editPage?.slug === 'home' ? '' : (editPage?.slug || '');
    return `${baseDomain}/${slug}`;
  };

  if (isLoading) {
    return (
      <Box sx={{ p: embedded ? 0 : 3 }}>
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="rounded" height={400} sx={{ mt: 2 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: embedded ? 0 : 3, pt: embedded ? 2 : 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        {!embedded ? (
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{t('pages.title')}</Typography>
            <Typography variant="body2" color="text.secondary">{t('pages.subtitle')}</Typography>
          </Box>
        ) : <Box />}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>{t('pages.destination')}</InputLabel>
            <Select value={destFilter} label={t('pages.destination')} onChange={e => setDestFilter(e.target.value)}>
              {destinations.map(d => <MenuItem key={d.id} value={d.id}>{d.displayName}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setCreateForm(f => ({ ...f, destination_id: destId })); setTemplateOpen(true); }}>
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
                parentPages.map(page => {
                  const children = childrenByParent[page.id] || [];
                  const hasChildren = children.length > 0;
                  const isExpanded = expandedParents[page.id];

                  const renderRow = (p, isChild = false) => (
                    <TableRow key={p.id} hover sx={isChild ? { bgcolor: 'action.hover' } : undefined}>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {isChild ? (
                            <SubdirectoryArrowRightIcon sx={{ fontSize: 16, color: 'text.disabled', ml: 1 }} />
                          ) : hasChildren ? (
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleParentExpand(p.id); }} sx={{ p: 0.25 }}>
                              {isExpanded ? <ExpandMoreIcon sx={{ fontSize: 18 }} /> : <ChevronRightIcon sx={{ fontSize: 18 }} />}
                            </IconButton>
                          ) : (
                            <Box sx={{ width: 22 }} />
                          )}
                          /{p.slug}
                          {hasChildren && !isChild && (
                            <Chip size="small" label={children.length} sx={{ height: 18, fontSize: '0.65rem', ml: 0.5 }} />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{p.title_en || '\u2014'}</TableCell>
                      <TableCell>{p.destination_name || p.destination_code}</TableCell>
                      <TableCell align="center">{p.block_count ?? '\u2014'}</TableCell>
                      <TableCell align="center">{p.sort_order}</TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={p.status}
                          color={p.status === 'published' ? 'success' : 'default'}
                          onClick={() => toggleStatus(p)}
                          sx={{ cursor: 'pointer' }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title={t('common.edit')}>
                          <IconButton size="small" onClick={() => openEdit(p)} disabled={editLoading}><EditIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title={t('pages.duplicate', 'Duplicate')}>
                          <IconButton size="small" onClick={() => handleDuplicate(p)}><ContentCopyIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title="Revision History">
                          <IconButton size="small" onClick={() => setRevisionsPage(p)}><HistoryIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title={t('pages.delete')}>
                          <IconButton size="small" color="error" onClick={() => setDeleteOpen(p)}><DeleteIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );

                  return [
                    renderRow(page),
                    ...(hasChildren && isExpanded ? children.map(child => renderRow(child, true)) : [])
                  ];
                }).flat()
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Template Selector Dialog */}
      <PageTemplateDialog
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        onSelect={(tmpl) => {
          setSelectedTemplate(tmpl);
          setTemplateOpen(false);
          setCreateOpen(true);
        }}
      />

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {t('pages.createTitle')}
          {selectedTemplate && (
            <Chip size="small" label={selectedTemplate.label} sx={{ ml: 1 }} />
          )}
        </DialogTitle>
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
            <InputLabel>{t('pages.parentPage', 'Parent Page')}</InputLabel>
            <Select
              value={createForm.parent_id || ''}
              label={t('pages.parentPage', 'Parent Page')}
              onChange={e => setCreateForm(f => ({ ...f, parent_id: e.target.value }))}
            >
              <MenuItem value="">{t('pages.noParent', 'None (top-level)')}</MenuItem>
              {pages.filter(p => !p.parent_id).map(p => (
                <MenuItem key={p.id} value={p.id}>/{p.slug} — {p.title_en}</MenuItem>
              ))}
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
          <Button onClick={() => { setCreateOpen(false); setSelectedTemplate(null); }}>{t('common.cancel')}</Button>
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
              <TextField size="small" label={t('pages.fields.ogImageUrl')} value={editPage.og_image_url || ''} onChange={e => setEditPage(p => ({ ...p, og_image_url: e.target.value }))} placeholder="URL or upload below" />
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary' }}>OG Image Upload</Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  {(editPage.og_image_path || editPage.og_image_url) && (
                    <Box component="img" src={editPage.og_image_path || editPage.og_image_url} alt="OG" sx={{ height: 60, maxWidth: 120, borderRadius: 1, border: '1px solid', borderColor: 'divider' }} />
                  )}
                  <Button variant="outlined" component="label" size="small" startIcon={<UploadIcon />}>
                    {t('pages.uploadOgImage', 'Upload OG Image')}
                    <input type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('image', file);
                      try {
                        const { data } = await client.post('/blocks/upload-image', formData, {
                          headers: { 'Content-Type': 'multipart/form-data' }
                        });
                        if (data.success) {
                          setEditPage(p => ({ ...p, og_image_path: data.data.url }));
                          setSnack({ open: true, message: t('pages.ogImageUploaded'), severity: 'success' });
                        }
                      } catch (err) {
                        setSnack({ open: true, message: err.message, severity: 'error' });
                      }
                    }} />
                  </Button>
                </Box>
              </Box>
              <FormControl size="small">
                <InputLabel>{t('pages.parentPage', 'Parent Page')}</InputLabel>
                <Select
                  value={editPage.parent_id || ''}
                  label={t('pages.parentPage', 'Parent Page')}
                  onChange={e => setEditPage(p => ({ ...p, parent_id: e.target.value || null }))}
                >
                  <MenuItem value="">{t('pages.noParent', 'None (top-level)')}</MenuItem>
                  {pages.filter(p => p.id !== editPage.id && !p.parent_id).map(p => (
                    <MenuItem key={p.id} value={p.id}>/{p.slug} — {p.title_en}</MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                      onStyleChange={newStyle => updateBlockStyle(idx, newStyle)}
                      onVisibilityChange={vis => updateBlockVisibility(idx, vis)}
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
                <Box sx={{ width: viewportWidths[previewViewport], maxWidth: '100%', transition: 'width 0.3s', border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', bgcolor: 'action.hover' }}>
                  {getPreviewUrl() ? (
                    <iframe
                      ref={previewRef}
                      src={getPreviewUrl()}
                      style={{ width: '100%', height: 600, border: 'none' }}
                      title="Page Preview"
                    />
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: 'text.secondary' }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Preview niet beschikbaar</Typography>
                        <Typography variant="body2">Deze bestemming gebruikt een standalone portal en geen Page Builder preview.</Typography>
                      </Box>
                    </Box>
                  )}
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
        currentBlocks={editPage?.layout?.blocks || []}
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

      {/* Revision History Dialog */}
      <PageRevisionsDialog
        open={!!revisionsPage}
        onClose={() => setRevisionsPage(null)}
        pageId={revisionsPage?.id}
        pageSlug={revisionsPage?.slug}
        onRestored={() => {
          refetch();
          setSnack({ open: true, message: 'Revision restored', severity: 'success' });
        }}
      />

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
