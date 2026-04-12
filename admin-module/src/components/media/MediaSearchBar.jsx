import { useState, useEffect, useRef } from 'react';
import { Box, TextField, InputAdornment, IconButton, Tooltip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import ClearIcon from '@mui/icons-material/Clear';
import { useTranslation } from 'react-i18next';

export default function MediaSearchBar({ value, onChange, placeholder }) {
  const { t } = useTranslation();
  const [local, setLocal] = useState(value || '');
  const timer = useRef(null);

  useEffect(() => { setLocal(value || ''); }, [value]);

  const handleChange = (e) => {
    const v = e.target.value;
    setLocal(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(v), 300);
  };

  const handleClear = () => {
    setLocal('');
    onChange('');
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, maxWidth: 480 }}>
      <TextField
        size="small"
        fullWidth
        placeholder={placeholder || t('media.searchPlaceholder', 'Zoek op naam, beschrijving, eigenaar, locatie...')}
        value={local}
        onChange={handleChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
          endAdornment: local ? (
            <InputAdornment position="end">
              <IconButton size="small" onClick={handleClear}><ClearIcon fontSize="small" /></IconButton>
            </InputAdornment>
          ) : null,
        }}
      />
      <Tooltip title={t('media.visualSearch', 'Visual search — binnenkort beschikbaar')} arrow>
        <span>
          <IconButton disabled size="small" sx={{ opacity: 0.4 }}>
            <ImageSearchIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
