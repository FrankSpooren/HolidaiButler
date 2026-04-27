import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Tabs, Tab, Grid, Card, CardActionArea,
  CardContent, Typography, Box, IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
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

// Icon map — only imports used icons (was: import * as MuiIcons — 3.8MB!)
const MuiIcons = {
  Article,
  BookOnline,
  Campaign,
  Category,
  Chat,
  Collections,
  ConfirmationNumber,
  ContactMail,
  Email,
  Event,
  EventNote,
  FileDownload,
  FilterList,
  FormatQuote,
  GridView,
  Handshake,
  Map,
  Panorama,
  PinDrop,
  PlayCircle,
  QuestionAnswer,
  Share,
  SmartToy,
  Stars,
  TipsAndUpdates,
  TouchApp,
  ViewModule,
  ViewTimeline,
  WbSunny
};
import { useTranslation } from 'react-i18next';
import { CATEGORIES, getBlocksByCategory } from './blockEditorRegistry.js';

export default function BlockSelectorDialog({ open, onClose, onSelect }) {
  const { t } = useTranslation();
  const [categoryTab, setCategoryTab] = useState(0);
  const category = CATEGORIES[categoryTab];
  const blocks = getBlocksByCategory(category);

  const handleSelect = (type) => {
    onSelect(type);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {t('pages.addBlock', 'Add Block')}
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Tabs
          value={categoryTab}
          onChange={(_, v) => setCategoryTab(v)}
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          {CATEGORIES.map(cat => (
            <Tab key={cat} label={cat} />
          ))}
        </Tabs>
        <Grid container spacing={2}>
          {blocks.map(({ type, icon, label, description, thumbnail }) => {
            const IconComponent = MuiIcons[icon] || MuiIcons.Extension;
            return (
              <Grid item xs={12} sm={6} md={4} key={type}>
                <Card variant="outlined" sx={{ height: '100%', '&:hover': { borderColor: 'primary.main', boxShadow: 2 }, transition: 'all 0.2s' }}>
                  <CardActionArea onClick={() => handleSelect(type)} sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                    {thumbnail ? (
                      <Box
                        sx={{
                          width: '100%',
                          height: 120,
                          p: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: '#f8fafc',
                          borderBottom: 1,
                          borderColor: 'divider'
                        }}
                        dangerouslySetInnerHTML={{ __html: thumbnail }}
                      />
                    ) : (
                      <Box sx={{ width: '100%', height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider' }}>
                        <IconComponent sx={{ fontSize: 48, color: 'primary.main' }} />
                      </Box>
                    )}
                    <Box sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.paper' }}>
                      <Typography variant="subtitle2" fontWeight={600} color="text.primary">{label}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>{description}</Typography>
                    </Box>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
        {blocks.length === 0 && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">{t('pages.noBlocksInCategory')}</Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
