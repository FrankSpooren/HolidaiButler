import React from 'react';
import { useTranslation } from 'react-i18next';
import { MenuItem, Select, FormControl, Box } from '@mui/material';

const languages = [
  { code: 'nl', label: 'NL', flag: '🇳🇱' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'de', label: 'DE', flag: '🇩🇪' },
  { code: 'es', label: 'ES', flag: '🇪🇸' },
];

const LanguageSwitcher = ({ variant = 'default', size = 'small' }) => {
  const { i18n } = useTranslation();

  const handleChange = (event) => {
    const newLang = event.target.value;
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  return (
    <FormControl size={size}>
      <Select
        value={i18n.language}
        onChange={handleChange}
        variant="outlined"
        sx={{
          minWidth: variant === 'compact' ? 70 : 90,
          '& .MuiSelect-select': {
            py: 0.75,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: variant === 'footer' ? 'grey.700' : 'grey.300',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: variant === 'footer' ? 'grey.500' : 'primary.main',
          },
          color: variant === 'footer' ? 'grey.300' : 'inherit',
          bgcolor: variant === 'footer' ? 'transparent' : 'background.paper',
        }}
      >
        {languages.map((lang) => (
          <MenuItem key={lang.code} value={lang.code}>
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <span>{lang.flag}</span>
              {variant !== 'compact' && <span>{lang.label}</span>}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default LanguageSwitcher;
