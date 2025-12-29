import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Button,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  CalendarMonth as CalendarIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import { agendaAPI } from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';
import ResponsiveTable from '../../components/common/ResponsiveTable';

export default function AgendaList() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [inCalpeAreaFilter, setInCalpeAreaFilter] = useState('');

  // Sorting
  const [sortBy, setSortBy] = useState('date');
  const [sortDirection, setSortDirection] = useState('asc');

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await agendaAPI.getAll({
        page: page + 1,
        limit: rowsPerPage,
        search: searchQuery,
        status: statusFilter,
        category: categoryFilter,
        inCalpeArea: inCalpeAreaFilter,
        sortBy,
        sortDirection
      });
      setItems(response.data?.agendaItems || response.data?.items || response.items || []);
      setTotalCount(response.data?.pagination?.total || response.data?.total || response.total || 0);
    } catch (err) {
      console.error('Failed to fetch agenda items:', err);
      setError(t.errors?.loadFailed || 'Failed to load agenda items');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [page, rowsPerPage, searchQuery, statusFilter, categoryFilter, inCalpeAreaFilter, sortBy, sortDirection]);

  const handleSort = (columnId, direction) => {
    setSortBy(columnId);
    setSortDirection(direction);
    setPage(0);
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
      case 'active':
        return 'success';
      case 'draft':
        return 'default';
      case 'cancelled':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const categoryLabels = {
    music: t.categories?.music || 'Music',
    arts_culture: t.categories?.artsCulture || 'Arts & Culture',
    sports: t.categories?.sports || 'Sports',
    food_drink: t.categories?.foodDrink || 'Food & Drink',
    nightlife: t.categories?.nightlife || 'Nightlife',
    festivals: t.categories?.festivals || 'Festivals',
    markets: t.categories?.markets || 'Markets',
    entertainment: t.categories?.entertainment || 'Entertainment',
    other: t.categories?.other || 'Other'
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{
        mb: 3,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: 2
      }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            {t.nav?.agenda || 'Agenda'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t.agenda?.subtitle || 'Manage calendar and scheduled events'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchItems}
          >
            {t.actions?.refresh || 'Refresh'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/agenda/create')}
          >
            {t.agenda?.createEvent || 'Create Event'}
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              placeholder={t.actions?.search || 'Search...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
              size="small"
            />
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>{t.labels?.status || 'Status'}</InputLabel>
              <Select
                value={statusFilter}
                label={t.labels?.status || 'Status'}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">{t.labels?.all || 'All'}</MenuItem>
                <MenuItem value="published">{t.labels?.published || 'Published'}</MenuItem>
                <MenuItem value="draft">{t.labels?.draft || 'Draft'}</MenuItem>
                <MenuItem value="cancelled">{t.labels?.cancelled || 'Cancelled'}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>{t.labels?.category || 'Category'}</InputLabel>
              <Select
                value={categoryFilter}
                label={t.labels?.category || 'Category'}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="">{t.labels?.all || 'All'}</MenuItem>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <MenuItem key={value} value={value}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>{t.agenda?.calpeArea || 'Calpe Area'}</InputLabel>
              <Select
                value={inCalpeAreaFilter}
                label={t.agenda?.calpeArea || 'Calpe Area'}
                onChange={(e) => setInCalpeAreaFilter(e.target.value)}
              >
                <MenuItem value="">{t.labels?.all || 'All'}</MenuItem>
                <MenuItem value="true">{t.labels?.yes || 'Yes'}</MenuItem>
                <MenuItem value="false">{t.labels?.no || 'No'}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Responsive Table */}
      <ResponsiveTable
        columns={[
          {
            id: 'title',
            label: t.labels?.title || 'Title',
            sortable: true,
            mobilePriority: 1,
            render: (value, row) => (
              <Box>
                <Typography variant="subtitle2" fontWeight="medium">
                  {row.title || row.title_en || 'Untitled'}
                </Typography>
                {(row.short_description || row.short_description_en) && (
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 250, display: 'block' }}>
                    {row.short_description || row.short_description_en}
                  </Typography>
                )}
              </Box>
            )
          },
          {
            id: 'date',
            label: t.labels?.date || 'Date',
            sortable: true,
            render: (value, row) => formatDate(row.date)
          },
          {
            id: 'time',
            label: t.labels?.time || 'Time',
            sortable: true,
            render: (value, row) => row.time || '-'
          },
          {
            id: 'location',
            label: t.labels?.location || 'Location',
            sortable: true,
            render: (value, row) => (
              <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                {row.location_name || row.venue || '-'}
              </Typography>
            )
          },
          {
            id: 'category',
            label: t.labels?.category || 'Category',
            sortable: true,
            render: (value, row) => row.category ? (
              <Chip
                label={categoryLabels[row.category] || row.category}
                size="small"
                variant="outlined"
              />
            ) : '-'
          },
          {
            id: 'status',
            label: t.labels?.status || 'Status',
            sortable: true,
            render: (value, row) => (
              <Chip
                label={row.status || 'draft'}
                size="small"
                color={getStatusColor(row.status)}
                sx={{ textTransform: 'capitalize' }}
              />
            )
          },
          {
            id: 'views',
            label: t.labels?.views || 'Views',
            sortable: true,
            render: (value, row) => row.stats?.views || row.views || 0
          },
          {
            id: 'calpeArea',
            label: t.agenda?.calpeArea || 'Calpe Area',
            sortable: true,
            mobileHidden: true,
            render: (value, row) => (
              <Box>
                <Chip
                  label={row.is_in_calpe_area ? (t.labels?.yes || 'Yes') : (t.labels?.no || 'No')}
                  size="small"
                  color={row.is_in_calpe_area ? 'success' : 'default'}
                  variant={row.is_in_calpe_area ? 'filled' : 'outlined'}
                />
                {row.calpe_distance && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {row.calpe_distance} km
                  </Typography>
                )}
              </Box>
            )
          }
        ]}
        rows={items}
        loading={loading}
        emptyMessage={t.table?.noResults || 'No events found'}
        emptyIcon={<CalendarIcon sx={{ fontSize: 48, color: 'text.disabled' }} />}
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={totalCount}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        onSort={handleSort}
        sortBy={sortBy}
        sortDirection={sortDirection}
        rowKey={(row) => row.id || row._id}
        onRowClick={(row) => navigate(`/agenda/${row.id || row._id}`)}
        actions={(row) => (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); navigate(`/agenda/${row.id || row._id}`); }}
              title={t.actions?.view || 'View'}
            >
              <ViewIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); navigate(`/agenda/edit/${row.id || row._id}`); }}
              title={t.actions?.edit || 'Edit'}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      />
    </Box>
  );
}
