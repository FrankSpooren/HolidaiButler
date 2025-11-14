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

export default function POIList() {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();

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

      setPois(response.data.pois);
      setTotalCount(response.data.pagination.total);
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
    navigate(`/pois/edit/${poi._id}`);
    handleMenuClose();
  };

  // Handle status change
  const handleStatusChange = async (poi, newStatus) => {
    try {
      await poiAPI.updateStatus(poi._id, newStatus);
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
      await poiAPI.delete(selectedPOI._id);
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
          POI Management
        </Typography>
        {canCreate && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/pois/create')}
          >
            Add New POI
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search POIs..."
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
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4} md={2}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={filters.category}
                label="Category"
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
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
              label="City"
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
              Refresh
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
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Rating</TableCell>
                <TableCell>Views</TableCell>
                <TableCell align="right">Actions</TableCell>
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
                      No POIs found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                pois.map((poi) => (
                  <TableRow key={poi._id} hover>
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
            Edit
          </MenuItem>
        )}

        {canApprove && selectedPOI?.status !== 'active' && (
          <MenuItem onClick={() => handleStatusChange(selectedPOI, 'active')}>
            <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
            Approve
          </MenuItem>
        )}

        {canApprove && selectedPOI?.status === 'active' && (
          <MenuItem onClick={() => handleStatusChange(selectedPOI, 'inactive')}>
            <CancelIcon fontSize="small" sx={{ mr: 1 }} />
            Deactivate
          </MenuItem>
        )}

        {canDelete && (
          <MenuItem onClick={() => handleDeleteClick(selectedPOI)} sx={{ color: 'error.main' }}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete POI</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{selectedPOI?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
