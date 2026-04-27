import { useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress, Chip, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, Snackbar, Alert
} from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SearchIcon from '@mui/icons-material/Search';
import { useQuery, useMutation } from '@tanstack/react-query';
import client from '../../api/client.js';

const STATUS_COLORS = { valid: 'success', used: 'info', expired: 'error', cancelled: 'default', refunded: 'warning' };

export default function TicketsTab({ destinationId, t }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [qrDialog, setQrDialog] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [snack, setSnack] = useState(null);

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['ticket-orders', destinationId, search, page],
    queryFn: () => client.get('/tickets/orders', {
      params: { destination_id: destinationId, search: search || undefined, page, limit: 25 }
    }).then(r => r.data),
    enabled: !!destinationId,
  });

  const { data: orderDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['ticket-order-detail', detail],
    queryFn: () => client.get(`/tickets/orders/${detail}`).then(r => r.data),
    enabled: !!detail,
  });

  const validateMut = useMutation({
    mutationFn: (code) => client.post('/tickets/qr/validate', { code, destination_id: destinationId }),
    onSuccess: (r) => setSnack(`Ticket ${r.data?.data?.valid ? 'GELDIG' : 'ONGELDIG'}: ${r.data?.data?.message || ''}`),
    onError: (e) => setSnack('Fout: ' + (e.response?.data?.error?.message || e.message)),
  });

  const orders = ordersData?.data?.orders || ordersData?.data || [];
  const od = orderDetail?.data || {};

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <ConfirmationNumberIcon />
        <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>Ticket Orders</Typography>
        <Button variant="outlined" size="small" startIcon={<QrCodeScannerIcon />}
          onClick={() => setQrDialog(true)}>
          QR Valideren
        </Button>
        <TextField size="small" placeholder="Zoek op order..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
          sx={{ width: 250 }} />
      </Box>

      {isLoading ? <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box> : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Order #</TableCell>
                <TableCell>Koper</TableCell>
                <TableCell>Ticket</TableCell>
                <TableCell align="center">Aantal</TableCell>
                <TableCell align="right">Bedrag</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Datum</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.length > 0 ? orders.map(o => (
                <TableRow key={o.id} hover sx={{ cursor: 'pointer' }} onClick={() => setDetail(o.id)}>
                  <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>#{o.id}</Typography></TableCell>
                  <TableCell>{o.buyer_name || o.customer_name || '—'}</TableCell>
                  <TableCell>{o.ticket_name || o.product_name || '—'}</TableCell>
                  <TableCell align="center">{o.quantity || 1}</TableCell>
                  <TableCell align="right">{o.total_amount != null ? `€${(o.total_amount / 100).toFixed(2)}` : '—'}</TableCell>
                  <TableCell>
                    <Chip label={o.status || 'pending'} size="small"
                      color={STATUS_COLORS[o.status] || 'default'} sx={{ height: 20, fontSize: 10 }} />
                  </TableCell>
                  <TableCell>{o.created_at ? new Date(o.created_at).toLocaleDateString('nl-NL') : '—'}</TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>Geen ticket orders</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Order #{detail}</DialogTitle>
        <DialogContent>
          {detailLoading ? <CircularProgress /> : od.id ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              {[
                ['Koper', od.buyer_name || od.customer_name],
                ['Email', od.buyer_email || od.customer_email],
                ['Ticket', od.ticket_name || od.product_name],
                ['Aantal', od.quantity],
                ['Bedrag', od.total_amount != null ? `€${(od.total_amount / 100).toFixed(2)}` : null],
                ['Status', od.status],
                ['Betaalmethode', od.payment_method],
                ['QR Code', od.qr_code],
                ['Aangemaakt', od.created_at ? new Date(od.created_at).toLocaleString('nl-NL') : null],
              ].filter(([, v]) => v).map(([label, value]) => (
                <Box key={label} sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ width: 120, flexShrink: 0 }}>{label}:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-all' }}>{value}</Typography>
                </Box>
              ))}
            </Box>
          ) : <Typography>Geen data</Typography>}
        </DialogContent>
        <DialogActions><Button onClick={() => setDetail(null)}>Sluiten</Button></DialogActions>
      </Dialog>

      {/* QR Validate Dialog */}
      <Dialog open={qrDialog} onClose={() => setQrDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>QR Code Valideren</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Voer de QR code in om een ticket te valideren.
          </Typography>
          <TextField fullWidth label="QR Code" value={qrCode} onChange={e => setQrCode(e.target.value)}
            sx={{ mt: 1 }} placeholder="Scan of typ de code" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialog(false)}>Annuleer</Button>
          <Button variant="contained" onClick={() => { validateMut.mutate(qrCode); setQrDialog(false); setQrCode(''); }}
            disabled={!qrCode || validateMut.isPending}>
            Valideren
          </Button>
        </DialogActions>
      </Dialog>

      {snack && <Snackbar open autoHideDuration={4000} onClose={() => setSnack(null)}><Alert severity="info" onClose={() => setSnack(null)}>{snack}</Alert></Snackbar>}
    </Box>
  );
}
