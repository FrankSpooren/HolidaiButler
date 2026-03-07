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
          {blocks.map(({ type, icon, label, description }) => {
            const IconComponent = MuiIcons[icon] || MuiIcons.Extension;
            return (
              <Grid item xs={12} sm={6} md={4} key={type}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardActionArea onClick={() => handleSelect(type)} sx={{ height: '100%', p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <IconComponent sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="subtitle1" fontWeight={600}>{label}</Typography>
                    <Typography variant="caption" color="text.secondary">{description}</Typography>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
        {blocks.length === 0 && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">No blocks in this category</Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
