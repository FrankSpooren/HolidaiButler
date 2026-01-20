import React from 'react';
import { Box, Typography, Card, CardContent, Grid } from '@mui/material';

const Reports = () => {
  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>Reports</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}><Card><CardContent><Typography variant="h6">Sales Performance</Typography><Typography variant="body2" color="text.secondary">Revenue, conversion rates, and sales velocity metrics.</Typography></CardContent></Card></Grid>
        <Grid item xs={12} md={6}><Card><CardContent><Typography variant="h6">Pipeline Analysis</Typography><Typography variant="body2" color="text.secondary">Pipeline health, stage distribution, and forecasting.</Typography></CardContent></Card></Grid>
        <Grid item xs={12} md={6}><Card><CardContent><Typography variant="h6">Team Performance</Typography><Typography variant="body2" color="text.secondary">Individual and team metrics leaderboard.</Typography></CardContent></Card></Grid>
        <Grid item xs={12} md={6}><Card><CardContent><Typography variant="h6">Activity Reports</Typography><Typography variant="body2" color="text.secondary">Call logs, email stats, and meeting analytics.</Typography></CardContent></Card></Grid>
      </Grid>
    </Box>
  );
};

export default Reports;
