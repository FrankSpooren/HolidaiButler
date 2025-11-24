import React from 'react';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const Tasks = () => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Tasks</Typography>
        <Button variant="contained" startIcon={<AddIcon />}>New Task</Button>
      </Box>
      <Card><CardContent><Typography color="text.secondary">Task management with reminders, priorities, and team assignment.</Typography></CardContent></Card>
    </Box>
  );
};

export default Tasks;
