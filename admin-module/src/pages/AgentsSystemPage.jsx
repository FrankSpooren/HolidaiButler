import { useState } from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import BugReportIcon from '@mui/icons-material/BugReport';
import StorageIcon from '@mui/icons-material/Storage';
import { useTranslation } from 'react-i18next';
import AgentsPage from './AgentsPage.jsx';
import IssuesPage from './IssuesPage.jsx';
import { useSettings } from '../hooks/useSettings.js';

export default function AgentsSystemPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const { data: settingsData, isLoading } = useSettings();
  const system = settingsData?.data?.system || {};

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        {t('nav.agentsSystem', 'Agents & Systeem')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('agentsSystem.subtitle', 'Agent status, issues en systeeminformatie')}
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab icon={<SmartToyIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={t('agentsSystem.tabs.agents', 'Agent Status')} />
        <Tab icon={<BugReportIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={t('agentsSystem.tabs.issues', 'Issues & Alerts')} />
        <Tab icon={<StorageIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={t('agentsSystem.tabs.system', 'Systeem Info')} />
      </Tabs>

      {tab === 0 && <AgentsPage embedded />}
      {tab === 1 && <IssuesPage embedded />}
      {tab === 2 && (
        <Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
            <InfoCard label="Node.js" value={system.nodeVersion || '—'} />
            <InfoCard label="Uptime" value={system.uptime || '—'} />
            <InfoCard label="Environment" value={system.environment || '—'} />
            <InfoCard label="MySQL" value={system.mysql || '—'} color={system.mysql === 'connected' ? 'success.main' : 'error.main'} />
            <InfoCard label="MongoDB" value={system.mongodb || '—'} color={system.mongodb === 'connected' ? 'success.main' : 'error.main'} />
            <InfoCard label="Redis" value={system.redis || '—'} color={system.redis === 'ok' ? 'success.main' : 'error.main'} />
          </Box>

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            {t('agentsSystem.scheduledJobs', 'Scheduled Jobs')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            62 BullMQ jobs actief — content publishing (elke 15 min), SEO audit (maandag 04:00), score calibratie (zondag 05:00), website traffic (zondag 03:45), analytics (dagelijks 09:00).
          </Typography>
        </Box>
      )}
    </Box>
  );
}

function InfoCard({ label, value, color }) {
  return (
    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h6" fontWeight={700} sx={{ color: color || 'text.primary' }}>{value}</Typography>
    </Box>
  );
}
