import {
  Dialog, DialogTitle, DialogContent, Grid, Card, CardActionArea, CardContent,
  Typography, Box, IconButton
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
import Explore from '@mui/icons-material/Explore';
import Home from '@mui/icons-material/Home';
import Info from '@mui/icons-material/Info';
import InsertDriveFile from '@mui/icons-material/InsertDriveFile';

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
  WbSunny,
  Explore,
  Home,
  Info,
  InsertDriveFile
};
import { useTranslation } from 'react-i18next';
import pageTemplates from '../data/pageTemplates.js';

export default function PageTemplateDialog({ open, onClose, onSelect }) {
  const { t } = useTranslation();

  const handleSelect = (template) => {
    onSelect(template);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {t('pages.chooseTemplate', 'Choose a Template')}
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          {pageTemplates.map((tmpl) => {
            const IconComponent = MuiIcons[tmpl.icon] || MuiIcons.InsertDriveFile;
            return (
              <Grid item xs={12} sm={6} md={4} key={tmpl.id}>
                <Card
                  variant="outlined"
                  sx={{
                    height: '100%',
                    '&:hover': { borderColor: 'primary.main', boxShadow: 2 },
                    transition: 'all 0.2s'
                  }}
                >
                  <CardActionArea
                    onClick={() => handleSelect(tmpl)}
                    sx={{ height: '100%', p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
                  >
                    <IconComponent sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="subtitle1" fontWeight={600}>{tmpl.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{tmpl.description}</Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5 }}>
                      {tmpl.layout.blocks.length} block{tmpl.layout.blocks.length !== 1 ? 's' : ''}
                    </Typography>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </DialogContent>
    </Dialog>
  );
}
