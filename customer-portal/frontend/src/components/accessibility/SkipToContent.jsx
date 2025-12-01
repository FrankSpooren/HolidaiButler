import React from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

/**
 * Skip to Content Link
 * WCAG 2.1 Success Criterion 2.4.1 (Bypass Blocks)
 *
 * Allows keyboard users to skip navigation and go directly to main content
 * Invisible until focused (keyboard navigation)
 */
const SkipToContent = ({ targetId = 'main-content' }) => {
  const { t } = useTranslation();

  const handleClick = (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);

    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <Box
      component="a"
      href={`#${targetId}`}
      onClick={handleClick}
      sx={{
        position: 'absolute',
        left: '-9999px',
        top: '0',
        zIndex: 9999,
        padding: '8px 16px',
        backgroundColor: 'primary.main',
        color: 'primary.contrastText',
        textDecoration: 'none',
        borderRadius: '0 0 4px 4px',
        fontWeight: 600,
        fontSize: '14px',
        transition: 'left 0.2s',
        '&:focus': {
          left: '0',
          outline: '3px solid',
          outlineColor: 'primary.dark',
          outlineOffset: '2px',
        },
      }}
      aria-label={t('accessibility.skipToContent', 'Skip to main content')}
    >
      {t('accessibility.skipToMainContent', 'Spring naar hoofdinhoud')}
    </Box>
  );
};

export default SkipToContent;
