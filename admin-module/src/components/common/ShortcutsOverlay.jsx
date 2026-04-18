import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogTitle, Typography, Box, IconButton, TextField,
  InputAdornment,
} from '@mui/material';
import { Close, Search } from '@mui/icons-material';

const SHORTCUT_SECTIONS = [
  {
    title: 'Navigatie',
    shortcuts: [
      { keys: ['G', 'D'], label: 'Ga naar Dashboard' },
      { keys: ['G', 'C'], label: 'Ga naar Content Studio' },
      { keys: ['G', 'B'], label: 'Ga naar Content Bronnen' },
      { keys: ['G', 'I'], label: 'Ga naar Content Ideeen' },
      { keys: ['G', 'T'], label: 'Ga naar Content Items' },
      { keys: ['G', 'K'], label: 'Ga naar Kalender' },
      { keys: ['G', 'A'], label: 'Ga naar Analyse' },
      { keys: ['G', 'M'], label: 'Ga naar Media' },
      { keys: ['G', 'S'], label: 'Ga naar Merk Profiel' },
    ],
  },
  {
    title: 'Content Acties',
    shortcuts: [
      { keys: ['N', 'C'], label: 'Nieuw concept' },
      { keys: ['N', 'B'], label: 'Nieuw blog' },
      { keys: ['N', 'S'], label: 'Nieuwe social post' },
      { keys: ['N', 'P'], label: 'Nieuwe campagne' },
    ],
  },
  {
    title: 'Systeem',
    shortcuts: [
      { keys: ['\u2318/Ctrl', 'K'], label: 'Command Palette openen' },
      { keys: ['?'], label: 'Dit overzicht tonen' },
      { keys: ['/'], label: 'Zoekbalk focussen' },
      { keys: ['Esc'], label: 'Sluiten / wis selectie' },
    ],
  },
];

function KeyBadge({ children }) {
  return (
    <Box
      component="kbd"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 28,
        height: 26,
        px: 0.75,
        borderRadius: 0.75,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.hover',
        fontSize: '0.75rem',
        fontWeight: 600,
        fontFamily: 'monospace',
        color: 'text.secondary',
        lineHeight: 1,
      }}
    >
      {children}
    </Box>
  );
}

export default function ShortcutsOverlay() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');

  // Listen for '?' key and custom event from CommandPalette
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const handleCustom = () => setOpen(true);

    window.addEventListener('keydown', handleKey);
    window.addEventListener('hb:show-shortcuts', handleCustom);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('hb:show-shortcuts', handleCustom);
    };
  }, []);

  const filteredSections = SHORTCUT_SECTIONS.map(section => ({
    ...section,
    shortcuts: section.shortcuts.filter(s =>
      !filter || s.label.toLowerCase().includes(filter.toLowerCase())
    ),
  })).filter(s => s.shortcuts.length > 0);

  return (
    <Dialog
      open={open}
      onClose={() => { setOpen(false); setFilter(''); }}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <Typography variant="h6" sx={{ flex: 1, fontWeight: 700, fontSize: '1.1rem' }}>
          Sneltoetsen
        </Typography>
        <IconButton size="small" onClick={() => { setOpen(false); setFilter(''); }}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Zoek sneltoets..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
        />

        {filteredSections.map((section) => (
          <Box key={section.title} sx={{ mb: 2.5 }}>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                fontWeight: 600,
                fontSize: '0.65rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'text.secondary',
                mb: 1,
              }}
            >
              {section.title}
            </Typography>
            {section.shortcuts.map((shortcut, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  py: 0.75,
                  borderBottom: idx < section.shortcuts.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                  {shortcut.label}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                  {shortcut.keys.map((key, ki) => (
                    <Box key={ki} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {ki > 0 && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                          dan
                        </Typography>
                      )}
                      <KeyBadge>{key}</KeyBadge>
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        ))}

        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', textAlign: 'center', mt: 1, opacity: 0.6 }}>
          Sequence shortcuts: druk de eerste toets, dan de tweede binnen 2 seconden
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
