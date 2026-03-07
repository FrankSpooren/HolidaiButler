import {
  Dialog, DialogTitle, DialogContent, Grid, Card, CardActionArea, CardContent,
  Typography, Box, IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import * as MuiIcons from '@mui/icons-material';
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
