import React from 'react';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const Campaigns = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Campaigns</Typography>
        <Button variant="contained" startIcon={<AddIcon />}>New Campaign</Button>
      </Box>
      <Card><CardContent><Typography color="text.secondary">Marketing campaign management with ROI tracking and lead attribution.</Typography></CardContent></Card>
    </Box>
  );
};

export default Campaigns;
