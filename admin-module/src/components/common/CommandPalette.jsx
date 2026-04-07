import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogContent, TextField, List, ListItemButton, ListItemIcon,
  ListItemText, Typography, Box, InputAdornment, Chip,
} from '@mui/material';
import {
  Search, Dashboard, Edit, CalendarMonth, Folder, Palette, Add, Campaign,
  AutoFixHigh, Refresh, Description, People, Settings, Storefront, Article,
  Image as ImageIcon, Place, RateReview, BarChart, Assignment,
} from '@mui/icons-material';
import useAuthStore from '../../stores/authStore.js';
import contentService from '../../api/contentService.js';
import useDestinationStore from '../../stores/destinationStore.js';

// Fuzzy search: alle search-tokens moeten substring zijn van het label
function fuzzyMatch(query, text) {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();
  if (t.includes(q)) return true;
  // Token-based: elk woord in query moet ergens in text voorkomen
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every(tok => t.includes(tok));
}

const NAV_COMMANDS = [
  { id: 'nav-dashboard', label: 'Dashboard', icon: Dashboard, path: '/dashboard', group: 'Navigatie' },
  { id: 'nav-content', label: 'Content Studio', icon: Edit, path: '/content-studio', group: 'Navigatie' },
  { id: 'nav-pois', label: "POI's", icon: Place, path: '/pois', group: 'Navigatie' },
  { id: 'nav-reviews', label: 'Reviews', icon: RateReview, path: '/reviews', group: 'Navigatie' },
  { id: 'nav-media', label: 'Mediabibliotheek', icon: Folder, path: '/media', group: 'Navigatie' },
  { id: 'nav-branding', label: 'Merk Profiel', icon: Palette, path: '/branding', group: 'Navigatie' },
  { id: 'nav-pages', label: "Pagina's & Navigatie", icon: Description, path: '/pages', group: 'Navigatie' },
  { id: 'nav-analytics', label: 'Analytics', icon: BarChart, path: '/analytics', group: 'Navigatie' },
  { id: 'nav-commerce', label: 'Commerce', icon: Storefront, path: '/commerce', group: 'Navigatie' },
  { id: 'nav-partners', label: 'Partners', icon: People, path: '/partners', group: 'Navigatie' },
  { id: 'nav-financial', label: 'Financieel', icon: Assignment, path: '/financial', group: 'Navigatie' },
  { id: 'nav-intermediary', label: 'Intermediair', icon: Assignment, path: '/intermediary', group: 'Navigatie' },
  { id: 'nav-agents', label: 'Agents', icon: AutoFixHigh, path: '/agents', group: 'Navigatie' },
  // Admin-only
  { id: 'nav-users', label: 'Gebruikers', icon: People, path: '/users', group: 'Navigatie', adminOnly: true },
  { id: 'nav-settings', label: 'Instellingen', icon: Settings, path: '/settings', group: 'Navigatie', adminOnly: true },
];

const ACTION_COMMANDS = [
  { id: 'act-new-content', label: 'Nieuw content item', icon: Add, path: '/content-studio?action=new', group: 'Acties' },
  { id: 'act-new-campaign', label: 'Nieuwe campagne', icon: Campaign, path: '/content-studio?action=campaign', group: 'Acties' },
  { id: 'act-calendar-fill', label: 'Kalender auto-fill', icon: CalendarMonth, path: '/content-studio?tab=calendar&action=autofill', group: 'Acties' },
  { id: 'act-rewrite', label: 'AI herschrijven', icon: Refresh, path: '/content-studio?action=rewrite', group: 'Acties' },
];

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const selectedDestination = useDestinationStore(s => s.selectedDestination);
  const destinations = useDestinationStore(s => s.destinations);
  const [query, setQuery] = useState('');
  const [recentItems, setRecentItems] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const isAdmin = user?.role === 'platform_admin';

  // Recente items ophalen wanneer palette opent
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    let destId = null;
    if (selectedDestination && selectedDestination !== 'all') {
      const found = destinations.find(d => d.code === selectedDestination);
      destId = found?.id;
    }
    if (!destId) destId = user?.allowed_destinations?.[0];
    if (!destId) return;
    contentService.getItems(destId, { limit: 5 })
      .then(data => {
        const items = (data?.items || data || []).slice(0, 5).map(item => ({
          id: `recent-${item.id}`,
          label: item.title || 'Untitled',
          icon: Article,
          path: `/content-studio?item=${item.id}`,
          group: 'Recent',
          subtitle: item.approval_status || '',
        }));
        setRecentItems(items);
      })
      .catch(() => setRecentItems([]));
  }, [open, selectedDestination, destinations, user]);

  const allCommands = useMemo(() => {
    const navFiltered = NAV_COMMANDS.filter(c => !c.adminOnly || isAdmin);
    return [...navFiltered, ...ACTION_COMMANDS, ...recentItems];
  }, [isAdmin, recentItems]);

  const filtered = useMemo(() => {
    if (!query) return allCommands;
    return allCommands.filter(c => fuzzyMatch(query, c.label));
  }, [query, allCommands]);

  // Group by section
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(c => {
      if (!groups[c.group]) groups[c.group] = [];
      groups[c.group].push(c);
    });
    return groups;
  }, [filtered]);

  const flatList = filtered;

  const execute = useCallback((cmd) => {
    if (!cmd) return;
    onClose();
    if (cmd.path) navigate(cmd.path);
  }, [navigate, onClose]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, flatList.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      execute(flatList[activeIndex]);
    }
  };

  let runningIndex = -1;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          position: 'fixed',
          top: '15%',
          m: 0,
          borderRadius: 2,
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 2, pb: 1 }}>
          <TextField
            autoFocus
            fullWidth
            placeholder="Typ een commando of zoek..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={handleKeyDown}
            variant="standard"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
              disableUnderline: true,
              sx: { fontSize: '1.1rem' },
            }}
          />
        </Box>
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', maxHeight: '60vh', overflow: 'auto' }}>
          {flatList.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">Geen resultaten</Typography>
            </Box>
          )}
          {Object.entries(grouped).map(([groupName, items]) => (
            <Box key={groupName}>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  px: 2,
                  pt: 1.5,
                  pb: 0.5,
                  color: 'text.secondary',
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}
              >
                {groupName}
              </Typography>
              <List dense disablePadding>
                {items.map((cmd) => {
                  runningIndex += 1;
                  const isActive = runningIndex === activeIndex;
                  const Icon = cmd.icon;
                  return (
                    <ListItemButton
                      key={cmd.id}
                      selected={isActive}
                      onClick={() => execute(cmd)}
                      sx={{
                        py: 1,
                        '&.Mui-selected': { bgcolor: 'action.selected' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Icon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={cmd.label}
                        secondary={cmd.subtitle || undefined}
                        primaryTypographyProps={{ fontSize: '0.95rem' }}
                      />
                      {isActive && <Chip label="↵" size="small" variant="outlined" />}
                    </ListItemButton>
                  );
                })}
              </List>
            </Box>
          ))}
        </Box>
        <Box sx={{ px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 2, fontSize: '0.75rem', color: 'text.secondary' }}>
          <span>↑↓ navigeren</span>
          <span>↵ openen</span>
          <span>Esc sluiten</span>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
