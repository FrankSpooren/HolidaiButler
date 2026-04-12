import { useState, useMemo, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Button,
  IconButton, Slider, Tabs, Tab, ToggleButtonGroup, ToggleButton, TextField,
  CircularProgress, Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CropIcon from '@mui/icons-material/Crop';
import PhotoSizeSelectLargeIcon from '@mui/icons-material/PhotoSizeSelectLarge';
import TuneIcon from '@mui/icons-material/Tune';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import UndoIcon from '@mui/icons-material/Undo';
import SaveIcon from '@mui/icons-material/Save';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import FlipIcon from '@mui/icons-material/Flip';
import FilterIcon from '@mui/icons-material/Filter';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client.js';

// Instagram-style filters — CSS preview values + Sharp server-side operations
const IMAGE_FILTERS = [
  { id: 'none', label: 'Origineel', css: '', ops: [] },
  { id: 'clarendon', label: 'Clarendon', css: 'contrast(1.2) saturate(1.35)', ops: [{ type: 'adjust', contrast: 1.2, saturation: 1.35, brightness: 1 }] },
  { id: 'gingham', label: 'Gingham', css: 'brightness(1.05) sepia(0.04) saturate(0.85)', ops: [{ type: 'adjust', brightness: 1.05, saturation: 0.85 }] },
  { id: 'moon', label: 'Moon', css: 'grayscale(1) contrast(1.1) brightness(1.1)', ops: [{ type: 'adjust', brightness: 1.1, contrast: 1.1, saturation: 0 }] },
  { id: 'lark', label: 'Lark', css: 'contrast(0.9) brightness(1.15) saturate(0.85)', ops: [{ type: 'adjust', brightness: 1.15, contrast: 0.9, saturation: 0.85 }] },
  { id: 'reyes', label: 'Reyes', css: 'sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)', ops: [{ type: 'adjust', brightness: 1.1, contrast: 0.85, saturation: 0.75 }] },
  { id: 'juno', label: 'Juno', css: 'saturate(1.4) contrast(1.15) brightness(1.05) sepia(0.05)', ops: [{ type: 'adjust', saturation: 1.4, contrast: 1.15, brightness: 1.05 }] },
  { id: 'slumber', label: 'Slumber', css: 'saturate(0.66) brightness(1.05) sepia(0.08)', ops: [{ type: 'adjust', saturation: 0.66, brightness: 1.05 }] },
  { id: 'crema', label: 'Crema', css: 'saturate(0.9) contrast(0.95) brightness(1.08) sepia(0.06)', ops: [{ type: 'adjust', saturation: 0.9, contrast: 0.95, brightness: 1.08 }] },
  { id: 'ludwig', label: 'Ludwig', css: 'saturate(0.85) contrast(1.15) brightness(1.05)', ops: [{ type: 'adjust', saturation: 0.85, contrast: 1.15, brightness: 1.05 }] },
  { id: 'aden', label: 'Aden', css: 'saturate(0.8) brightness(1.2) contrast(0.9) sepia(0.1)', ops: [{ type: 'adjust', saturation: 0.8, brightness: 1.2, contrast: 0.9 }] },
  { id: 'perpetua', label: 'Perpetua', css: 'saturate(1.1) brightness(1.1)', ops: [{ type: 'adjust', saturation: 1.1, brightness: 1.1 }] },
];

const SOCIAL_PRESETS = [
  { label: 'FB Post', icon: '📘', width: 1200, height: 630 },
  { label: 'FB Cover', icon: '📘', width: 820, height: 312 },
  { label: 'IG Post', icon: '📸', width: 1080, height: 1080 },
  { label: 'IG Story', icon: '📸', width: 1080, height: 1920 },
  { label: 'TikTok', icon: '🎵', width: 1080, height: 1920 },
  { label: 'Snapchat', icon: '👻', width: 1080, height: 1920 },
  { label: 'Pinterest', icon: '📌', width: 1000, height: 1500 },
  { label: 'LinkedIn', icon: '💼', width: 1200, height: 627 },
  { label: 'X/Twitter', icon: '🐦', width: 1200, height: 675 },
];

const ASPECT_PRESETS = [
  { label: 'Vrij', value: null },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4/3 },
  { label: '16:9', value: 16/9 },
  { label: '9:16', value: 9/16 },
];

export default function MediaImageEditor({ open, media, destId, apiBase, onClose, onSaved }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);
  const [operations, setOperations] = useState([]);
  const [versionDesc, setVersionDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const [activeFilter, setActiveFilter] = useState('none');

  // Adjust state
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [saturation, setSaturation] = useState(1);

  // Resize state
  const [resizeWidth, setResizeWidth] = useState(media?.width || '');
  const [resizeHeight, setResizeHeight] = useState(media?.height || '');
  const [lockAspect, setLockAspect] = useState(true);
  const aspectRatio = media?.width && media?.height ? media.width / media.height : 1;

  const imgUrl = media ? `${apiBase || ''}/media-files/${media.destination_id}/${media.filename}` : '';

  // CSS filter preview (client-side, instant feedback)
  const filterObj = IMAGE_FILTERS.find(f => f.id === activeFilter) || IMAGE_FILTERS[0];
  const previewStyle = useMemo(() => {
    const adjustFilter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;
    const instagramFilter = filterObj.css || '';
    // Combine: if an Instagram filter is active, use it; otherwise use manual sliders
    const combinedFilter = activeFilter !== 'none' ? instagramFilter : adjustFilter;
    return {
      filter: combinedFilter,
      transform: operations.filter(o => o.type === 'rotate').reduce((t, o) => t + ` rotate(${o.angle}deg)`, '')
        + (operations.some(o => o.type === 'flip') ? ' scaleY(-1)' : '')
        + (operations.some(o => o.type === 'flop') ? ' scaleX(-1)' : ''),
    };
  }, [brightness, contrast, saturation, operations, activeFilter, filterObj]);

  const addOp = useCallback((op) => {
    setOperations(prev => [...prev, op]);
  }, []);

  const hasChanges = operations.length > 0 || brightness !== 1 || contrast !== 1 || saturation !== 1 || activeFilter !== 'none';

  const undo = useCallback(() => {
    if (operations.length > 0) {
      setOperations(prev => prev.slice(0, -1));
    } else if (activeFilter !== 'none') {
      setActiveFilter('none');
    } else {
      setBrightness(1); setContrast(1); setSaturation(1);
    }
  }, [operations.length, activeFilter]);

  const buildOperations = () => {
    const ops = [...operations];
    if (activeFilter !== 'none') {
      // Use filter's predefined operations
      ops.push(...filterObj.ops);
    } else if (brightness !== 1 || contrast !== 1 || saturation !== 1) {
      ops.push({ type: 'adjust', brightness, contrast, saturation });
    }
    return ops;
  };

  const saveMut = useMutation({
    mutationFn: (ops) => client.post(`/media/${media.id}/edit`, {
      operations: ops,
      save_as_version: true,
      version_description: versionDesc || 'Image edited',
    }, { params: { destinationId: destId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['media-detail'] });
      onSaved?.();
      onClose();
    },
  });

  const handleSave = () => {
    const ops = buildOperations();
    if (ops.length === 0) return;
    setSaving(true);
    saveMut.mutate(ops);
  };

  const handleResizeWidth = (w) => {
    setResizeWidth(w);
    if (lockAspect && w) setResizeHeight(Math.round(w / aspectRatio));
  };

  const handleResizeHeight = (h) => {
    setResizeHeight(h);
    if (lockAspect && h) setResizeWidth(Math.round(h * aspectRatio));
  };

  const applyResize = () => {
    if (resizeWidth) addOp({ type: 'resize', width: parseInt(resizeWidth), height: parseInt(resizeHeight) || undefined });
  };

  if (!media) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth fullScreen>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" fontWeight={700}>{t('media.editor.title', 'Afbeelding bewerken')}</Typography>
          <Chip size="small" label={`${media.width}×${media.height}`} variant="outlined" />
          {operations.length > 0 && <Chip size="small" label={`${operations.length} bewerkingen`} color="primary" />}
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton onClick={undo} disabled={!hasChanges}><UndoIcon /></IconButton>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', gap: 2, p: 2, overflow: 'hidden' }}>
        {/* Left: Preview */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover', borderRadius: 2, overflow: 'hidden', minHeight: 400 }}>
          <Box
            component="img"
            src={imgUrl}
            alt={media.alt_text || media.filename}
            sx={{
              maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
              transition: 'filter 0.2s, transform 0.2s',
              ...previewStyle,
            }}
          />
        </Box>

        {/* Right: Tools */}
        <Box sx={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ mb: 2 }}>
            <Tab icon={<TuneIcon />} label={t('media.editor.adjust', 'Aanpassen')} sx={{ minWidth: 0, fontSize: '0.75rem' }} />
            <Tab icon={<PhotoSizeSelectLargeIcon />} label={t('media.editor.resize', 'Formaat')} sx={{ minWidth: 0, fontSize: '0.75rem' }} />
            <Tab icon={<CropIcon />} label={t('media.editor.transform', 'Transform')} sx={{ minWidth: 0, fontSize: '0.75rem' }} />
            <Tab icon={<FilterIcon />} label={t('media.editor.filters', 'Filters')} sx={{ minWidth: 0, fontSize: '0.75rem' }} />
          </Tabs>

          {/* Tab 0: Adjust */}
          {tab === 0 && (
            <Box sx={{ px: 1 }}>
              <Typography variant="subtitle2" gutterBottom>{t('media.editor.brightness', 'Helderheid')}</Typography>
              <Slider value={brightness} onChange={(_, v) => setBrightness(v)} min={0.5} max={1.5} step={0.05} valueLabelDisplay="auto" sx={{ mb: 2 }} />

              <Typography variant="subtitle2" gutterBottom>{t('media.editor.contrast', 'Contrast')}</Typography>
              <Slider value={contrast} onChange={(_, v) => setContrast(v)} min={0.5} max={1.5} step={0.05} valueLabelDisplay="auto" sx={{ mb: 2 }} />

              <Typography variant="subtitle2" gutterBottom>{t('media.editor.saturation', 'Verzadiging')}</Typography>
              <Slider value={saturation} onChange={(_, v) => setSaturation(v)} min={0} max={2} step={0.05} valueLabelDisplay="auto" sx={{ mb: 2 }} />

              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Button fullWidth variant="outlined" startIcon={<AutoFixHighIcon />}
                  onClick={() => { setBrightness(1.05); setContrast(1.1); setSaturation(1.15); addOp({ type: 'sharpen', sigma: 1.5 }); addOp({ type: 'normalize' }); }}>
                  {t('media.editor.autoEnhance', 'Auto Enhance')}
                </Button>
                <Button variant="outlined" color="secondary"
                  onClick={() => { setBrightness(1); setContrast(1); setSaturation(1); }}
                  disabled={brightness === 1 && contrast === 1 && saturation === 1}
                  sx={{ minWidth: 'auto', px: 2 }}>
                  ↺ Reset
                </Button>
              </Box>
            </Box>
          )}

          {/* Tab 1: Resize */}
          {tab === 1 && (
            <Box sx={{ px: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField size="small" label="Breedte" type="number" value={resizeWidth} onChange={e => handleResizeWidth(e.target.value)} />
                <TextField size="small" label="Hoogte" type="number" value={resizeHeight} onChange={e => handleResizeHeight(e.target.value)} />
              </Box>
              <Button size="small" variant={lockAspect ? 'contained' : 'outlined'} onClick={() => setLockAspect(!lockAspect)} sx={{ mb: 2 }}>
                {lockAspect ? '🔒 Aspect ratio vergrendeld' : '🔓 Vrij formaat'}
              </Button>

              <Typography variant="subtitle2" sx={{ mb: 1 }}>Presets</Typography>
              <ToggleButtonGroup size="small" value={activePreset} exclusive onChange={(_, v) => setActivePreset(v)} sx={{ flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                {ASPECT_PRESETS.map(p => (
                  <ToggleButton key={p.label} value={p.label}
                    sx={{ '&.Mui-selected': { bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' } } }}
                    onClick={() => {
                      if (p.value && media.width) {
                        setResizeWidth(media.width);
                        setResizeHeight(Math.round(media.width / p.value));
                      }
                    }}>{p.label}</ToggleButton>
                ))}
              </ToggleButtonGroup>

              <Typography variant="subtitle2" sx={{ mb: 1 }}>Social Media</Typography>
              <ToggleButtonGroup size="small" value={activePreset} exclusive onChange={(_, v) => setActivePreset(v)} sx={{ flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                {SOCIAL_PRESETS.map(p => (
                  <ToggleButton key={p.label} value={p.label}
                    sx={{ fontSize: '0.7rem', '&.Mui-selected': { bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' } } }}
                    onClick={() => { setResizeWidth(p.width); setResizeHeight(p.height); setLockAspect(false); }}>
                    {p.icon} {p.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>

              <Button fullWidth variant="contained" onClick={applyResize} disabled={!resizeWidth}>
                {t('media.editor.applyResize', 'Formaat toepassen')}
              </Button>
            </Box>
          )}

          {/* Tab 2: Transform */}
          {tab === 2 && (
            <Box sx={{ px: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('media.editor.rotate', 'Roteren')}</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button variant="outlined" startIcon={<RotateLeftIcon />} onClick={() => addOp({ type: 'rotate', angle: -90 })}>-90°</Button>
                <Button variant="outlined" startIcon={<RotateRightIcon />} onClick={() => addOp({ type: 'rotate', angle: 90 })}>+90°</Button>
              </Box>

              <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('media.editor.flip', 'Spiegelen')}</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Button variant="outlined" startIcon={<FlipIcon />} onClick={() => addOp({ type: 'flop' })}>Horizontaal</Button>
                <Button variant="outlined" startIcon={<FlipIcon sx={{ transform: 'rotate(90deg)' }} />} onClick={() => addOp({ type: 'flip' })}>Verticaal</Button>
              </Box>

              <Button fullWidth variant="outlined" startIcon={<AutoFixHighIcon />}
                onClick={() => { addOp({ type: 'sharpen', sigma: 1.5 }); }}>
                {t('media.editor.sharpen', 'Verscherpen')}
              </Button>
            </Box>
          )}

          {/* Tab 3: Filters */}
          {tab === 3 && (
            <Box sx={{ px: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>{t('media.editor.chooseFilter', 'Kies een filter')}</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                {IMAGE_FILTERS.map(f => (
                  <Box
                    key={f.id}
                    onClick={() => setActiveFilter(f.id)}
                    sx={{
                      cursor: 'pointer',
                      borderRadius: 1,
                      overflow: 'hidden',
                      border: '2px solid',
                      borderColor: activeFilter === f.id ? 'primary.main' : 'transparent',
                      transition: 'border-color 0.2s',
                      '&:hover': { borderColor: activeFilter === f.id ? 'primary.main' : 'divider' },
                    }}
                  >
                    <Box
                      component="img"
                      src={imgUrl}
                      alt={f.label}
                      sx={{
                        width: '100%',
                        height: 60,
                        objectFit: 'cover',
                        filter: f.css || 'none',
                        display: 'block',
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        textAlign: 'center',
                        py: 0.3,
                        fontSize: '0.65rem',
                        fontWeight: activeFilter === f.id ? 700 : 400,
                        color: activeFilter === f.id ? 'primary.main' : 'text.secondary',
                        bgcolor: activeFilter === f.id ? 'action.selected' : 'transparent',
                      }}
                    >
                      {f.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
              {activeFilter !== 'none' && (
                <Button
                  fullWidth variant="outlined" size="small" sx={{ mt: 2 }}
                  onClick={() => setActiveFilter('none')}
                >
                  {t('media.editor.removeFilter', 'Filter verwijderen')}
                </Button>
              )}
            </Box>
          )}

          {/* Version description */}
          <Box sx={{ mt: 'auto', pt: 2, px: 1 }}>
            <TextField
              size="small" fullWidth
              label={t('media.editor.versionDesc', 'Versie beschrijving')}
              placeholder="Bijv. Bijgesneden + verscherpt"
              value={versionDesc}
              onChange={e => setVersionDesc(e.target.value)}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{t('common.cancel', 'Annuleren')}</Button>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving || !hasChanges}
        >
          {t('media.editor.save', 'Opslaan als nieuwe versie')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
