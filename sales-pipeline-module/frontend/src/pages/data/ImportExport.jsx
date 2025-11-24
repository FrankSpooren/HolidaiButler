import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Grid, Button, Tabs, Tab } from '@mui/material';
import { Upload, Download, History } from '@mui/icons-material';

const ImportExport = () => {
  const [tab, setTab] = useState(0);
  
  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>Import / Export</Typography>
      <Card>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab icon={<Upload />} label="Import" iconPosition="start" />
          <Tab icon={<Download />} label="Export" iconPosition="start" />
          <Tab icon={<History />} label="History" iconPosition="start" />
        </Tabs>
        <CardContent>
          {tab === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>Import Data</Typography>
              <Typography color="text.secondary" gutterBottom>Import contacts, accounts, deals, and leads from CSV, Excel, or JSON files.</Typography>
              <Button variant="contained" startIcon={<Upload />} sx={{ mt: 2 }}>Select File</Button>
            </Box>
          )}
          {tab === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>Export Data</Typography>
              <Typography color="text.secondary" gutterBottom>Export your CRM data to CSV, Excel, or JSON format.</Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item><Button variant="outlined">Export Deals</Button></Grid>
                <Grid item><Button variant="outlined">Export Contacts</Button></Grid>
                <Grid item><Button variant="outlined">Export Accounts</Button></Grid>
                <Grid item><Button variant="outlined">Export All</Button></Grid>
              </Grid>
            </Box>
          )}
          {tab === 2 && <Typography color="text.secondary">Import/Export job history will appear here.</Typography>}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ImportExport;
