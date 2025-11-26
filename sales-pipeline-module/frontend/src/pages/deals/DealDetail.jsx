import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Grid, Card, CardContent, Button, Chip, Avatar, Tabs, Tab, IconButton, Divider } from '@mui/material';
import { ArrowBack, Edit, Phone, Email, Event, MoreVert } from '@mui/icons-material';
import useDealStore from '../../store/dealStore';

const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value || 0);

const DealDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { deal, isLoading, fetchDeal } = useDealStore();
  const [tab, setTab] = useState(0);

  useEffect(() => { fetchDeal(id); }, [id]);

  if (isLoading || !deal) return <Box sx={{ p: 3 }}><Typography>Loading...</Typography></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate(-1)}><ArrowBack /></IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" fontWeight={700}>{deal.title}</Typography>
          <Typography variant="body2" color="text.secondary">{deal.account?.name || 'No account'}</Typography>
        </Box>
        <Button variant="outlined" startIcon={<Edit />}>Edit</Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="Overview" />
              <Tab label="Activities" />
              <Tab label="Notes" />
              <Tab label="Files" />
            </Tabs>
            <CardContent>
              {tab === 0 && (
                <Box>
                  <Typography variant="h5" fontWeight={700} color="primary.main" gutterBottom>{formatCurrency(deal.value)}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip label={deal.stage?.name || 'Unknown Stage'} color="primary" />
                    <Chip label={`${deal.probability}% probability`} variant="outlined" />
                    {deal.priority && <Chip label={deal.priority} color={deal.priority === 'high' ? 'error' : 'default'} />}
                  </Box>
                  <Typography variant="body1" color="text.secondary">{deal.description || 'No description'}</Typography>
                </Box>
              )}
              {tab === 1 && <Typography color="text.secondary">Activity timeline will appear here</Typography>}
              {tab === 2 && <Typography color="text.secondary">Notes will appear here</Typography>}
              {tab === 3 && <Typography color="text.secondary">Files will appear here</Typography>}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Quick Actions</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="outlined" startIcon={<Phone />} size="small">Call</Button>
                <Button variant="outlined" startIcon={<Email />} size="small">Email</Button>
                <Button variant="outlined" startIcon={<Event />} size="small">Meeting</Button>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Deal Owner</Typography>
              {deal.owner ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar>{deal.owner.firstName?.[0]}{deal.owner.lastName?.[0]}</Avatar>
                  <Typography>{deal.owner.firstName} {deal.owner.lastName}</Typography>
                </Box>
              ) : <Typography color="text.secondary">Unassigned</Typography>}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DealDetail;
