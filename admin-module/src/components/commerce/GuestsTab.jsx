import { useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress, Alert, Chip, Button, TextField, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Select, MenuItem
} from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client.js';

export default function GuestsTab({ destinationId, t }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [blacklistDialog, setBlacklistDialog] = useState(null);
  const [snack, setSnack] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['guests', destinationId, search, page],
    queryFn: () => client.get('/guests', { params: { destination_id: destinationId, search: search || undefined, page, limit: 25 } }).then(r => r.data),
    enabled: !!destinationId,
  });

  const blacklistMut = useMutation({
    mutationFn: ({ id, blacklisted }) => client.put(`/guests/${id}/blacklist`, { blacklisted }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['guests'] }); setBlacklistDialog(null); setSnack('Guest status bijgewerkt'); },
    onError: (e) => setSnack('Fout: ' + (e.response?.data?.error?.message || e.message)),
  });

  const guests = data?.data?.guests || data?.data || [];

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <PersonIcon />
        <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>Gasten</Typography>
        <TextField size="small" placeholder="Zoek op naam of email..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
          sx={{ width: 300 }} />
      </Box>

      {isLoading ? <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box> : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Naam</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Telefoon</TableCell>
                <TableCell align="center">Boekingen</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Acties</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {guests.length > 0 ? guests.map(g => (
                <TableRow key={g.id}>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{g.name || '—'}</Typography></TableCell>
                  <TableCell>{g.email || '—'}</TableCell>
                  <TableCell>{g.phone || '—'}</TableCell>
                  <TableCell align="center">{g.booking_count || g.bookings || 0}</TableCell>
                  <TableCell>
                    <Chip label={g.blacklisted ? 'Geblokkeerd' : 'Actief'} size="small"
                      color={g.blacklisted ? 'error' : 'success'} sx={{ height: 20, fontSize: 10 }} />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={g.blacklisted ? 'Deblokkeren' : 'Blokkeren'}>
                      <IconButton size="small" color={g.blacklisted ? 'success' : 'error'}
                        onClick={() => setBlacklistDialog(g)}>
                        <BlockIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>Geen gasten gevonden</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={!!blacklistDialog} onClose={() => setBlacklistDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{blacklistDialog?.blacklisted ? 'Gast deblokkeren' : 'Gast blokkeren'}</DialogTitle>
        <DialogContent>
          <Typography>
            {blacklistDialog?.blacklisted
              ? `Weet je zeker dat je "${blacklistDialog?.name}" wilt deblokkeren?`
              : `Weet je zeker dat je "${blacklistDialog?.name}" wilt blokkeren? Deze gast kan dan geen boekingen meer maken.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlacklistDialog(null)}>Annuleer</Button>
          <Button variant="contained" color={blacklistDialog?.blacklisted ? 'success' : 'error'}
            onClick={() => blacklistMut.mutate({ id: blacklistDialog.id, blacklisted: !blacklistDialog.blacklisted })}
            disabled={blacklistMut.isPending}>
            {blacklistDialog?.blacklisted ? 'Deblokkeren' : 'Blokkeren'}
          </Button>
        </DialogActions>
      </Dialog>

      {snack && <Snackbar open autoHideDuration={3000} onClose={() => setSnack(null)}><Alert severity="info" onClose={() => setSnack(null)}>{snack}</Alert></Snackbar>}
    </Box>
  );
}
