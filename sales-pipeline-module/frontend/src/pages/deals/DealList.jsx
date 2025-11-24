/**
 * Deal List Page - Table view of all deals
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Checkbox, Chip, Avatar, IconButton, TextField, InputAdornment,
  Menu, MenuItem, TablePagination, LinearProgress, Tooltip
} from '@mui/material';
import {
  Add as AddIcon, Search as SearchIcon, FilterList as FilterIcon, MoreVert as MoreIcon,
  Edit as EditIcon, Delete as DeleteIcon, Visibility as ViewIcon
} from '@mui/icons-material';
import useDealStore from '../../store/dealStore';
import DealFormModal from '../../components/deals/DealFormModal';

const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value || 0);

const DealList = () => {
  const navigate = useNavigate();
  const { deals, pagination, isLoading, fetchDeals, deleteDeal, setPage, setPageSize } = useDealStore();
  const [search, setSearch] = useState('');
  const [selectedDeals, setSelectedDeals] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);

  useEffect(() => { fetchDeals(); }, []);

  const handleSelectAll = (e) => setSelectedDeals(e.target.checked ? deals.map(d => d.id) : []);
  const handleSelectDeal = (id) => setSelectedDeals(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Deals</Typography>
          <Typography variant="body2" color="text.secondary">{pagination.total} total deals</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setSelectedDeal(null); setShowModal(true); }}>New Deal</Button>
      </Box>

      <Card>
        <Box sx={{ p: 2, display: 'flex', gap: 2 }}>
          <TextField size="small" placeholder="Search deals..." value={search} onChange={(e) => setSearch(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} sx={{ width: 300 }} />
          <Button startIcon={<FilterIcon />}>Filter</Button>
        </Box>
        
        {isLoading && <LinearProgress />}
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox"><Checkbox checked={selectedDeals.length === deals.length} onChange={handleSelectAll} /></TableCell>
                <TableCell>Deal Name</TableCell>
                <TableCell>Account</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Stage</TableCell>
                <TableCell>Probability</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deals.map((deal) => (
                <TableRow key={deal.id} hover>
                  <TableCell padding="checkbox"><Checkbox checked={selectedDeals.includes(deal.id)} onChange={() => handleSelectDeal(deal.id)} /></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight={600} sx={{ cursor: 'pointer' }} onClick={() => navigate(`/deals/${deal.id}`)}>{deal.title}</Typography></TableCell>
                  <TableCell>{deal.account?.name || '-'}</TableCell>
                  <TableCell><Typography fontWeight={600} color="primary.main">{formatCurrency(deal.value)}</Typography></TableCell>
                  <TableCell><Chip size="small" label={deal.stage?.name || 'Unknown'} /></TableCell>
                  <TableCell>{deal.probability}%</TableCell>
                  <TableCell>{deal.owner ? <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem' }}>{deal.owner.firstName?.[0]}{deal.owner.lastName?.[0]}</Avatar> : '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => navigate(`/deals/${deal.id}`)}><ViewIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => { setSelectedDeal(deal); setShowModal(true); }}><EditIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination component="div" count={pagination.total} page={pagination.page - 1} rowsPerPage={pagination.limit} onPageChange={(e, p) => setPage(p + 1)} onRowsPerPageChange={(e) => setPageSize(parseInt(e.target.value))} />
      </Card>

      {showModal && <DealFormModal open={showModal} onClose={() => setShowModal(false)} deal={selectedDeal} onSaved={() => { setShowModal(false); fetchDeals(); }} />}
    </Box>
  );
};

export default DealList;
