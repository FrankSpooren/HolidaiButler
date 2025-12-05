import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { poiAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import { toast } from 'react-toastify';
import { useLanguage } from '../../contexts/LanguageContext';

export default function POIList() {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const { t } = useLanguage();

  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    category: '',
    city: ''
  });

  // Menu
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedPOI, setSelectedPOI] = useState(null);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Status chip colors
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'pending':
        return 'warning';
      case 'closed_temporarily':
        return 'info';
      case 'closed_permanently':
        return 'error';
      default:
        return 'default';
    }
  };

  // Fetch POIs
  const fetchPOIs = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await poiAPI.getAll({
        page: page + 1,
        limit: rowsPerPage,
        search: filters.search || undefined,
        status: filters.status || undefined,
        category: filters.category || undefined,
        city: filters.city || undefined
      });

      // Handle both API response format and fallback data format
      setPois(response.data?.pois || response.pois || []);
      setTotalCount(response.data?.pagination?.total || response.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch POIs');
      toast.error('Failed to load POIs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPOIs();
  }, [page, rowsPerPage, filters]);

  // Handle filter change
  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
    setPage(0); // Reset to first page
  };

  // Handle menu open
  const handleMenuOpen = (event, poi) => {
    setAnchorEl(event.currentTarget);
    setSelectedPOI(poi);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPOI(null);
  };

  // Handle edit
  const handleEdit = (poi) => {
    navigate(`/pois/edit/${poi._id || poi.id}`);
    handleMenuClose();
  };

  // Handle status change
  const handleStatusChange = async (poi, newStatus) => {
    try {
      await poiAPI.updateStatus(poi._id || poi.id, newStatus);
      toast.success(`POI status updated to ${newStatus}`);
      fetchPOIs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
    handleMenuClose();
  };

  // Handle delete
  const handleDeleteClick = (poi) => {
    setSelectedPOI(poi);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    try {
      await poiAPI.delete(selectedPOI._id || selectedPOI.id);
      toast.success('POI deleted successfully');
      fetchPOIs();
      setDeleteDialogOpen(false);
      setSelectedPOI(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete POI');
    }
  };

  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const canCreate = hasPermission('pois', 'create');
  const canUpdate = hasPermission('pois', 'update');
  const canDelete = hasPermission('pois', 'delete');
  const canApprove = hasPermission('pois', 'approve');

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">
          {t.pois.title}
        </Typography>
        {canCreate && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/pois/create')}
          >
            {t.pois.addPoi}
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder={`${t.actions.search}...`}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Grid>

          <Grid item xs={12} sm={4} md={2}>
            <FormControl fullWidth>
              <InputLabel>{t.labels.status}</InputLabel>
              <Select
                value={filters.status}
                label={t.labels.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">{t.labels.all}</MenuItem>
                <MenuItem value="active">{t.labels.active}</MenuItem>
                <MenuItem value="inactive">{t.labels.inactive}</MenuItem>
                <MenuItem value="pending">{t.labels.pending}</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4} md={2}>
            <FormControl fullWidth>
              <InputLabel>{t.labels.category}</InputLabel>
              <Select
                value={filters.category}
                label={t.labels.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <MenuItem value="">{t.labels.all}</MenuItem>
                <MenuItem value="restaurant">Restaurant</MenuItem>
                <MenuItem value="attraction">Attraction</MenuItem>
                <MenuItem value="hotel">Hotel</MenuItem>
                <MenuItem value="activity">Activity</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4} md={2}>
            <TextField
              fullWidth
              label={t.labels.city}
              value={filters.city}
              onChange={(e) => handleFilterChange('city', e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={4} md={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchPOIs}
              sx={{ height: '56px' }}
            >
              {t.actions.refresh}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <Paper>
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t.labels.name}</TableCell>
                <TableCell>{t.labels.category}</TableCell>
                <TableCell>{t.pois.location}</TableCell>
                <TableCell>{t.labels.status}</TableCell>
                <TableCell>{t.pois.rating}</TableCell>
                <TableCell>{t.pois.views}</TableCell>
                <TableCell align="right">{t.table.actions}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : pois.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <Typography color="text.secondary">
                      {t.table.noResults}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                pois.map((poi) => (
                  <TableRow key={poi._id || poi.id} hover>
                    <TableCell>
                      <Typography fontWeight="medium">{poi.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={poi.category}
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>
                      {poi.location?.city}, {poi.location?.country}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={poi.status}
                        size="small"
                        color={getStatusColor(poi.status)}
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>
                      {poi.rating?.average?.toFixed(1) || 'N/A'} ({poi.rating?.count || 0})
                    </TableCell>
                    <TableCell>{poi.stats?.views || 0}</TableCell>
                    <TableCell align="right">
                      <IconButton onClick={(e) => handleMenuOpen(e, poi)}>
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 20, 50, 100]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {canUpdate && (
          <MenuItem onClick={() => handleEdit(selectedPOI)}>
            <EditIcon fontSize="small" sx={{ mr: 1 }} />
            {t.actions.edit}
          </MenuItem>
        )}

        {canApprove && selectedPOI?.status !== 'active' && (
          <MenuItem onClick={() => handleStatusChange(selectedPOI, 'active')}>
            <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
            {t.actions.confirm}
          </MenuItem>
        )}

        {canApprove && selectedPOI?.status === 'active' && (
          <MenuItem onClick={() => handleStatusChange(selectedPOI, 'inactive')}>
            <CancelIcon fontSize="small" sx={{ mr: 1 }} />
            {t.labels.inactive}
          </MenuItem>
        )}

        {canDelete && (
          <MenuItem onClick={() => handleDeleteClick(selectedPOI)} sx={{ color: 'error.main' }}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            {t.actions.delete}
          </MenuItem>
        )}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t.actions.delete} POI</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedPOI?.name}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t.actions.cancel}</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            {t.actions.delete}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
