import React from 'react';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import { PersonAdd as AddIcon } from '@mui/icons-material';

const UserManagement = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>User Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />}>Add User</Button>
      </Box>
      <Card><CardContent><Typography color="text.secondary">Manage users: create, deactivate, delete accounts. Assign roles and permissions.</Typography></CardContent></Card>
    </Box>
  );
};

export default UserManagement;
