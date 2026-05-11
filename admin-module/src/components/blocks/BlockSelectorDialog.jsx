import { useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Tabs, Tab, Grid, Card, CardActionArea,
  Typography, Box, IconButton, TextField, InputAdornment, Chip, Tooltip, Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import LockIcon from '@mui/icons-material/Lock';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import StarIcon from '@mui/icons-material/Star';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Article from '@mui/icons-material/Article';
import BookOnline from '@mui/icons-material/BookOnline';
import Campaign from '@mui/icons-material/Campaign';
import Category from '@mui/icons-material/Category';
import Chat from '@mui/icons-material/Chat';
import Collections from '@mui/icons-material/Collections';
import ConfirmationNumber from '@mui/icons-material/ConfirmationNumber';
import ContactMail from '@mui/icons-material/ContactMail';
import Email from '@mui/icons-material/Email';
import Event from '@mui/icons-material/Event';
import EventNote from '@mui/icons-material/EventNote';
import FileDownload from '@mui/icons-material/FileDownload';
import FilterList from '@mui/icons-material/FilterList';
import FormatQuote from '@mui/icons-material/FormatQuote';
import GridView from '@mui/icons-material/GridView';
import Handshake from '@mui/icons-material/Handshake';
import Map from '@mui/icons-material/Map';
import Panorama from '@mui/icons-material/Panorama';
import PinDrop from '@mui/icons-material/PinDrop';
import PlayCircle from '@mui/icons-material/PlayCircle';
import QuestionAnswer from '@mui/icons-material/QuestionAnswer';
import Share from '@mui/icons-material/Share';
import SmartToy from '@mui/icons-material/SmartToy';
import Stars from '@mui/icons-material/Stars';
import TipsAndUpdates from '@mui/icons-material/TipsAndUpdates';
import TouchApp from '@mui/icons-material/TouchApp';
import ViewModule from '@mui/icons-material/ViewModule';
import ViewTimeline from '@mui/icons-material/ViewTimeline';
import WbSunny from '@mui/icons-material/WbSunny';

const MuiIcons = {
  Article, BookOnline, Campaign, Category, Chat, Collections, ConfirmationNumber,
  ContactMail, Email, Event, EventNote, FileDownload, FilterList, FormatQuote,
  GridView, Handshake, Map, Panorama, PinDrop, PlayCircle, QuestionAnswer,
  Share, SmartToy, Stars, TipsAndUpdates, TouchApp, ViewModule, ViewTimeline, WbSunny
};

import { useTranslation } from 'react-i18next';
import { CATEGORIES, getBlocksByCategory } from './blockEditorRegistry.js';
import useDestinationStore from '../../stores/destinationStore.js';

/**
 * BlockSelectorDialog — VII-E4 Cluster 1 (E4.1.1)
 *
 * Features:
 * - Search across block labels + descriptions
 * - Feature-flag gating: unavailable blocks shown grayed with lock + reason
 * - Category tabs (scrollable, i18n)
 * - Dependency warnings (excluded_with, recommended_with)
 * - "All" tab showing search results across categories
 */
export default function BlockSelectorDialog({ open, onClose, onSelect, currentBlocks = [] }) {
  const { t } = useTranslation();
  const [categoryTab, setCategoryTab] = useState(0);
  const [search, setSearch] = useState('');
  const featureFlags = useDestinationStore(s => s.getSelectedFeatureFlags());

  // Current block types in page (for dependency checks)
  const currentBlockTypes = useMemo(
    () => new Set((currentBlocks || []).map(b => b.type)),
    [currentBlocks]
  );

  // "All" tab (index 0) + category tabs
  const allCategories = ['all', ...CATEGORIES];

  // Get blocks for current category
  const categoryBlocks = useMemo(() => {
    if (categoryTab === 0) {
      // "All" tab: aggregate all categories
      return CATEGORIES.flatMap(cat => getBlocksByCategory(cat));
    }
    return getBlocksByCategory(CATEGORIES[categoryTab - 1]);
  }, [categoryTab]);

  // Filter by search
  const filteredBlocks = useMemo(() => {
    if (!search.trim()) return categoryBlocks;
    const q = search.toLowerCase();
    return categoryBlocks.filter(b =>
      (b.label || '').toLowerCase().includes(q) ||
      (b.description || '').toLowerCase().includes(q) ||
      (b.type || '').toLowerCase().includes(q)
    );
  }, [categoryBlocks, search]);

  // Check feature flag availability per block
  const isBlockAvailable = (block) => {
    if (!block.featureFlag) return true;
    return featureFlags[block.featureFlag] === true;
  };

  // Dependency warnings
  const getWarnings = (block) => {
    const warnings = [];
    // Duplicate check: block type already on page
    if (currentBlockTypes.has(block.type)) {
      warnings.push({ severity: 'info', message: t('blocks.warnings.alreadyOnPage', 'Dit block staat al op deze pagina') });
    }
    return warnings;
  };

  const handleSelect = (type) => {
    onSelect(type);
    onClose();
    setSearch('');
    setCategoryTab(0);
  };

  const handleClose = () => {
    onClose();
    setSearch('');
    setCategoryTab(0);
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        {t('pages.addBlock', 'Block toevoegen')}
        <IconButton onClick={handleClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {/* Search bar */}
        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={t('blocks.search', 'Zoek op naam of beschrijving...')}
            value={search}
            onChange={e => { setSearch(e.target.value); if (e.target.value) setCategoryTab(0); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
              ),
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            autoFocus
          />
        </Box>

        {/* Category tabs */}
        <Tabs
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          value={categoryTab}
          onChange={(_, v) => setCategoryTab(v)}
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider', minHeight: 40, '& .MuiTab-root': { minHeight: 40, py: 0.5, textTransform: 'none', fontSize: '0.8rem' } }}
        >
          <Tab label={t('blocks.category.all', 'Alles') + ` (${categoryBlocks.length})`} />
          {CATEGORIES.map(cat => {
            const count = getBlocksByCategory(cat).length;
            return <Tab key={cat} label={`${t(`blocks.category.${cat}`, cat)} (${count})`} />;
          })}
        </Tabs>

        {/* Block grid */}
        <Box sx={{ p: 2 }}>
          {search && filteredBlocks.length === 0 && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                {t('blocks.noResults', 'Geen blocks gevonden voor "{{query}}"').replace('{{query}}', search)}
              </Typography>
            </Box>
          )}

          <Grid container spacing={2}>
            {filteredBlocks.map(({ type, icon, label, description, thumbnail, featureFlag }) => {
              const IconComponent = MuiIcons[icon] || MuiIcons.Article;
              const available = isBlockAvailable({ featureFlag });
              const warnings = getWarnings({ type });
              const hasWarning = warnings.length > 0;

              return (
                <Grid item xs={12} sm={6} md={4} key={type}>
                  <Tooltip
                    title={!available ? t('blocks.locked.featureFlag', 'Feature niet geactiveerd voor deze bestemming. Vraag platform_admin.') : ''}
                    arrow
                  >
                    <Card
                      variant="outlined"
                      sx={{
                        height: '100%',
                        opacity: available ? 1 : 0.5,
                        '&:hover': available ? { borderColor: 'primary.main', boxShadow: 2 } : {},
                        transition: 'all 0.2s',
                        position: 'relative',
                      }}
                    >
                      <CardActionArea
                        onClick={() => available && handleSelect(type)}
                        disabled={!available}
                        sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                      >
                        {/* Thumbnail */}
                        {thumbnail ? (
                          <Box
                            sx={{ width: '100%', height: 100, p: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc', borderBottom: 1, borderColor: 'divider' }}
                            dangerouslySetInnerHTML={{ __html: thumbnail }}
                          />
                        ) : (
                          <Box sx={{ width: '100%', height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider' }}>
                            <IconComponent sx={{ fontSize: 40, color: 'primary.main' }} />
                          </Box>
                        )}

                        {/* Content */}
                        <Box sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.paper', flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.25 }}>
                            <Typography variant="subtitle2" fontWeight={600} color="text.primary" noWrap>
                              {label}
                            </Typography>
                            {!available && <LockIcon sx={{ fontSize: 14, color: 'text.disabled' }} />}
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3, minHeight: 28 }}>
                            {description}
                          </Typography>

                          {/* Badges */}
                          <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
                            {featureFlag && available && (
                              <Chip label="E2" size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#eff6ff', color: '#3b82f6' }} />
                            )}
                            {hasWarning && (
                              <Chip
                                icon={<WarningAmberIcon sx={{ fontSize: '12px !important' }} />}
                                label={t('blocks.badges.onPage', 'al op pagina')}
                                size="small"
                                sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#fef3c7', color: '#92400e' }}
                              />
                            )}
                          </Box>
                        </Box>
                      </CardActionArea>
                    </Card>
                  </Tooltip>
                </Grid>
              );
            })}
          </Grid>

          {!search && filteredBlocks.length === 0 && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">{t('pages.noBlocksInCategory', 'Geen blocks in deze categorie')}</Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
