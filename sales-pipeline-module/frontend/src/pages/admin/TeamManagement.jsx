import React from 'react';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import { GroupAdd as AddIcon } from '@mui/icons-material';

const TeamManagement = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Team Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />}>Create Team</Button>
      </Box>
      <Card><CardContent><Typography color="text.secondary">Manage sales teams, assign members, and set team quotas.</Typography></CardContent></Card>
    </Box>
  );
};

export default TeamManagement;
