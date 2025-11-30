import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Container, Typography, TextField, InputAdornment, Grid, Card, CardMedia, CardContent, CardActions, Button, Chip, Tabs, Tab, Rating } from '@mui/material';
import { Search as SearchIcon, LocationOn } from '@mui/icons-material';

const SearchResultsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [activeTab, setActiveTab] = useState(0);

  const results = {
    experiences: [
      { id: 1, name: 'Terra Natura Benidorm', category: 'Familie', location: 'Benidorm', price: 25, rating: 4.7 },
      { id: 2, name: 'Peñón de Ifach', category: 'Natuur', location: 'Calpe', price: 15, rating: 4.9 },
    ],
    restaurants: [
      { id: 1, name: 'La Perla', category: 'Mediterraans', location: 'Calpe', rating: 4.6 },
      { id: 2, name: 'El Cirer', category: 'Spaans', location: 'Altea', rating: 4.8 },
    ],
    events: [
      { id: 1, name: 'Fiestas de Calpe', category: 'Festival', date: '2024-08-15' },
      { id: 2, name: 'Live Jazz Night', category: 'Muziek', date: '2024-07-05' },
    ],
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams({ q: searchQuery });
  };

  const tabs = [
    { label: `Alles (${Object.values(results).flat().length})`, value: 0 },
    { label: `Ervaringen (${results.experiences.length})`, value: 1 },
    { label: `Restaurants (${results.restaurants.length})`, value: 2 },
    { label: `Evenementen (${results.events.length})`, value: 3 },
  ];

  return (
    <Box sx={{ py: 4, bgcolor: 'grey.50', minHeight: '80vh' }}>
      <Container maxWidth="lg">
        <Typography variant="h3" fontWeight={700} gutterBottom>
          Zoekresultaten
        </Typography>

        <TextField
          component="form"
          onSubmit={handleSearch}
          fullWidth
          placeholder="Zoek ervaringen, restaurants, evenementen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
          }}
          sx={{ mb: 3, bgcolor: 'white' }}
        />

        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3 }}>
          {tabs.map((tab) => (
            <Tab key={tab.value} label={tab.label} />
          ))}
        </Tabs>

        <Grid container spacing={3}>
          {(activeTab === 0 || activeTab === 1) && results.experiences.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={`exp-${item.id}`}>
              <Card sx={{ cursor: 'pointer', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }, transition: 'all 0.3s' }}>
                <CardContent>
                  <Chip label={item.category} size="small" sx={{ mb: 1 }} />
                  <Typography variant="h6" fontWeight={600}>{item.name}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">{item.location}</Typography>
                  </Box>
                  <Rating value={item.rating} readOnly size="small" precision={0.1} />
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Typography variant="h6" color="primary" fontWeight={700}>€{item.price}</Typography>
                  <Button variant="contained" size="small" onClick={() => navigate(`/experiences/${item.id}`)}>Bekijk</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}

          {(activeTab === 0 || activeTab === 2) && results.restaurants.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={`rest-${item.id}`}>
              <Card sx={{ cursor: 'pointer', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }, transition: 'all 0.3s' }}>
                <CardContent>
                  <Chip label={item.category} size="small" sx={{ mb: 1 }} />
                  <Typography variant="h6" fontWeight={600}>{item.name}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">{item.location}</Typography>
                  </Box>
                  <Rating value={item.rating} readOnly size="small" precision={0.1} />
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button variant="contained" fullWidth onClick={() => navigate(`/restaurants/${item.id}`)}>Reserveren</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}

          {(activeTab === 0 || activeTab === 3) && results.events.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={`evt-${item.id}`}>
              <Card sx={{ cursor: 'pointer', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }, transition: 'all 0.3s' }}>
                <CardContent>
                  <Chip label={item.category} size="small" sx={{ mb: 1 }} />
                  <Typography variant="h6" fontWeight={600}>{item.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{item.date}</Typography>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button variant="contained" fullWidth onClick={() => navigate(`/agenda/${item.id}`)}>Meer info</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default SearchResultsPage;
