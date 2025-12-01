import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Slider,
  Box,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  FormControlLabel,
  Switch,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  TextIncrease as TextIncreaseIcon,
  TextDecrease as TextDecreaseIcon,
  Accessibility as AccessibilityIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

/**
 * WCAG Accessibility Settings Modal
 * WCAG 2.1 AA Compliant
 *
 * Features:
 * - Font size adjustment (80%-150%)
 * - Letter spacing control
 * - Line height adjustment
 * - High contrast mode
 * - Grayscale mode
 * - Settings persist in localStorage
 */
const WCAGModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [fontSize, setFontSize] = useState(100);
  const [contrast, setContrast] = useState('normal');
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [lineHeight, setLineHeight] = useState(1.5);
  const [grayscale, setGrayscale] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedPrefs = localStorage.getItem('wcag-preferences');
    if (savedPrefs) {
      try {
        const prefs = JSON.parse(savedPrefs);
        setFontSize(prefs.fontSize || 100);
        setContrast(prefs.contrast || 'normal');
        setLetterSpacing(prefs.letterSpacing || 0);
        setLineHeight(prefs.lineHeight || 1.5);
        setGrayscale(prefs.grayscale || false);
      } catch (error) {
        console.error('Error loading WCAG preferences:', error);
      }
    }
  }, []);

  // Apply preferences to document and save to localStorage
  useEffect(() => {
    const root = document.documentElement;

    // Apply font size
    root.style.fontSize = `${fontSize}%`;

    // Apply letter spacing
    root.style.letterSpacing = `${letterSpacing}px`;

    // Apply line height
    root.style.lineHeight = `${lineHeight}`;

    // Apply high contrast
    if (contrast === 'high') {
      root.classList.add('wcag-high-contrast');
    } else {
      root.classList.remove('wcag-high-contrast');
    }

    // Apply grayscale
    if (grayscale) {
      root.classList.add('wcag-grayscale');
    } else {
      root.classList.remove('wcag-grayscale');
    }

    // Save preferences
    const prefs = { fontSize, contrast, letterSpacing, lineHeight, grayscale };
    localStorage.setItem('wcag-preferences', JSON.stringify(prefs));
  }, [fontSize, contrast, letterSpacing, lineHeight, grayscale]);

  const resetToDefault = () => {
    setFontSize(100);
    setContrast('normal');
    setLetterSpacing(0);
    setLineHeight(1.5);
    setGrayscale(false);
    localStorage.removeItem('wcag-preferences');
  };

  const handleContrastChange = (event, newContrast) => {
    if (newContrast !== null) {
      setContrast(newContrast);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="wcag-dialog-title"
      aria-describedby="wcag-dialog-description"
    >
      <DialogTitle
        id="wcag-dialog-title"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccessibilityIcon color="primary" />
          <Typography variant="h6" component="span">
            {t('accessibility.settings', 'Accessibility Settings')}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          aria-label={t('common.close', 'Close')}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        {/* Font Size */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight={600}>
            {t('accessibility.fontSize', 'Font Size')}: {fontSize}%
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              onClick={() => setFontSize(Math.max(80, fontSize - 10))}
              aria-label={t('accessibility.decreaseFontSize', 'Decrease font size')}
              size="small"
              sx={{ border: 1, borderColor: 'divider' }}
            >
              <TextDecreaseIcon />
            </IconButton>
            <Slider
              value={fontSize}
              onChange={(e, value) => setFontSize(value)}
              min={80}
              max={150}
              step={10}
              marks={[
                { value: 80, label: '80%' },
                { value: 100, label: '100%' },
                { value: 150, label: '150%' },
              ]}
              aria-label={t('accessibility.fontSizeSlider', 'Font size slider')}
              sx={{ flex: 1 }}
            />
            <IconButton
              onClick={() => setFontSize(Math.min(150, fontSize + 10))}
              aria-label={t('accessibility.increaseFontSize', 'Increase font size')}
              size="small"
              sx={{ border: 1, borderColor: 'divider' }}
            >
              <TextIncreaseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Letter Spacing */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight={600}>
            {t('accessibility.letterSpacing', 'Letter Spacing')}: {letterSpacing}px
          </Typography>
          <Slider
            value={letterSpacing}
            onChange={(e, value) => setLetterSpacing(value)}
            min={0}
            max={5}
            step={0.5}
            marks={[
              { value: 0, label: '0' },
              { value: 2.5, label: '2.5' },
              { value: 5, label: '5' },
            ]}
            aria-label={t('accessibility.letterSpacingSlider', 'Letter spacing slider')}
          />
        </Box>

        {/* Line Height */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight={600}>
            {t('accessibility.lineHeight', 'Line Height')}: {lineHeight.toFixed(1)}
          </Typography>
          <Slider
            value={lineHeight}
            onChange={(e, value) => setLineHeight(value)}
            min={1.2}
            max={2.5}
            step={0.1}
            marks={[
              { value: 1.2, label: '1.2' },
              { value: 1.5, label: '1.5' },
              { value: 2.5, label: '2.5' },
            ]}
            aria-label={t('accessibility.lineHeightSlider', 'Line height slider')}
          />
        </Box>

        {/* Contrast Mode */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight={600}>
            {t('accessibility.contrastMode', 'Contrast Mode')}
          </Typography>
          <ToggleButtonGroup
            value={contrast}
            exclusive
            onChange={handleContrastChange}
            aria-label={t('accessibility.contrastMode', 'Contrast mode')}
            fullWidth
          >
            <ToggleButton value="normal" aria-label="Normal contrast">
              {t('accessibility.normal', 'Normal')}
            </ToggleButton>
            <ToggleButton value="high" aria-label="High contrast">
              {t('accessibility.highContrast', 'High Contrast')}
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Grayscale */}
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={grayscale}
                onChange={(e) => setGrayscale(e.target.checked)}
                inputProps={{
                  'aria-label': t('accessibility.grayscaleMode', 'Grayscale mode'),
                }}
              />
            }
            label={
              <Typography fontWeight={600}>
                {t('accessibility.grayscaleMode', 'Grayscale Mode')}
              </Typography>
            }
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 6 }}>
            {t('accessibility.grayscaleDescription', 'Removes colors for reduced visual distraction')}
          </Typography>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button
          onClick={resetToDefault}
          variant="outlined"
          color="inherit"
        >
          {t('accessibility.resetToDefault', 'Reset to Default')}
        </Button>
        <Button
          onClick={onClose}
          variant="contained"
          color="primary"
        >
          {t('accessibility.applyAndClose', 'Apply & Close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WCAGModal;
