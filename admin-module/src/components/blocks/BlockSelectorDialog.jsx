import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Tabs, Tab, Grid, Card, CardActionArea,
  CardContent, Typography, Box, IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import * as MuiIcons from '@mui/icons-material';
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
                          bgcolor: 'grey.50',
                          borderBottom: 1,
                          borderColor: 'divider'
                        }}
                        dangerouslySetInnerHTML={{ __html: thumbnail }}
                      />
                    ) : (
                      <Box sx={{ width: '100%', height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
                        <IconComponent sx={{ fontSize: 48, color: 'primary.main' }} />
                      </Box>
                    )}
                    <Box sx={{ p: 1.5, textAlign: 'center' }}>
                      <Typography variant="subtitle2" fontWeight={600}>{label}</Typography>
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
