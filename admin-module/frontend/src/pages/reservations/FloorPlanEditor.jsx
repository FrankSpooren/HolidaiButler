import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  Alert,
  Tooltip,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ToggleButton,
  ToggleButtonGroup,
  Slider
} from '@mui/material';
import {
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  GridOn as GridIcon,
  TableRestaurant as TableIcon,
  Weekend as BoothIcon,
  Deck as PatioIcon,
  Chair as BarIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { floorPlanAPI, tableAPI, restaurantAPI } from '../../services/api';

const TABLE_TYPES = {
  standard: { icon: TableIcon, label: 'Standard', color: '#4caf50' },
  booth: { icon: BoothIcon, label: 'Booth', color: '#2196f3' },
  bar: { icon: BarIcon, label: 'Bar', color: '#ff9800' },
  patio: { icon: PatioIcon, label: 'Patio', color: '#9c27b0' }
};

const TABLE_SHAPES = ['round', 'square', 'rectangle'];

export default function FloorPlanEditor() {
  const canvasRef = useRef(null);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [floorPlans, setFloorPlans] = useState([]);
  const [activeFloorPlan, setActiveFloorPlan] = useState(null);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [addTableDialog, setAddTableDialog] = useState(false);
  const [newTable, setNewTable] = useState({
    table_number: '',
    table_type: 'standard',
    shape: 'round',
    min_capacity: 2,
    max_capacity: 4,
    x: 100,
    y: 100
  });

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchFloorPlans();
      fetchTables();
    }
  }, [selectedRestaurant]);

  const fetchRestaurants = async () => {
    try {
      const response = await restaurantAPI.getAll({ limit: 100 });
      const list = response.data?.restaurants || [];
      setRestaurants(list);
      if (list.length > 0) {
        setSelectedRestaurant(list[0].id);
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load restaurants');
      setLoading(false);
    }
  };

  const fetchFloorPlans = async () => {
    try {
      const response = await floorPlanAPI.getAll(selectedRestaurant);
      setFloorPlans(response.data?.floor_plans || []);

      // Set active floor plan
      const active = response.data?.floor_plans?.find(fp => fp.is_active);
      if (active) {
        setActiveFloorPlan(active);
      }
    } catch (err) {
      console.error('Failed to load floor plans', err);
    }
  };

  const fetchTables = async () => {
    try {
      const response = await tableAPI.getAll(selectedRestaurant);
      setTables(response.data?.tables || []);
    } catch (err) {
      console.error('Failed to load tables', err);
    }
  };

  const handleTableClick = (table) => {
    setSelectedTable(table);
    setEditDialog(true);
  };

  const handleTableDrag = (tableId, newX, newY) => {
    setTables(prev =>
      prev.map(t =>
        t.id === tableId ? { ...t, position_x: newX, position_y: newY } : t
      )
    );
  };

  const handleSaveLayout = async () => {
    try {
      const layout = tables.map(t => ({
        id: t.id,
        position_x: t.position_x,
        position_y: t.position_y
      }));

      await tableAPI.bulkUpdate(selectedRestaurant, layout);
      toast.success('Layout saved');
    } catch (err) {
      toast.error('Failed to save layout');
    }
  };

  const handleAddTable = async () => {
    try {
      await tableAPI.create(selectedRestaurant, {
        ...newTable,
        position_x: newTable.x,
        position_y: newTable.y
      });
      toast.success('Table added');
      setAddTableDialog(false);
      setNewTable({
        table_number: '',
        table_type: 'standard',
        shape: 'round',
        min_capacity: 2,
        max_capacity: 4,
        x: 100,
        y: 100
      });
      fetchTables();
    } catch (err) {
      toast.error('Failed to add table');
    }
  };

  const handleDeleteTable = async (tableId) => {
    try {
      await tableAPI.delete(selectedRestaurant, tableId);
      toast.success('Table deleted');
      setEditDialog(false);
      setSelectedTable(null);
      fetchTables();
    } catch (err) {
      toast.error('Failed to delete table');
    }
  };

  const handleUpdateTable = async () => {
    if (!selectedTable) return;

    try {
      await tableAPI.update(selectedRestaurant, selectedTable.id, selectedTable);
      toast.success('Table updated');
      setEditDialog(false);
      fetchTables();
    } catch (err) {
      toast.error('Failed to update table');
    }
  };

  const getTableColor = (table) => {
    if (table.status === 'occupied') return '#f44336';
    if (table.status === 'reserved') return '#ff9800';
    return TABLE_TYPES[table.table_type]?.color || '#4caf50';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Floor Plan Editor
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchTables}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveLayout}
          >
            Save Layout
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Restaurant</InputLabel>
              <Select
                value={selectedRestaurant}
                onChange={(e) => setSelectedRestaurant(e.target.value)}
                label="Restaurant"
              >
                {restaurants.map((r) => (
                  <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Floor Plan</InputLabel>
              <Select
                value={activeFloorPlan?.id || ''}
                onChange={(e) => {
                  const fp = floorPlans.find(f => f.id === e.target.value);
                  setActiveFloorPlan(fp);
                }}
                label="Floor Plan"
              >
                {floorPlans.map((fp) => (
                  <MenuItem key={fp.id} value={fp.id}>
                    {fp.name} {fp.is_active && '(Active)'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Tooltip title="Add Table">
                <IconButton onClick={() => setAddTableDialog(true)} color="primary">
                  <AddIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Toggle Grid">
                <IconButton
                  onClick={() => setShowGrid(!showGrid)}
                  color={showGrid ? 'primary' : 'default'}
                >
                  <GridIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Zoom Out">
                <IconButton onClick={() => setZoom(Math.max(50, zoom - 10))}>
                  <ZoomOutIcon />
                </IconButton>
              </Tooltip>
              <Chip label={`${zoom}%`} size="small" />
              <Tooltip title="Zoom In">
                <IconButton onClick={() => setZoom(Math.min(150, zoom + 10))}>
                  <ZoomInIcon />
                </IconButton>
              </Tooltip>
              <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                {Object.entries(TABLE_TYPES).map(([type, config]) => (
                  <Chip
                    key={type}
                    icon={<config.icon />}
                    label={config.label}
                    size="small"
                    sx={{ bgcolor: config.color, color: 'white' }}
                  />
                ))}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Floor Plan Canvas */}
      <Paper
        ref={canvasRef}
        sx={{
          height: 600,
          position: 'relative',
          overflow: 'hidden',
          bgcolor: '#f5f5f5',
          backgroundImage: showGrid
            ? 'linear-gradient(#ddd 1px, transparent 1px), linear-gradient(90deg, #ddd 1px, transparent 1px)'
            : 'none',
          backgroundSize: '20px 20px',
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top left'
        }}
      >
        {tables.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'text.secondary'
            }}
          >
            <TableIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6">No tables configured</Typography>
            <Typography variant="body2">Click "Add Table" to start creating your floor plan</Typography>
          </Box>
        ) : (
          tables.map((table) => (
            <Box
              key={table.id}
              onClick={() => handleTableClick(table)}
              sx={{
                position: 'absolute',
                left: table.position_x || 100,
                top: table.position_y || 100,
                width: table.shape === 'rectangle' ? 80 : 60,
                height: 60,
                bgcolor: getTableColor(table),
                borderRadius: table.shape === 'round' ? '50%' : table.shape === 'rectangle' ? 1 : 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                cursor: 'pointer',
                boxShadow: 2,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: 4
                }
              }}
            >
              <Typography variant="subtitle2" fontWeight="bold">
                {table.table_number}
              </Typography>
              <Typography variant="caption">
                {table.min_capacity}-{table.max_capacity}
              </Typography>
            </Box>
          ))
        )}
      </Paper>

      {/* Edit Table Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Table {selectedTable?.table_number}</DialogTitle>
        <DialogContent>
          {selectedTable && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Table Number"
                  value={selectedTable.table_number}
                  onChange={(e) => setSelectedTable({ ...selectedTable, table_number: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={selectedTable.table_type}
                    onChange={(e) => setSelectedTable({ ...selectedTable, table_type: e.target.value })}
                    label="Type"
                  >
                    {Object.entries(TABLE_TYPES).map(([type, config]) => (
                      <MenuItem key={type} value={type}>{config.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Min Capacity"
                  type="number"
                  value={selectedTable.min_capacity}
                  onChange={(e) => setSelectedTable({ ...selectedTable, min_capacity: parseInt(e.target.value) })}
                  inputProps={{ min: 1, max: 20 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Max Capacity"
                  type="number"
                  value={selectedTable.max_capacity}
                  onChange={(e) => setSelectedTable({ ...selectedTable, max_capacity: parseInt(e.target.value) })}
                  inputProps={{ min: 1, max: 20 }}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom>Shape</Typography>
                <ToggleButtonGroup
                  value={selectedTable.shape}
                  exclusive
                  onChange={(e, value) => value && setSelectedTable({ ...selectedTable, shape: value })}
                >
                  {TABLE_SHAPES.map((shape) => (
                    <ToggleButton key={shape} value={shape}>
                      {shape.charAt(0).toUpperCase() + shape.slice(1)}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom>Status</Typography>
                <ToggleButtonGroup
                  value={selectedTable.status}
                  exclusive
                  onChange={(e, value) => value && setSelectedTable({ ...selectedTable, status: value })}
                >
                  <ToggleButton value="available">Available</ToggleButton>
                  <ToggleButton value="reserved">Reserved</ToggleButton>
                  <ToggleButton value="occupied">Occupied</ToggleButton>
                  <ToggleButton value="blocked">Blocked</ToggleButton>
                </ToggleButtonGroup>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => handleDeleteTable(selectedTable?.id)}
          >
            Delete
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateTable}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Add Table Dialog */}
      <Dialog open={addTableDialog} onClose={() => setAddTableDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Table</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Table Number"
                value={newTable.table_number}
                onChange={(e) => setNewTable({ ...newTable, table_number: e.target.value })}
                required
                placeholder="e.g., T1, A12, Patio-1"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={newTable.table_type}
                  onChange={(e) => setNewTable({ ...newTable, table_type: e.target.value })}
                  label="Type"
                >
                  {Object.entries(TABLE_TYPES).map(([type, config]) => (
                    <MenuItem key={type} value={type}>{config.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Min Capacity"
                type="number"
                value={newTable.min_capacity}
                onChange={(e) => setNewTable({ ...newTable, min_capacity: parseInt(e.target.value) })}
                inputProps={{ min: 1, max: 20 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Max Capacity"
                type="number"
                value={newTable.max_capacity}
                onChange={(e) => setNewTable({ ...newTable, max_capacity: parseInt(e.target.value) })}
                inputProps={{ min: 1, max: 20 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography gutterBottom>Shape</Typography>
              <ToggleButtonGroup
                value={newTable.shape}
                exclusive
                onChange={(e, value) => value && setNewTable({ ...newTable, shape: value })}
              >
                {TABLE_SHAPES.map((shape) => (
                  <ToggleButton key={shape} value={shape}>
                    {shape.charAt(0).toUpperCase() + shape.slice(1)}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddTableDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddTable}
            disabled={!newTable.table_number}
          >
            Add Table
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
