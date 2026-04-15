import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Chip, IconButton, Tooltip, Alert, Skeleton, TableSortLabel
} from '@mui/material';
import { Refresh as RefreshIcon, Search as SearchIcon, TrendingUp as TrendIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import contentService from '../../api/contentService';

export default function SearchIntentTab({ destinationId }) {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState('impressions');
  const [sortOrder, setSortOrder] = useState('DESC');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await contentService.getSearchQueries(destinationId, { limit: 50 });
      if (res.success) {
        setItems(res.data.items || []);
        setConfigured(res.data.configured || false);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [destinationId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSort = (field) => {
    if (sortField === field) setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    else { setSortField(field); setSortOrder('DESC'); }
  };

  const sorted = [...items].sort((a, b) => {
    const dir = sortOrder === 'ASC' ? 1 : -1;
    if (sortField === 'keyword') return dir * (a.keyword || '').localeCompare(b.keyword || '');
    if (sortField === 'impressions') return dir * ((a.impressions || 0) - (b.impressions || 0));
    if (sortField === 'ctr') return dir * ((a.ctr || 0) - (b.ctr || 0));
    return 0;
  });

  const maxImpressions = Math.max(...items.map(i => i.impressions || 0), 1);

  const SortHeader = ({ field, children, align }) => (
    <TableCell align={align || 'left'} sortDirection={sortField === field ? sortOrder.toLowerCase() : false}>
      <TableSortLabel active={sortField === field} direction={sortField === field ? sortOrder.toLowerCase() : 'asc'}
        onClick={() => handleSort(field)}>
        {children}
      </TableSortLabel>
    </TableCell>
  );

  return (
    <Box>
      {!configured && !loading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Google Search Console is niet geconfigureerd voor deze bestemming. Zodra GSC credentials zijn ingesteld, verschijnen hier automatisch de top zoektermen.
        </Alert>
      )}

      {configured && items.length === 0 && !loading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Nog geen GSC data beschikbaar. De sync draait wekelijks op maandag 05:00. CalpeTrip.com is recent live gegaan — GSC data heeft doorgaans 3-5 dagen vertraging.
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, alignItems: 'center' }}>
        <Chip icon={<SearchIcon sx={{ fontSize: 16 }} />} label={'Zoektermen: ' + items.length} size="small" sx={{ fontWeight: 600, fontSize: 12 }} />
        <Chip label={configured ? 'GSC Actief' : 'GSC Niet geconfigureerd'} size="small" color={configured ? 'success' : 'default'} variant="outlined" sx={{ fontSize: 11 }} />
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Vernieuwen"><IconButton size="small" onClick={loadData}><RefreshIcon fontSize="small" /></IconButton></Tooltip>
      </Box>

      {items.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <SortHeader field="keyword">Zoekterm</SortHeader>
                <SortHeader field="impressions" align="center">Impressies</SortHeader>
                <SortHeader field="ctr" align="center">CTR (%)</SortHeader>
                <TableCell align="center">Week</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>{Array.from({ length: 4 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
              )) : sorted.map((item, i) => {
                const barPct = Math.round(((item.impressions || 0) / maxImpressions) * 100);
                return (
                  <TableRow key={i} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <TrendIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.keyword}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ flex: 1, bgcolor: 'action.hover', borderRadius: 1, height: 6 }}>
                          <Box sx={{ width: barPct + '%', height: '100%', bgcolor: '#4285F4', borderRadius: 1 }} />
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 40, textAlign: 'right' }}>{item.impressions}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">{Number(item.ctr || 0).toFixed(1)}%</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="caption" color="text.secondary">W{item.week_number}/{item.year}</Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
