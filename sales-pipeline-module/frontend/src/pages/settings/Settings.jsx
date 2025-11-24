import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, List, ListItemButton, ListItemIcon, ListItemText, Divider, Grid } from '@mui/material';
import { Person, Security, Notifications, Business, Tune, IntegrationInstructions } from '@mui/icons-material';

const settingsSections = [
  { id: 'profile', label: 'Profile', icon: Person, description: 'Manage your personal information' },
  { id: 'security', label: 'Security', icon: Security, description: 'Password, 2FA, and sessions' },
  { id: 'notifications', label: 'Notifications', icon: Notifications, description: 'Email and push notification preferences' },
  { id: 'company', label: 'Company', icon: Business, description: 'Organization settings' },
  { id: 'pipelines', label: 'Pipelines', icon: Tune, description: 'Configure sales pipelines and stages' },
  { id: 'integrations', label: 'Integrations', icon: IntegrationInstructions, description: 'Connected apps and services' }
];

const Settings = () => {
  const { tab } = useParams();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(tab || 'profile');

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>Settings</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <List disablePadding>
              {settingsSections.map((section, i) => (
                <React.Fragment key={section.id}>
                  <ListItemButton selected={activeSection === section.id} onClick={() => { setActiveSection(section.id); navigate('/settings/' + section.id); }}>
                    <ListItemIcon><section.icon /></ListItemIcon>
                    <ListItemText primary={section.label} />
                  </ListItemButton>
                  {i < settingsSections.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Card>
        </Grid>
        <Grid item xs={12} md={9}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>{settingsSections.find(s => s.id === activeSection)?.label}</Typography>
              <Typography color="text.secondary">{settingsSections.find(s => s.id === activeSection)?.description}. Full settings panel under development.</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;
