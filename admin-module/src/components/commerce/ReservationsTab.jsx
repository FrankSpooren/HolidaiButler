import { useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress, Chip, TextField, Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Snackbar, Alert
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SearchIcon from '@mui/icons-material/Search';
import { useQuery } from '@tanstack/react-query';
import client from '../../api/client.js';

const STATUS_COLORS = { confirmed: 'success', pending: 'warning', cancelled: 'error', completed: 'info', 'no-show': 'default' };

export default function ReservationsTab({ destinationId, t }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['reservations', destinationId, search, status, page],
    queryFn: () => client.get('/reservations', {
      params: { destination_id: destinationId, search: search || undefined, status: status || undefined, page, limit: 25 }
    }).then(r => r.data),
    enabled: !!destinationId,
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['reservation-detail', detail],
    queryFn: () => client.get(`/reservations/${detail}`).then(r => r.data),
    enabled: !!detail,
  });

  const reservations = data?.data?.reservations || data?.data || [];
  const rd = detailData?.data || {};

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <CalendarMonthIcon />
        <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>Reserveringen</Typography>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select value={status} label="Status" onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <MenuItem value="">Alle</MenuItem>
            <MenuItem value="confirmed">Bevestigd</MenuItem>
            <MenuItem value="pending">In afwachting</MenuItem>
            <MenuItem value="cancelled">Geannuleerd</MenuItem>
            <MenuItem value="completed">Voltooid</MenuItem>
          </Select>
        </FormControl>
        <TextField size="small" placeholder="Zoek..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
          sx={{ width: 250 }} />
      </Box>

      {isLoading ? <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box> : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Gast</TableCell>
                <TableCell>POI</TableCell>
                <TableCell>Datum</TableCell>
                <TableCell>Tijd</TableCell>
                <TableCell align="center">Personen</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reservations.length > 0 ? reservations.map(r => (
                <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => setDetail(r.id)}>
                  <TableCell>#{r.id}</TableCell>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{r.guest_name || r.name || '—'}</Typography></TableCell>
                  <TableCell>{r.poi_name || '—'}</TableCell>
                  <TableCell>{r.date ? new Date(r.date).toLocaleDateString('nl-NL') : '—'}</TableCell>
                  <TableCell>{r.time_slot || r.time || '—'}</TableCell>
                  <TableCell align="center">{r.party_size || r.guests || '—'}</TableCell>
                  <TableCell>
                    <Chip label={r.status || 'pending'} size="small"
                      color={STATUS_COLORS[r.status] || 'default'} sx={{ height: 20, fontSize: 10 }} />
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>Geen reserveringen</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Reservering #{detail}</DialogTitle>
        <DialogContent>
          {detailLoading ? <CircularProgress /> : rd.id ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              {[
                ['Gast', rd.guest_name || rd.name],
                ['Email', rd.guest_email || rd.email],
                ['Telefoon', rd.guest_phone || rd.phone],
                ['POI', rd.poi_name],
                ['Datum', rd.date ? new Date(rd.date).toLocaleDateString('nl-NL') : null],
                ['Tijd', rd.time_slot || rd.time],
                ['Personen', rd.party_size || rd.guests],
                ['Status', rd.status],
                ['Opmerkingen', rd.notes || rd.special_requests],
                ['Aangemaakt', rd.created_at ? new Date(rd.created_at).toLocaleString('nl-NL') : null],
              ].filter(([, v]) => v).map(([label, value]) => (
                <Box key={label} sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ width: 100, flexShrink: 0 }}>{label}:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
                </Box>
              ))}
            </Box>
          ) : <Typography>Geen data</Typography>}
        </DialogContent>
        <DialogActions><Button onClick={() => setDetail(null)}>Sluiten</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
