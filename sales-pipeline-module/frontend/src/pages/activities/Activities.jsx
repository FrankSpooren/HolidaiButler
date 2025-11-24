import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const Activities = () => {
  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>Activities</Typography>
      <Card><CardContent><Typography color="text.secondary">Activity timeline showing all CRM interactions: calls, emails, meetings, and notes.</Typography></CardContent></Card>
    </Box>
  );
};

export default Activities;
