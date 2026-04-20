import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Button, Popover, List, ListItem, ListItemIcon,
  ListItemText, Chip, TextField, InputAdornment, Divider, Snackbar, Alert
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SearchIcon from '@mui/icons-material/Search';
import CheckIcon from '@mui/icons-material/Check';
import HistoryIcon from '@mui/icons-material/History';
import { useQuery } from '@tanstack/react-query';
import useAuthStore from '../../stores/authStore.js';
import useDestinationStore from '../../stores/destinationStore.js';
import client from '../../api/client.js';
import { tokens } from '../../theme/tokens.js';

const FLAG_MAP = { 1: '\uD83C\uDDEA\uD83C\uDDF8', 2: '\uD83C\uDDF3\uD83C\uDDF1', 4: '\uD83C\uDDE7\uD83C\uDDEA', 5: '\uD83C\uDDEA\uD83C\uDDF8', 6: '\uD83C\uDDEA\uD83C\uDDF8', 7: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74\uDB40\uDC7F' };
const ROLE_LABELS = { platform_admin: 'Admin', destination_admin: 'Admin', poi_owner: 'Owner', content_manager: 'Manager', editor: 'Editor', reviewer: 'Reviewer' };

function getRecentDestinations() {
  try {
    return JSON.parse(localStorage.getItem('hb-recent-destinations') || '[]');
  } catch { return []; }
}

function addRecentDestination(code) {
  const recent = getRecentDestinations().filter(c => c !== code);
  recent.unshift(code);
  localStorage.setItem('hb-recent-destinations', JSON.stringify(recent.slice(0, 5)));
}

export default function DestinationSwitcher({ value, onChange }) {
  const user = useAuthStore(s => s.user);
  const setDestinations = useDestinationStore(s => s.setDestinations);
  const [anchorEl, setAnchorEl] = useState(null);
  const [search, setSearch] = useState('');
  const [focusIdx, setFocusIdx] = useState(-1);
  const [snack, setSnack] = useState(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  const { data } = useQuery({
    queryKey: ['destinations-list'],
    queryFn: () => client.get('/destinations').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const allDests = data?.data?.destinations || [];

  useEffect(() => {
    if (allDests.length > 0) setDestinations(allDests);
  }, [allDests, setDestinations]);

  const allowedDests = user?.allowed_destinations;
  const isPlatformAdmin = user?.role === 'platform_admin';
  const visibleDestinations = isPlatformAdmin || !allowedDests || allowedDests.length === 0
    ? allDests
    : allDests.filter(d => allowedDests.includes(d.code));

  const filtered = search
    ? visibleDestinations.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
    : visibleDestinations;

  const currentDest = allDests.find(d => d.code === value);
  const currentLabel = value === 'all' ? 'Alle bestemmingen' : (currentDest?.name || value);
  const currentFlag = currentDest ? (FLAG_MAP[currentDest.id] || '\uD83C\uDF0D') : '\uD83C\uDF0D';

  const recentCodes = getRecentDestinations();
  const recentDests = recentCodes
    .map(code => visibleDestinations.find(d => d.code === code))
    .filter(Boolean)
    .filter(d => d.code !== value)
    .slice(0, 3);

  const open = Boolean(anchorEl);

  const handleOpen = useCallback((e) => {
    setAnchorEl(e?.currentTarget || e);
    setSearch('');
    setFocusIdx(-1);
    setTimeout(() => searchRef.current?.focus(), 100);
  }, []);

  const handleSelect = (code, name) => {
    if (code !== value) {
      addRecentDestination(value); // save current as recent before switching
      onChange?.(code);
      setSnack('Gewisseld naar ' + name);
    }
    setAnchorEl(null);
  };

  // Keyboard shortcut: Cmd+Shift+D
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        if (open) {
          setAnchorEl(null);
        } else {
          // Create a virtual anchor at the switcher button
          const btn = document.getElementById('destination-switcher-btn');
          if (btn) handleOpen({ currentTarget: btn });
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, handleOpen]);

  // Arrow key navigation in dropdown
  const handleKeyDown = (e) => {
    const items = filtered;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIdx(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && focusIdx >= 0 && focusIdx < items.length) {
      e.preventDefault();
      handleSelect(items[focusIdx].code, items[focusIdx].name);
    } else if (e.key === 'Escape') {
      setAnchorEl(null);
    }
  };

  // Scroll focused item into view
  useEffect(() => {
    if (focusIdx >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-dest-item]');
      items[focusIdx]?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusIdx]);

  const showAll = isPlatformAdmin || visibleDestinations.length > 1;

  return (
    <>
      <Button
        id="destination-switcher-btn"
        onClick={handleOpen}
        endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 18 }} />}
        sx={{
          textTransform: 'none',
          color: 'text.primary',
          bgcolor: 'rgba(255,255,255,0.06)',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: tokens.radius.md,
          px: 1.5, py: 0.5,
          fontSize: '0.85rem',
          fontWeight: 500,
          '&:hover': { bgcolor: 'rgba(255,255,255,0.10)' },
          transition: tokens.motion.fast,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: '1.1rem', lineHeight: 1 }}>{currentFlag}</Typography>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 500 }}>{currentLabel}</Typography>
        </Box>
      </Button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              width: 320, maxHeight: 440,
              bgcolor: 'background.paper',
              border: '1px solid ' + tokens.border.subtle,
              mt: 0.5,
            }
          }
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Search */}
        {visibleDestinations.length > 3 && (
          <Box sx={{ p: 1.5, pb: 0.5 }}>
            <TextField
              inputRef={searchRef}
              size="small"
              fullWidth
              placeholder="Zoek bestemming..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setFocusIdx(0); }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment>,
                sx: { fontSize: '0.8rem' }
              }}
            />
          </Box>
        )}

        {/* Recent */}
        {!search && recentDests.length > 0 && (
          <Box sx={{ px: 1, pt: 1 }}>
            <Typography variant="caption" sx={{ px: 1, color: 'text.disabled', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Recent
            </Typography>
            <List dense disablePadding>
              {recentDests.map(d => (
                <ListItem
                  key={'recent-' + d.code}
                  onClick={() => handleSelect(d.code, d.name)}
                  sx={{ cursor: 'pointer', borderRadius: tokens.radius.sm, py: 0.5, '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <HistoryIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                  </ListItemIcon>
                  <ListItemText primary={d.name} primaryTypographyProps={{ fontSize: '0.78rem', color: 'text.secondary' }} />
                </ListItem>
              ))}
            </List>
            <Divider sx={{ mt: 0.5 }} />
          </Box>
        )}

        {/* All destinations */}
        <Box sx={{ px: 1, pt: 0.5, pb: 0.5 }}>
          {!search && (
            <Typography variant="caption" sx={{ px: 1, color: 'text.disabled', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Bestemmingen
            </Typography>
          )}
          <List dense disablePadding ref={listRef}>
            {showAll && !search && (
              <ListItem
                onClick={() => handleSelect('all', 'Alle bestemmingen')}
                sx={{
                  cursor: 'pointer', borderRadius: tokens.radius.sm, py: 0.75,
                  bgcolor: value === 'all' ? tokens.brand.tealDim : 'transparent',
                  '&:hover': { bgcolor: value === 'all' ? tokens.brand.tealDim : 'action.hover' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Typography sx={{ fontSize: '1rem' }}>{'\uD83C\uDF0D'}</Typography>
                </ListItemIcon>
                <ListItemText primary="Alle bestemmingen" primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: value === 'all' ? 600 : 400 }} />
                {value === 'all' && <CheckIcon sx={{ fontSize: 16, color: tokens.brand.teal }} />}
              </ListItem>
            )}
            {filtered.map((d, idx) => {
              const isActive = d.code === value;
              const isFocused = idx === focusIdx;
              return (
                <ListItem
                  key={d.code}
                  data-dest-item
                  onClick={() => handleSelect(d.code, d.name)}
                  sx={{
                    cursor: 'pointer', borderRadius: tokens.radius.sm, py: 0.75,
                    bgcolor: isActive ? tokens.brand.tealDim : isFocused ? 'action.hover' : 'transparent',
                    '&:hover': { bgcolor: isActive ? tokens.brand.tealDim : 'action.hover' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Typography sx={{ fontSize: '1rem' }}>{FLAG_MAP[d.id] || '\uD83C\uDF0D'}</Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary={d.name}
                    primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: isActive ? 600 : 400 }}
                  />
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    {d.destinationType === 'content_only' && (
                      <Chip label="CS" size="small" sx={{ height: 18, fontSize: '0.58rem' }} color="info" variant="outlined" />
                    )}
                    <Chip label={ROLE_LABELS[user?.role] || user?.role} size="small"
                      sx={{ height: 18, fontSize: '0.58rem', bgcolor: tokens.brand.tealDim, color: tokens.brand.teal }} />
                    {isActive && <CheckIcon sx={{ fontSize: 16, color: tokens.brand.teal, ml: 0.5 }} />}
                  </Box>
                </ListItem>
              );
            })}
          </List>
        </Box>

        {/* Footer hint */}
        <Box sx={{ px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6rem' }}>
            {navigator.platform?.includes('Mac') ? '\u2318\u21E7D' : 'Ctrl+Shift+D'} om te wisselen
          </Typography>
        </Box>
      </Popover>

      {/* Snackbar feedback */}
      <Snackbar open={Boolean(snack)} autoHideDuration={2000} onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnack(null)} severity="success" variant="filled" sx={{ fontSize: '0.8rem' }}>
          {snack}
        </Alert>
      </Snackbar>
    </>
  );
}
