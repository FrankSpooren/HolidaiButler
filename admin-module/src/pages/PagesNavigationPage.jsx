import { useState } from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import { useTranslation } from 'react-i18next';
import PagesPage from './PagesPage.jsx';
import NavigationPage from './NavigationPage.jsx';

export default function PagesNavigationPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {t('nav.pagesNav', "Pagina's & Navigatie")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('pagesNav.subtitle', 'Beheer pagina-layouts, blokken en navigatie-items')}
        </Typography>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 0, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab
          icon={<ArticleIcon sx={{ fontSize: 18 }} />}
          iconPosition="start"
          label={t('pagesNav.tab.pages', "Pagina's")}
          sx={{ minHeight: 48, textTransform: 'none' }}
        />
        <Tab
          icon={<MenuOpenIcon sx={{ fontSize: 18 }} />}
          iconPosition="start"
          label={t('pagesNav.tab.navigation', 'Navigatie')}
          sx={{ minHeight: 48, textTransform: 'none' }}
        />
      </Tabs>

      {activeTab === 0 && <PagesPage embedded />}
      {activeTab === 1 && <NavigationPage embedded />}
    </Box>
  );
}
