import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Button,
  TextField,
  MenuItem,
  Chip,
  Typography,
  InputAdornment,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Checkbox,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Publish as PublishIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { eventsAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const statusColors = {
  draft: 'default',
  published: 'success',
  cancelled: 'error',
  completed: 'info'
};

const categoryLabels = {
  music: 'Music',
  arts_culture: 'Arts & Culture',
  sports: 'Sports',
  food_drink: 'Food & Drink',
  nightlife: 'Nightlife',
  festivals: 'Festivals',
  markets: 'Markets',
  workshops: 'Workshops',
  tours: 'Tours',
  exhibitions: 'Exhibitions',
  theater: 'Theater',
  cinema: 'Cinema',
  conferences: 'Conferences',
  kids_family: 'Kids & Family',
  outdoor: 'Outdoor',
  other: 'Other'
};

export default function EventList() {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();

  // State
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Menu
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const canEdit = hasPermission('events.edit');
  const canCreate = hasPermission('events.create');
  const canDelete = hasPermission('events.delete');

  useEffect(() => {
    fetchEvents();
  }, [page, rowsPerPage, search, statusFilter, categoryFilter]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: page + 1,
        limit: rowsPerPage,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(categoryFilter && { category: categoryFilter })
      };

      const response = await eventsAPI.getAll(params);

      if (response.success) {
        setEvents(response.data.events);
        setTotal(response.data.pagination.total);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err.response?.data?.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuOpen = (event, eventItem) => {
    setAnchorEl(event.currentTarget);
    setSelectedEvent(eventItem);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedEvent(null);
  };

  const handleEdit = (event) => {
    navigate(`/events/edit/${event._id}`);
    handleMenuClose();
  };

  const handleDuplicate = async (event) => {
    try {
      const response = await eventsAPI.duplicate(event._id);
      if (response.success) {
        fetchEvents();
      }
    } catch (err) {
      console.error('Error duplicating event:', err);
      setError(err.response?.data?.message || 'Failed to duplicate event');
    }
    handleMenuClose();
  };

  const handlePublish = async (event) => {
    try {
      const response = await eventsAPI.publish(event._id);
      if (response.success) {
        fetchEvents();
      }
    } catch (err) {
      console.error('Error publishing event:', err);
      setError(err.response?.data?.message || 'Failed to publish event');
    }
    handleMenuClose();
  };

  const handleDeleteClick = (event) => {
    setSelectedEvent(event);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    try {
      setDeleteLoading(true);
      const response = await eventsAPI.delete(selectedEvent._id);

      if (response.success) {
        fetchEvents();
        setDeleteDialogOpen(false);
        setSelectedEvent(null);
      }
    } catch (err) {
      console.error('Error deleting event:', err);
      setError(err.response?.data?.message || 'Failed to delete event');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelected(events.map(e => e._id));
    } else {
      setSelected([]);
    }
  };

  const handleSelectOne = (id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = [...selected, id];
    } else {
      newSelected = selected.filter(item => item !== id);
    }

    setSelected(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;

    try {
      setDeleteLoading(true);
      const response = await eventsAPI.bulkDelete(selected);

      if (response.success) {
        fetchEvents();
        setSelected([]);
      }
    } catch (err) {
      console.error('Error bulk deleting events:', err);
      setError(err.response?.data?.message || 'Failed to delete events');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">
          Events
        </Typography>
        {canCreate && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/events/new')}
          >
            Create Event
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
          />
          <TextField
            select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="published">Published</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
          </TextField>
          <TextField
            select
            label="Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All Categories</MenuItem>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <MenuItem key={value} value={value}>{label}</MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Bulk Actions */}
      {selected.length > 0 && canDelete && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography>
              {selected.length} event(s) selected
            </Typography>
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleBulkDelete}
              disabled={deleteLoading}
            >
              Delete Selected
            </Button>
          </Box>
        </Paper>
      )}

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {canDelete && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < events.length}
                    checked={events.length > 0 && selected.length === events.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
              )}
              <TableCell>Title</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Views</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={canDelete ? 8 : 7} align="center" sx={{ py: 8 }}>
                  Loading...
                </TableCell>
              </TableRow>
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canDelete ? 8 : 7} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">
                    No events found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow key={event._id} hover>
                  {canDelete && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selected.indexOf(event._id) !== -1}
                        onChange={() => handleSelectOne(event._id)}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="medium">
                      {event.title?.en || 'Untitled'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={categoryLabels[event.category] || event.category}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{formatDate(event.startDate)}</TableCell>
                  <TableCell>{event.location?.city || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={event.status}
                      size="small"
                      color={statusColors[event.status]}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>{event.stats?.views || 0}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Actions">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, event)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <TablePagination
          rowsPerPageOptions={[10, 20, 50, 100]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {canEdit && (
          <MenuItem onClick={() => handleEdit(selectedEvent)}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}
        {canCreate && (
          <MenuItem onClick={() => handleDuplicate(selectedEvent)}>
            <ListItemIcon>
              <CopyIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Duplicate</ListItemText>
          </MenuItem>
        )}
        {canEdit && selectedEvent?.status === 'draft' && (
          <MenuItem onClick={() => handlePublish(selectedEvent)}>
            <ListItemIcon>
              <PublishIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Publish</ListItemText>
          </MenuItem>
        )}
        {canDelete && (
          <MenuItem onClick={() => handleDeleteClick(selectedEvent)}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Event</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedEvent?.title?.en}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteLoading}
          >
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
