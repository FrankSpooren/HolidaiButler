/**
 * Language Switcher Component
 * Allows users to switch between available languages
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Tooltip,
  Box,
  Chip
} from '@mui/material';
import { Language as LanguageIcon, Check as CheckIcon } from '@mui/icons-material';
import { languages, changeLanguage } from '../i18n';

const flagEmojis = {
  en: '🇬🇧',
  nl: '🇳🇱'
};

export default function LanguageSwitcher({ variant = 'icon' }) {
  const { i18n, t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = (langCode) => {
    changeLanguage(langCode);
    handleClose();
  };

  const currentLanguage = languages.find(l => l.code === i18n.language) || languages[0];

  if (variant === 'chip') {
    return (
      <>
        <Chip
          icon={<LanguageIcon sx={{ fontSize: 18 }} />}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <span>{flagEmojis[currentLanguage.code]}</span>
              <span>{currentLanguage.name}</span>
            </Box>
          }
          onClick={handleClick}
          variant="outlined"
          sx={{ cursor: 'pointer' }}
        />
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          {languages.map((language) => (
            <MenuItem
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              selected={i18n.language === language.code}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Typography variant="body1">{flagEmojis[language.code]}</Typography>
              </ListItemIcon>
              <ListItemText primary={language.name} />
              {i18n.language === language.code && (
                <CheckIcon sx={{ ml: 1, color: 'primary.main' }} />
              )}
            </MenuItem>
          ))}
        </Menu>
      </>
    );
  }

  return (
    <>
      <Tooltip title={t('common.language')}>
        <IconButton
          onClick={handleClick}
          size="small"
          sx={{
            ml: 1,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 0.5 }}>
            <LanguageIcon sx={{ fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {flagEmojis[currentLanguage.code]}
            </Typography>
          </Box>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        slotProps={{
          paper: {
            elevation: 3,
            sx: {
              overflow: 'visible',
              mt: 1.5,
              minWidth: 180,
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" color="text.secondary">
            {t('common.language')}
          </Typography>
        </Box>
        {languages.map((language) => (
          <MenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            selected={i18n.language === language.code}
            sx={{
              py: 1.5,
              '&.Mui-selected': {
                backgroundColor: 'action.selected',
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Typography variant="h6">{flagEmojis[language.code]}</Typography>
            </ListItemIcon>
            <ListItemText
              primary={language.name}
              secondary={language.code.toUpperCase()}
            />
            {i18n.language === language.code && (
              <CheckIcon sx={{ color: 'primary.main' }} />
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
