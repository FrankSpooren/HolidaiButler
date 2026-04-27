import { useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress, Chip, Button, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, Snackbar, Alert, IconButton, Tooltip, Switch, FormControlLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client.js';

export default function VouchersTab({ destinationId, t }) {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(null); // null | 'new' | voucher object
  const [form, setForm] = useState({ code: '', discount_type: 'percentage', discount_value: 10, max_uses: 100, valid_until: '', active: true });
  const [snack, setSnack] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['vouchers', destinationId],
    queryFn: () => client.get('/vouchers', { params: { destination_id: destinationId } }).then(r => r.data),
    enabled: !!destinationId,
  });

  const createMut = useMutation({
    mutationFn: (data) => client.post('/vouchers', { ...data, destination_id: destinationId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vouchers'] }); setDialog(null); setSnack('Voucher aangemaakt'); },
    onError: (e) => setSnack('Fout: ' + (e.response?.data?.error?.message || e.message)),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => client.put(`/vouchers/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vouchers'] }); setDialog(null); setSnack('Voucher bijgewerkt'); },
    onError: (e) => setSnack('Fout: ' + (e.response?.data?.error?.message || e.message)),
  });

  const vouchers = data?.data?.vouchers || data?.data || [];

  const handleSave = () => {
    if (dialog && typeof dialog === 'object' && dialog.id) {
      updateMut.mutate({ id: dialog.id, data: form });
    } else {
      createMut.mutate(form);
    }
  };

  const openEdit = (v) => {
    setForm({ code: v.code, discount_type: v.discount_type || 'percentage', discount_value: v.discount_value || 0, max_uses: v.max_uses || 100, valid_until: v.valid_until?.slice(0, 10) || '', active: v.active !== false });
    setDialog(v);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <LocalOfferIcon />
        <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>Vouchers</Typography>
        <Button variant="contained" size="small" startIcon={<AddIcon />}
          onClick={() => { setForm({ code: '', discount_type: 'percentage', discount_value: 10, max_uses: 100, valid_until: '', active: true }); setDialog('new'); }}>
          Nieuwe Voucher
        </Button>
      </Box>

      {isLoading ? <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box> : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Korting</TableCell>
                <TableCell align="center">Gebruikt</TableCell>
                <TableCell align="center">Max</TableCell>
                <TableCell>Geldig tot</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Acties</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vouchers.length > 0 ? vouchers.map(v => (
                <TableRow key={v.id}>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{v.code}</Typography></TableCell>
                  <TableCell>{v.discount_type === 'percentage' ? `${v.discount_value}%` : `€${v.discount_value}`}</TableCell>
                  <TableCell align="center">{v.used_count || 0}</TableCell>
                  <TableCell align="center">{v.max_uses || '∞'}</TableCell>
                  <TableCell>{v.valid_until ? new Date(v.valid_until).toLocaleDateString('nl-NL') : '—'}</TableCell>
                  <TableCell>
                    <Chip label={v.active ? 'Actief' : 'Inactief'} size="small"
                      color={v.active ? 'success' : 'default'} sx={{ height: 20, fontSize: 10 }} />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => openEdit(v)}><EditIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>Geen vouchers</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={!!dialog} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{typeof dialog === 'object' && dialog?.id ? 'Voucher bewerken' : 'Nieuwe Voucher'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Code" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} sx={{ mt: 1, mb: 2 }} size="small" placeholder="ZOMER2026" />
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField select label="Type" value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))} size="small" sx={{ width: 150 }}>
              <option value="percentage">Percentage</option>
              <option value="fixed">Vast bedrag</option>
            </TextField>
            <TextField label="Waarde" type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: parseFloat(e.target.value) }))} size="small" sx={{ width: 120 }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField label="Max gebruik" type="number" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: parseInt(e.target.value) }))} size="small" sx={{ width: 150 }} />
            <TextField label="Geldig tot" type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} size="small" InputLabelProps={{ shrink: true }} sx={{ flex: 1 }} />
          </Box>
          <FormControlLabel control={<Switch checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />} label="Actief" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Annuleer</Button>
          <Button variant="contained" onClick={handleSave} disabled={createMut.isPending || updateMut.isPending || !form.code}>
            {createMut.isPending || updateMut.isPending ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </DialogActions>
      </Dialog>

      {snack && <Snackbar open autoHideDuration={3000} onClose={() => setSnack(null)}><Alert severity="info" onClose={() => setSnack(null)}>{snack}</Alert></Snackbar>}
    </Box>
  );
}
