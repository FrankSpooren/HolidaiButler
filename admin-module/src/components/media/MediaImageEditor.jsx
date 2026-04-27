import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
import CropFreeIcon from '@mui/icons-material/CropFree';
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

const CROP_ASPECT_PRESETS = [
  { label: 'Vrij', value: null },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4/3 },
  { label: '3:4', value: 3/4 },
  { label: '16:9', value: 16/9 },
  { label: '9:16', value: 9/16 },
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

  // Crop state
  const [cropMode, setCropMode] = useState(false);
  const [cropRegion, setCropRegion] = useState(null);
  const [cropAspect, setCropAspect] = useState(null);
  const [imgDims, setImgDims] = useState(null); // {left, top, width, height} of rendered img
  const cropContainerRef = useRef(null);
  const imgRef = useRef(null);
  const cropDragRef = useRef({ dragging: false, resizing: false, handle: null, startX: 0, startY: 0, startCrop: null });

  // Track rendered image dimensions for precise overlay positioning
  const updateImgDims = useCallback(() => {
    const img = imgRef.current;
    const container = cropContainerRef.current;
    if (img && container) {
      const cRect = container.getBoundingClientRect();
      const iRect = img.getBoundingClientRect();
      setImgDims({
        left: iRect.left - cRect.left,
        top: iRect.top - cRect.top,
        width: iRect.width,
        height: iRect.height,
      });
    }
  }, []);

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

  const hasChanges = operations.length > 0 || brightness !== 1 || contrast !== 1 || saturation !== 1 || activeFilter !== 'none' || cropRegion !== null;

  const undo = useCallback(() => {
    if (cropRegion) {
      setCropRegion(null); setCropMode(false);
    } else if (operations.length > 0) {
      setOperations(prev => prev.slice(0, -1));
    } else if (activeFilter !== 'none') {
      setActiveFilter('none');
    } else {
      setBrightness(1); setContrast(1); setSaturation(1);
    }
  }, [operations.length, activeFilter, cropRegion]);

  const buildOperations = () => {
    const ops = [];
    // Apply crop FIRST (before other transforms)
    if (cropRegion && media?.width && media?.height) {
      ops.push({
        type: 'crop',
        x: Math.round(cropRegion.x / 100 * media.width),
        y: Math.round(cropRegion.y / 100 * media.height),
        width: Math.round(cropRegion.w / 100 * media.width),
        height: Math.round(cropRegion.h / 100 * media.height),
      });
    }
    ops.push(...operations);
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

  // Global mouse handlers for crop dragging/resizing
  useEffect(() => {
    if (!cropMode) return;
    const handleMouseMove = (e) => {
      const ref = cropDragRef.current;
      if (!ref.dragging && !ref.resizing) return;
      const rect = ref.imgRect;
      if (!rect) return;
      const dx = ((e.clientX - ref.startX) / rect.width) * 100;
      const dy = ((e.clientY - ref.startY) / rect.height) * 100;

      if (ref.dragging && ref.startCrop) {
        let nx = ref.startCrop.x + dx;
        let ny = ref.startCrop.y + dy;
        nx = Math.max(0, Math.min(nx, 100 - ref.startCrop.w));
        ny = Math.max(0, Math.min(ny, 100 - ref.startCrop.h));
        setCropRegion(prev => ({ ...prev, x: nx, y: ny }));
      } else if (ref.resizing && ref.startCrop) {
        const sc = ref.startCrop;
        let nx = sc.x, ny = sc.y, nw = sc.w, nh = sc.h;
        const h = ref.handle;
        if (h === 'se' || h === 'ne' || h === 'e') { nw = Math.max(2, sc.w + dx); }
        if (h === 'sw' || h === 'nw' || h === 'w') { nx = sc.x + dx; nw = Math.max(2, sc.w - dx); }
        if (h === 'se' || h === 'sw' || h === 's') { nh = Math.max(2, sc.h + dy); }
        if (h === 'ne' || h === 'nw' || h === 'n') { ny = sc.y + dy; nh = Math.max(2, sc.h - dy); }
        if (cropAspect && nw > 0) {
          const imgW = media?.width || 1;
          const imgH = media?.height || 1;
          nh = (nw / 100 * imgW) / cropAspect / imgH * 100;
        }
        nx = Math.max(0, nx); ny = Math.max(0, ny);
        nw = Math.min(nw, 100 - nx); nh = Math.min(nh, 100 - ny);
        setCropRegion({ x: nx, y: ny, w: nw, h: nh });
      }
    };
    const handleMouseUp = () => {
      cropDragRef.current.dragging = false;
      cropDragRef.current.resizing = false;
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [cropMode, cropAspect, media?.width, media?.height]);

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

      <DialogContent sx={{ display: 'flex', gap: 2, p: 2, overflow: 'hidden', height: 'calc(100vh - 120px)' }}>
        {/* Left: Preview with Crop Overlay */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover', borderRadius: 2, overflow: 'visible', position: 'relative', height: '100%', minHeight: 0 }}>
          <Box ref={cropContainerRef} sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: '100%', height: '100%', overflow: 'visible' }}>
            <Box
              component="img"
              ref={imgRef}
              src={imgUrl}
              alt={media.alt_text || media.filename}
              onLoad={updateImgDims}
              sx={{
                maxWidth: '100%', maxHeight: 'calc(100vh - 160px)', objectFit: 'contain', display: 'block',
                transition: 'filter 0.2s, transform 0.2s',
                ...previewStyle,
                ...(cropMode ? { cursor: 'crosshair', userSelect: 'none' } : {}),
              }}
              draggable={false}
              onMouseDown={cropMode ? (e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                if (!cropRegion) {
                  setCropRegion({ x, y, w: 0, h: 0 });
                  cropDragRef.current = { dragging: false, resizing: true, handle: 'se', startX: e.clientX, startY: e.clientY, startCrop: { x, y, w: 0, h: 0 }, imgRect: rect };
                } else {
                  setCropRegion({ x, y, w: 0, h: 0 });
                  cropDragRef.current = { dragging: false, resizing: true, handle: 'se', startX: e.clientX, startY: e.clientY, startCrop: { x, y, w: 0, h: 0 }, imgRect: rect };
                }
                e.preventDefault();
              } : undefined}
            />
            {cropMode && cropRegion && cropRegion.w > 0.5 && cropRegion.h > 0.5 && imgDims && (<>
              <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <Box sx={{ position: 'absolute', top: imgDims.top, left: imgDims.left, width: imgDims.width, height: cropRegion.y / 100 * imgDims.height, bgcolor: 'rgba(0,0,0,0.55)' }} />
                <Box sx={{ position: 'absolute', top: imgDims.top + cropRegion.y / 100 * imgDims.height, left: imgDims.left, width: cropRegion.x / 100 * imgDims.width, height: cropRegion.h / 100 * imgDims.height, bgcolor: 'rgba(0,0,0,0.55)' }} />
                <Box sx={{ position: 'absolute', top: imgDims.top + cropRegion.y / 100 * imgDims.height, left: imgDims.left + (cropRegion.x + cropRegion.w) / 100 * imgDims.width, width: imgDims.width - (cropRegion.x + cropRegion.w) / 100 * imgDims.width, height: cropRegion.h / 100 * imgDims.height, bgcolor: 'rgba(0,0,0,0.55)' }} />
                <Box sx={{ position: 'absolute', top: imgDims.top + (cropRegion.y + cropRegion.h) / 100 * imgDims.height, left: imgDims.left, width: imgDims.width, height: imgDims.height - (cropRegion.y + cropRegion.h) / 100 * imgDims.height, bgcolor: 'rgba(0,0,0,0.55)' }} />
              </Box>
              <Box
                sx={{
                  position: 'absolute',
                  left: imgDims.left + cropRegion.x / 100 * imgDims.width,
                  top: imgDims.top + cropRegion.y / 100 * imgDims.height,
                  width: cropRegion.w / 100 * imgDims.width,
                  height: cropRegion.h / 100 * imgDims.height,
                  border: '2px solid #02C39A', cursor: 'move', boxSizing: 'border-box',
                }}
                onMouseDown={(e) => {
                  const imgEl = cropContainerRef.current?.querySelector('img');
                  if (!imgEl) return;
                  const rect = imgEl.getBoundingClientRect();
                  cropDragRef.current = { dragging: true, resizing: false, handle: null, startX: e.clientX, startY: e.clientY, startCrop: { ...cropRegion }, imgRect: rect };
                  e.preventDefault(); e.stopPropagation();
                }}
              >
                <Box sx={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(2,195,154,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(2,195,154,0.25) 1px, transparent 1px)', backgroundSize: '33.33% 33.33%', pointerEvents: 'none' }} />
                {['nw','ne','sw','se'].map(h => (
                  <Box key={h} sx={{
                    position: 'absolute', width: 12, height: 12, bgcolor: '#02C39A', border: '2px solid white', borderRadius: '2px',
                    ...(h.includes('n') ? { top: -6 } : { bottom: -6 }),
                    ...(h.includes('w') ? { left: -6 } : { right: -6 }),
                    cursor: h + '-resize', zIndex: 2,
                  }} onMouseDown={(e) => {
                    const imgEl = cropContainerRef.current?.querySelector('img');
                    if (!imgEl) return;
                    const rect = imgEl.getBoundingClientRect();
                    cropDragRef.current = { dragging: false, resizing: true, handle: h, startX: e.clientX, startY: e.clientY, startCrop: { ...cropRegion }, imgRect: rect };
                    e.preventDefault(); e.stopPropagation();
                  }} />
                ))}
                {media?.width && media?.height && (
                  <Box sx={{ position: 'absolute', bottom: -22, left: '50%', transform: 'translateX(-50%)', bgcolor: 'rgba(0,0,0,0.75)', color: 'white', px: 1, py: 0.2, borderRadius: 1, fontSize: '0.65rem', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                    {Math.round(cropRegion.w / 100 * media.width)} x {Math.round(cropRegion.h / 100 * media.height)} px
                  </Box>
                )}
              </Box>
            </>)}
          </Box>
        </Box>

        {/* Right: Tools */}
        <Box sx={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'auto', height: '100%', minHeight: 0 }}>
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

          {/* Tab 2: Transform (Crop + Rotate + Flip) */}
          {tab === 2 && (
            <Box sx={{ px: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('media.editor.crop', 'Bijsnijden')}</Typography>
              <Button
                fullWidth variant={cropMode ? 'contained' : 'outlined'} color={cropMode ? 'primary' : 'inherit'}
                startIcon={<CropFreeIcon />} sx={{ mb: 1.5 }}
                onClick={() => {
                  if (cropMode) { setCropMode(false); }
                  else {
                    setCropMode(true);
                    setCropAspect(null);
                    // Auto-select 80% center of image so user can immediately adjust
                    setCropRegion({ x: 10, y: 10, w: 80, h: 80 });
                    updateImgDims();
                  }
                }}
              >
                {cropMode ? t('media.editor.cropActive', 'Bijsnijden actief — sleep op afbeelding') : t('media.editor.startCrop', 'Bijsnijden starten')}
              </Button>
              {cropMode && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {t('media.editor.cropHelp', 'Sleep op de afbeelding om een selectie te maken. Gebruik de hoekpunten om aan te passen.')}
                  </Typography>
                  <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>{t('media.editor.cropAspect', 'Beeldverhouding')}</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                    {CROP_ASPECT_PRESETS.map(p => (
                      <Chip key={p.label} label={p.label} size="small" clickable
                        color={cropAspect === p.value ? 'primary' : 'default'}
                        variant={cropAspect === p.value ? 'filled' : 'outlined'}
                        onClick={() => {
                          setCropAspect(p.value);
                          if (p.value && cropRegion && cropRegion.w > 0) {
                            const imgW = media?.width || 1;
                            const imgH = media?.height || 1;
                            const newH = (cropRegion.w / 100 * imgW) / p.value / imgH * 100;
                            setCropRegion(prev => ({ ...prev, h: Math.min(newH, 100 - prev.y) }));
                          }
                        }}
                      />
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" variant="contained" disabled={!cropRegion || cropRegion.w < 1}
                      onClick={() => { setCropMode(false); }}
                      startIcon={<CropIcon />}>
                      {t('media.editor.applyCrop', 'Bijsnijden toepassen')}
                    </Button>
                    <Button size="small" variant="outlined" color="secondary"
                      onClick={() => { setCropRegion(null); }}>
                      {t('media.editor.resetCrop', 'Reset')}
                    </Button>
                  </Box>
                </Box>
              )}
              {cropRegion && !cropMode && media?.width && media?.height && (
                <Chip size="small" label={'Bijgesneden: ' + Math.round(cropRegion.w/100*media.width) + 'x' + Math.round(cropRegion.h/100*media.height) + 'px'}
                  color="success" variant="outlined" sx={{ mb: 2 }}
                  onDelete={() => setCropRegion(null)} />
              )}

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
