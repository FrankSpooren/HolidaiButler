import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogContent, TextField, List, ListItemButton, ListItemIcon,
  ListItemText, Typography, Box, InputAdornment, Chip,
} from '@mui/material';
import {
  Search, Dashboard, Edit, CalendarMonth, Folder, Palette, Add, Campaign,
  AutoFixHigh, Refresh, Description, People, Settings, Storefront, Article,
  Place, RateReview, BarChart, Assignment, Logout,
  CloudUpload, SwapHoriz, AccountBalance, Handshake,
  SmartToy, AddCircleOutline, AutoAwesome,
  TrendingUp, Lightbulb, ViewList, PhotoLibrary, Language,
  Keyboard, Publish,
} from '@mui/icons-material';
import useAuthStore from '../../stores/authStore.js';
import contentService from '../../api/contentService.js';
import useDestinationStore from '../../stores/destinationStore.js';
import { useTranslation } from 'react-i18next';

function fuzzyMatch(query, text, keywords) {
  keywords = keywords || '';
  if (!query) return true;
  const q = query.toLowerCase().trim();
  const searchable = (text + ' ' + keywords).toLowerCase();
  if (searchable.includes(q)) return true;
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every(tok => searchable.includes(tok));
}

const RECENT_KEY = 'hb-cmd-palette-recent';
const MAX_RECENT = 5;

function getRecentActions() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
  catch(e) { return []; }
}

function saveRecentAction(id) {
  const recent = getRecentActions().filter(r => r !== id);
  recent.unshift(id);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

const ALL_COMMANDS = [
  // NAVIGATIE (20)
  { id: 'nav-dashboard', label: 'Dashboard', icon: Dashboard, path: '/dashboard', section: 'Navigatie', shortcut: 'G D', keywords: 'home overzicht start' },
  { id: 'nav-content', label: 'Content Studio', icon: AutoAwesome, path: '/content-studio', section: 'Navigatie', shortcut: 'G C', keywords: 'studio items concepten' },
  { id: 'nav-bronnen', label: 'Content Bronnen', icon: TrendingUp, path: '/content-studio?tab=sources', section: 'Navigatie', shortcut: 'G B', keywords: 'bronnen sources trending zoektermen' },
  { id: 'nav-ideeen', label: 'Content Ideeen', icon: Lightbulb, path: '/content-studio?tab=suggestions', section: 'Navigatie', shortcut: 'G I', keywords: 'suggesties ideeen voorstellen' },
  { id: 'nav-items', label: 'Content Items', icon: ViewList, path: '/content-studio?tab=items', section: 'Navigatie', shortcut: 'G T', keywords: 'items tabel lijst concepts' },
  { id: 'nav-kalender', label: 'Kalender', icon: CalendarMonth, path: '/content-studio?tab=calendar', section: 'Navigatie', shortcut: 'G K', keywords: 'calendar planning schedule' },
  { id: 'nav-analyse', label: 'Analyse', icon: BarChart, path: '/content-studio?tab=analytics', section: 'Navigatie', shortcut: 'G A', keywords: 'analytics prestaties performance' },
  { id: 'nav-media', label: 'Mediabibliotheek', icon: PhotoLibrary, path: '/media', section: 'Navigatie', shortcut: 'G M', keywords: 'media library afbeeldingen fotos videos' },
  { id: 'nav-branding', label: 'Merk Profiel', icon: Palette, path: '/branding', section: 'Navigatie', shortcut: 'G S', keywords: 'branding profiel tone of voice' },
  { id: 'nav-pois', label: "POI's", icon: Place, path: '/pois', section: 'Navigatie', keywords: 'points of interest locaties plekken' },
  { id: 'nav-reviews', label: 'Reviews', icon: RateReview, path: '/reviews', section: 'Navigatie', keywords: 'beoordelingen ratings' },
  { id: 'nav-pages', label: "Pagina's & Navigatie", icon: Description, path: '/pages', section: 'Navigatie', keywords: 'website pages navigatie' },
  { id: 'nav-commerce', label: 'Commerce', icon: Storefront, path: '/commerce', section: 'Navigatie', keywords: 'verkoop tickets reserveringen' },
  { id: 'nav-partners', label: 'Partners', icon: Handshake, path: '/partners', section: 'Navigatie', keywords: 'partners samenwerking' },
  { id: 'nav-financial', label: 'Financieel', icon: AccountBalance, path: '/financial', section: 'Navigatie', keywords: 'financieel settlements payouts' },
  { id: 'nav-intermediary', label: 'Intermediair', icon: SwapHoriz, path: '/intermediary', section: 'Navigatie', keywords: 'intermediair transacties commissie' },
  { id: 'nav-agents', label: 'Agents', icon: SmartToy, path: '/agents', section: 'Navigatie', keywords: 'agents systeem ai monitoring', adminOnly: true },
  { id: 'nav-users', label: 'Gebruikers', icon: People, path: '/users', section: 'Navigatie', keywords: 'users beheer accounts', adminOnly: true },
  { id: 'nav-settings', label: 'Instellingen', icon: Settings, path: '/settings', section: 'Navigatie', keywords: 'settings configuratie', adminOnly: true },
  { id: 'nav-onboarding', label: 'Onboarding', icon: AddCircleOutline, path: '/onboarding', section: 'Navigatie', keywords: 'onboarding setup wizard', adminOnly: true },

  // CONTENT ACTIES (8)
  { id: 'act-new-concept', label: 'Nieuw concept', icon: Add, path: '/content-studio?action=new', section: 'Content Acties', shortcut: 'N C', keywords: 'nieuw concept aanmaken create' },
  { id: 'act-new-blog', label: 'Nieuw blog', icon: Article, path: '/content-studio?action=new&type=blog', section: 'Content Acties', shortcut: 'N B', keywords: 'nieuw blog artikel' },
  { id: 'act-new-social', label: 'Nieuwe social post', icon: Edit, path: '/content-studio?action=new&type=social', section: 'Content Acties', shortcut: 'N S', keywords: 'nieuw social post facebook instagram' },
  { id: 'act-new-campaign', label: 'Nieuwe campagne', icon: Campaign, path: '/content-studio?action=campaign', section: 'Content Acties', shortcut: 'N P', keywords: 'campagne campaign planning' },
  { id: 'act-generate', label: 'Genereer suggesties', icon: AutoFixHigh, path: '/content-studio?tab=suggestions&action=generate', section: 'Content Acties', keywords: 'genereer ai suggesties ideeen' },
  { id: 'act-autofill', label: 'Auto-fill kalender', icon: CalendarMonth, path: '/content-studio?tab=calendar&action=autofill', section: 'Content Acties', keywords: 'auto fill kalender planning automatisch' },
  { id: 'act-bulk-publish', label: 'Bulk publiceren', icon: Publish, path: '/content-studio?tab=items&action=bulk-publish', section: 'Content Acties', keywords: 'bulk publish publiceren meerdere' },
  { id: 'act-rewrite', label: 'AI herschrijven', icon: Refresh, path: '/content-studio?action=rewrite', section: 'Content Acties', keywords: 'herschrijven rewrite ai alternatief' },

  // MEDIA (2)
  { id: 'media-upload', label: 'Media uploaden', icon: CloudUpload, path: '/media?action=upload', section: 'Media', keywords: 'upload media afbeelding foto video' },
  { id: 'media-search', label: 'Zoek in media', icon: Search, path: '/media?focus=search', section: 'Media', keywords: 'zoek media afbeeldingen fotos' },

  // VISUEEL (2)
  { id: 'vis-analyse', label: 'AI Analyse starten', icon: AutoFixHigh, path: '/content-studio?tab=sources&subtab=visuals&action=analyze', section: 'Visueel', keywords: 'visual trend analyse ai starten' },
  { id: 'vis-refresh', label: 'Visuele Trends vernieuwen', icon: Refresh, path: '/content-studio?tab=sources&subtab=visuals&action=refresh', section: 'Visueel', keywords: 'visueel trends refresh vernieuwen' },

  // ZOEKEN (2)
  { id: 'search-content', label: 'Zoek in alle content', icon: Search, path: '/content-studio?focus=search', section: 'Zoeken', shortcut: '/', keywords: 'zoek search content items' },
  { id: 'search-pois', label: 'Zoek POIs', icon: Place, path: '/pois?focus=search', section: 'Zoeken', keywords: 'zoek pois locaties restaurants' },

  // INSTELLINGEN (4)
  { id: 'set-switch-dest', label: 'Wissel destination', icon: SwapHoriz, section: 'Instellingen', keywords: 'switch destination wissel bestemming calpe texel', action: 'switch-destination' },
  { id: 'set-switch-lang', label: 'Wissel taal', icon: Language, section: 'Instellingen', keywords: 'taal language switch wissel nl en de es fr', action: 'switch-language' },
  { id: 'set-shortcuts', label: 'Toon sneltoetsen', icon: Keyboard, section: 'Instellingen', shortcut: '?', keywords: 'shortcuts sneltoetsen keyboard help', action: 'show-shortcuts' },
  { id: 'set-logout', label: 'Uitloggen', icon: Logout, section: 'Instellingen', keywords: 'logout uitloggen afmelden', action: 'logout' },
];

const SECTION_ORDER = ['Recent', 'Navigatie', 'Content Acties', 'Media', 'Visueel', 'Zoeken', 'Instellingen'];

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const selectedDestination = useDestinationStore(s => s.selectedDestination);
  const destinations = useDestinationStore(s => s.destinations);
  const setDestination = useDestinationStore(s => s.setDestination);
  const [query, setQuery] = useState('');
  const [recentItems, setRecentItems] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef(null);

  const isAdmin = user && user.role === 'platform_admin';

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    let destId = null;
    if (selectedDestination && selectedDestination !== 'all') {
      const found = destinations.find(d => d.code === selectedDestination);
      destId = found && found.id;
    }
    if (!destId && user && user.allowed_destinations) destId = user.allowed_destinations[0];
    if (!destId) return;
    contentService.getItems(destId, { limit: 5 })
      .then(resp => {
        const list = (resp && resp.data && resp.data.items) || (resp && resp.items) || (Array.isArray(resp) ? resp : []);
        setRecentItems(list.slice(0, 5).map(item => ({
          id: 'recent-' + item.id,
          label: item.title || 'Untitled',
          icon: Article,
          path: '/content-studio?item=' + item.id,
          section: 'Recent',
          keywords: item.approval_status || '',
          subtitle: item.approval_status || '',
        })));
      })
      .catch(() => setRecentItems([]));
  }, [open, selectedDestination, destinations, user]);

  const recentActionIds = useMemo(() => getRecentActions(), [open]);

  const allCommands = useMemo(() => {
    const filtered = ALL_COMMANDS.filter(c => !c.adminOnly || isAdmin);
    const recentFromHistory = recentActionIds
      .map(id => filtered.find(c => c.id === id))
      .filter(Boolean)
      .map(c => ({ ...c, section: 'Recent', _isRecentRef: true }));
    return [...recentFromHistory, ...recentItems, ...filtered];
  }, [isAdmin, recentItems, recentActionIds]);

  const filtered = useMemo(() => {
    if (!query) return allCommands;
    return allCommands
      .filter(c => !c._isRecentRef && c.section !== 'Recent')
      .filter(c => fuzzyMatch(query, c.label, c.keywords));
  }, [query, allCommands]);

  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(c => {
      if (!groups[c.section]) groups[c.section] = [];
      groups[c.section].push(c);
    });
    const ordered = [];
    SECTION_ORDER.forEach(sec => { if (groups[sec]) ordered.push([sec, groups[sec]]); });
    Object.keys(groups).forEach(sec => { if (!SECTION_ORDER.includes(sec)) ordered.push([sec, groups[sec]]); });
    return ordered;
  }, [filtered]);

  const flatList = filtered;

  const execute = useCallback((cmd) => {
    if (!cmd) return;
    onClose();
    if (cmd.id.indexOf('recent-') !== 0 && !cmd._isRecentRef) saveRecentAction(cmd.id);
    if (cmd.action === 'logout') { logout(); return; }
    if (cmd.action === 'switch-destination') {
      const codes = destinations.map(d => d.code);
      const idx = codes.indexOf(selectedDestination);
      const next = codes[(idx + 1) % codes.length];
      if (next) setDestination(next);
      return;
    }
    if (cmd.action === 'switch-language') {
      const langs = ['nl', 'en', 'de', 'es', 'fr'];
      const ci = langs.indexOf(i18n.language);
      i18n.changeLanguage(langs[(ci + 1) % langs.length]);
      return;
    }
    if (cmd.action === 'show-shortcuts') {
      window.dispatchEvent(new CustomEvent('hb:show-shortcuts'));
      return;
    }
    if (cmd.path) navigate(cmd.path);
  }, [navigate, onClose, logout, destinations, selectedDestination, setDestination, i18n]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => {
        const next = Math.min(i + 1, flatList.length - 1);
        scrollToIndex(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => {
        const next = Math.max(i - 1, 0);
        scrollToIndex(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      execute(flatList[activeIndex]);
    }
  };

  const scrollToIndex = (index) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-cmd-item]');
    if (items[index]) items[index].scrollIntoView({ block: 'nearest' });
  };

  let runningIndex = -1;
  const resultCount = filtered.length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          position: 'fixed',
          top: '12%',
          m: 0,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
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
                  <Search sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              disableUnderline: true,
              sx: { fontSize: '1.05rem' },
            }}
          />
          {query && (
            <Chip
              label={String(resultCount)}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 22, minWidth: 28 }}
            />
          )}
        </Box>

        <Box
          ref={listRef}
          sx={{ borderTop: '1px solid', borderColor: 'divider', maxHeight: '55vh', overflow: 'auto' }}
        >
          {flatList.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">Geen resultaten</Typography>
            </Box>
          )}
          {grouped.map(([sectionName, items]) => (
            <Box key={sectionName}>
              <Typography
                variant="caption"
                sx={{
                  display: 'block', px: 2, pt: 1.5, pb: 0.5,
                  color: 'text.secondary', fontWeight: 600,
                  fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                }}
              >
                {sectionName}
              </Typography>
              <List dense disablePadding>
                {items.map((cmd) => {
                  runningIndex += 1;
                  const isActive = runningIndex === activeIndex;
                  const Icon = cmd.icon;
                  return (
                    <ListItemButton
                      key={cmd.id + '-' + runningIndex}
                      data-cmd-item="true"
                      selected={isActive}
                      onClick={() => execute(cmd)}
                      sx={{
                        py: 0.75, mx: 0.5, borderRadius: 1,
                        '&.Mui-selected': { bgcolor: 'rgba(2, 195, 154, 0.12)', '&:hover': { bgcolor: 'rgba(2, 195, 154, 0.18)' } },
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32, color: isActive ? '#02C39A' : 'text.secondary' }}>
                        <Icon fontSize="small" sx={{ fontSize: '1.1rem' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={cmd.label}
                        secondary={cmd.subtitle || undefined}
                        primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: isActive ? 500 : 400 }}
                        secondaryTypographyProps={{ fontSize: '0.75rem' }}
                      />
                      {cmd.shortcut && (
                        <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                          {cmd.shortcut.split(' ').map((key, ki) => (
                            <Box
                              key={ki}
                              sx={{
                                px: 0.75, py: 0.25, borderRadius: 0.5,
                                border: '1px solid', borderColor: 'divider',
                                bgcolor: 'action.hover',
                                fontSize: '0.65rem', fontWeight: 600,
                                color: 'text.secondary', fontFamily: 'monospace', lineHeight: 1.4,
                              }}
                            >
                              {key}
                            </Box>
                          ))}
                        </Box>
                      )}
                      {isActive && !cmd.shortcut && (
                        <Chip label="Enter" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                      )}
                    </ListItemButton>
                  );
                })}
              </List>
            </Box>
          ))}
        </Box>

        <Box sx={{
          px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider',
          display: 'flex', gap: 2.5, fontSize: '0.7rem', color: 'text.secondary', alignItems: 'center',
        }}>
          <span>{'\u2191\u2193'} navigeren</span>
          <span>{'\u21B5'} uitvoeren</span>
          <span>Esc sluiten</span>
          <Box sx={{ flex: 1 }} />
          <span style={{ opacity: 0.6 }}>{resultCount} {resultCount === 1 ? 'resultaat' : 'resultaten'}</span>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
