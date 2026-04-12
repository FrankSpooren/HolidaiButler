import { Box, Tabs, Tab, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

const TAB_CONFIG = [
  { labelKey: 'media.tabs.library', fallback: 'Mediabibliotheek', icon: '\u{1F4C1}', source: 'library' },
  { labelKey: 'media.tabs.poi', fallback: 'POI Afbeeldingen', icon: '\u{1F4CD}', source: 'poi' },
  { labelKey: 'media.tabs.pexels', fallback: 'Pexels Stock', icon: '\u{1F5BC}', source: 'pexels' },
  { labelKey: 'media.tabs.cleanup', fallback: 'Opschonen', icon: '\u{1F9F9}', source: 'cleanup' },
];

export default function MediaSourceTabs({ activeTab, onTabChange }) {
  const { t } = useTranslation();

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
      <Tabs
        value={activeTab}
        onChange={(_, v) => onTabChange(v)}
        variant="standard"
      >
        {TAB_CONFIG.map((tab, i) => (
          <Tab
            key={tab.source}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <span>{tab.icon}</span>
                <span>{t(tab.labelKey, tab.fallback)}</span>
              </Box>
            }
            value={i}
          />
        ))}
      </Tabs>
    </Box>
  );
}
