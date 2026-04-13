import { useState, useEffect, useRef } from 'react';
import { Box, TextField, InputAdornment, IconButton, Tooltip, Chip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import ClearIcon from '@mui/icons-material/Clear';
import { useTranslation } from 'react-i18next';

export default function MediaSearchBar({ value, onChange, onVisualSearch, placeholder, visualSearchActive }) {
  const { t } = useTranslation();
  const [local, setLocal] = useState(value || '');
  const [isVisual, setIsVisual] = useState(false);
  const timer = useRef(null);

  useEffect(() => { setLocal(value || ''); }, [value]);

  const handleChange = (e) => {
    const v = e.target.value;
    setLocal(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (isVisual && onVisualSearch) onVisualSearch(v);
      else onChange(v);
    }, 400);
  };

  const handleClear = () => {
    setLocal('');
    onChange('');
    if (onVisualSearch) onVisualSearch('');
  };

  const toggleVisual = () => {
    const next = !isVisual;
    setIsVisual(next);
    if (next && local && onVisualSearch) onVisualSearch(local);
    else if (!next && local) onChange(local);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, maxWidth: 520 }}>
      <TextField
        size="small"
        fullWidth
        placeholder={isVisual
          ? t('media.visualSearchPlaceholder', 'Beschrijf wat je zoekt (bijv. "strand bij zonsondergang")...')
          : (placeholder || t('media.searchPlaceholder', 'Zoek op naam, beschrijving, eigenaar, locatie...'))
        }
        value={local}
        onChange={handleChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              {isVisual
                ? <ImageSearchIcon fontSize="small" color="primary" />
                : <SearchIcon fontSize="small" color="action" />
              }
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {isVisual && <Chip label="AI" size="small" color="primary" sx={{ height: 20, mr: 0.5 }} />}
              {local && <IconButton size="small" onClick={handleClear}><ClearIcon fontSize="small" /></IconButton>}
            </InputAdornment>
          ),
        }}
      />
      <Tooltip title={isVisual
        ? t('media.switchToText', 'Terug naar tekst zoeken')
        : t('media.switchToVisual', 'AI Visual Search — zoek op beschrijving')
      } arrow>
        <IconButton
          size="small"
          onClick={toggleVisual}
          color={isVisual ? 'primary' : 'default'}
          sx={{ bgcolor: isVisual ? 'primary.main' : 'transparent', color: isVisual ? 'white' : 'text.secondary', '&:hover': { bgcolor: isVisual ? 'primary.dark' : 'action.hover' } }}
        >
          <ImageSearchIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
