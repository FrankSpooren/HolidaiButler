import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, CircularProgress, Alert, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, IconButton, Tooltip, Select, MenuItem, FormControl, InputLabel,
  Autocomplete, Checkbox, FormControlLabel
} from '@mui/material';
import ExploreIcon from '@mui/icons-material/Explore';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import MapIcon from '@mui/icons-material/Map';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

function getAuthHeaders() {
  try {
    const stored = localStorage.getItem('hb-admin-auth');
    const { accessToken } = JSON.parse(stored || '{}');
    return accessToken ? { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  } catch { return { 'Content-Type': 'application/json' }; }
}

const api = {
  getStats: () => axios.get(`${API_BASE}/api/v1/poi-discovery/stats`, { headers: getAuthHeaders() }).then(r => r.data),
  getRuns: () => axios.get(`${API_BASE}/api/v1/poi-discovery/runs`, { headers: getAuthHeaders() }).then(r => r.data),
  startDiscovery: (data) => axios.post(`${API_BASE}/api/v1/poi-discovery/destination`, data, { headers: getAuthHeaders() }).then(r => r.data),
  getConfigs: () => axios.get(`${API_BASE}/api/v1/poi-discovery/configs`, { headers: getAuthHeaders() }).then(r => r.data),
  createConfig: (data) => axios.post(`${API_BASE}/api/v1/poi-discovery/configs`, data, { headers: getAuthHeaders() }).then(r => r.data),
  updateConfig: (id, data) => axios.put(`${API_BASE}/api/v1/poi-discovery/configs/${id}`, data, { headers: getAuthHeaders() }).then(r => r.data),
  deleteConfig: (id) => axios.delete(`${API_BASE}/api/v1/poi-discovery/configs/${id}`, { headers: getAuthHeaders() }).then(r => r.data),
  // OSM-first pipeline
  osmScan: (data) => axios.post(`${API_BASE}/api/v1/poi-discovery/osm-scan`, data, { headers: getAuthHeaders() }).then(r => r.data),
  getProspects: (params) => axios.get(`${API_BASE}/api/v1/poi-discovery/prospects`, { headers: getAuthHeaders(), params }).then(r => r.data),
  approveProspects: (ids) => axios.post(`${API_BASE}/api/v1/poi-discovery/prospects/approve`, { prospect_ids: ids }, { headers: getAuthHeaders() }).then(r => r.data),
  rejectProspects: (ids) => axios.post(`${API_BASE}/api/v1/poi-discovery/prospects/reject`, { prospect_ids: ids }, { headers: getAuthHeaders() }).then(r => r.data),
  scrapeApproved: () => axios.post(`${API_BASE}/api/v1/poi-discovery/prospects/scrape`, {}, { headers: getAuthHeaders() }).then(r => r.data),
};

const STATUS_COLORS = { pending: 'default', running: 'primary', completed: 'success', failed: 'error', cancelled: 'warning' };

// Standaard bestemmingen en categorieën uit de database
const DESTINATIONS = [
  { id: 1, name: 'Calpe Costa Blanca', code: 'calpe', searchTerm: 'Calpe, Spain' },
  { id: 2, name: 'Texel Netherlands', code: 'texel', searchTerm: 'Texel, Netherlands' },
  { id: 5, name: 'Alicante', code: 'alicante', searchTerm: 'Alicante, Spain' },
];

const CATEGORIES = [
  { key: 'food_drinks', label: 'Food & Drinks', queries: 'restaurants, cafes, bars' },
  { key: 'shopping', label: 'Shopping', queries: 'shopping centers, markets, shops' },
  { key: 'activities', label: 'Active', queries: 'activities, attractions, things to do' },
  { key: 'beach', label: 'Beaches & Nature', queries: 'beaches, nature, parks' },
  { key: 'historical', label: 'Culture & History', queries: 'historical sites, monuments, museums' },
  { key: 'nightlife', label: 'Recreation', queries: 'nightclubs, entertainment, leisure' },
  { key: 'accommodation', label: 'Accommodation', queries: 'hotels, apartments' },
  { key: 'healthcare', label: 'Health & Wellbeing', queries: 'hospitals, pharmacies' },
  { key: 'routes', label: 'Routes', queries: 'walking tours, scenic routes' },
];

export default function POIDiscoveryDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [runs, setRuns] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snack, setSnack] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [discoverDialog, setDiscoverDialog] = useState(false);
  const [configDialog, setConfigDialog] = useState(null);
  const [discoverForm, setDiscoverForm] = useState({
    destination: DESTINATIONS[0],
    categories: [],
    maxPOIsPerCategory: 50,
    configId: null,
  });
  const [configForm, setConfigForm] = useState({
    name: '', description: '', categories: [], sources: 'google_places', maxPOIsPerCategory: 50,
  });
  const [prospects, setProspects] = useState([]);
  const [selectedProspects, setSelectedProspects] = useState(new Set());
  const [prospectDest, setProspectDest] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsR, runsR, configsR] = await Promise.allSettled([
        api.getStats(), api.getRuns(), api.getConfigs(),
      ]);
      if (statsR.status === 'fulfilled') setStats(statsR.value.stats || statsR.value);
      if (runsR.status === 'fulfilled') setRuns(runsR.value.runs || runsR.value.data || []);
      if (configsR.status === 'fulfilled') setConfigs(configsR.value.configs || []);
      // Load prospects
      try {
        const prosp = await api.getProspects({ status: 'pending' });
        setProspects(prosp.prospects || []);
      } catch { /* ignore */ }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleDiscover = async () => {
    setActionLoading('discover');
    try {
      await api.startDiscovery({
        destination: discoverForm.destination.searchTerm,
        categories: discoverForm.categories.map(c => c.key),
        maxPOIsPerCategory: parseInt(discoverForm.maxPOIsPerCategory) || 50,
        configId: discoverForm.configId || undefined,
      });
      setSnack('Discovery gestart voor ' + discoverForm.destination.name);
      setDiscoverDialog(false);
      loadAll();
    } catch (e) {
      setSnack('Fout: ' + (e.response?.data?.error || e.message));
    } finally { setActionLoading(null); }
  };

  const handleSaveConfig = async () => {
    setActionLoading('config');
    try {
      const data = {
        name: configForm.name,
        description: configForm.description,
        categories: configForm.categories.map(c => c.key),
        sources: [configForm.sources],
        maxPOIsPerCategory: parseInt(configForm.maxPOIsPerCategory) || 50,
      };
      if (configDialog && typeof configDialog === 'object') {
        await api.updateConfig(configDialog.id, data);
        setSnack('Configuratie bijgewerkt');
      } else {
        await api.createConfig(data);
        setSnack('Configuratie aangemaakt');
      }
      setConfigDialog(null);
      loadAll();
    } catch (e) {
      setSnack('Fout: ' + (e.response?.data?.error || e.message));
    } finally { setActionLoading(null); }
  };

  const handleDeleteConfig = async (id) => {
    if (!confirm('Configuratie verwijderen?')) return;
    try {
      await api.deleteConfig(id);
      setSnack('Configuratie verwijderd');
      loadAll();
    } catch (e) { setSnack('Fout: ' + (e.response?.data?.error || e.message)); }
  };

  const handleOsmScan = async (destId) => {
    setActionLoading('osm-scan');
    try {
      const result = await api.osmScan({ destination_id: destId });
      setSnack(`OSM scan voltooid: ${result.prospects} nieuwe prospects gevonden`);
      loadAll();
    } catch (e) {
      setSnack('Fout: ' + (e.response?.data?.error || e.message));
    } finally { setActionLoading(null); }
  };

  const handleApproveSelected = async () => {
    if (selectedProspects.size === 0) return;
    setActionLoading('approve');
    try {
      await api.approveProspects([...selectedProspects]);
      setSnack(`${selectedProspects.size} prospects goedgekeurd`);
      setSelectedProspects(new Set());
      loadAll();
    } catch (e) { setSnack('Fout: ' + (e.response?.data?.error || e.message)); }
    finally { setActionLoading(null); }
  };

  const handleRejectSelected = async () => {
    if (selectedProspects.size === 0) return;
    setActionLoading('reject');
    try {
      await api.rejectProspects([...selectedProspects]);
      setSnack(`${selectedProspects.size} prospects afgewezen`);
      setSelectedProspects(new Set());
      loadAll();
    } catch (e) { setSnack('Fout: ' + (e.response?.data?.error || e.message)); }
    finally { setActionLoading(null); }
  };

  const handleScrapeApproved = async () => {
    setActionLoading('scrape');
    try {
      const result = await api.scrapeApproved();
      setSnack(result.message || 'Scraping voltooid');
      loadAll();
    } catch (e) { setSnack('Fout: ' + (e.response?.data?.error || e.message)); }
    finally { setActionLoading(null); }
  };

  const toggleProspect = (id) => {
    setSelectedProspects(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAllProspects = () => {
    const filtered = prospects.filter(p => !prospectDest || p.destination_id === parseInt(prospectDest));
    if (selectedProspects.size === filtered.length) {
      setSelectedProspects(new Set());
    } else {
      setSelectedProspects(new Set(filtered.map(p => p.id)));
    }
  };

  if (loading) return <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ExploreIcon /> POI Discovery
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="contained" startIcon={<PlayArrowIcon />} onClick={() => setDiscoverDialog(true)}>
            Nieuwe Discovery Run
          </Button>
          <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={loadAll}>
            Vernieuwen
          </Button>
        </Box>
      </Box>

      {/* Uitleg */}
      <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>Hoe werkt POI Discovery?</Typography>
        <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
          Discovery zoekt via Apify (Google Places) naar nieuwe POIs die nog niet in je database staan.
          Start een <strong>Discovery Run</strong> om direct te zoeken, of maak een <strong>Configuratie</strong> aan
          om herbruikbare templates op te slaan voor automatische periodieke runs.
        </Typography>
        <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
          <strong>Automatisch:</strong> Calpe wordt elk kwartaal gescand (6 hoofdcategorieën) en jaarlijks volledig. Max €20/run.
        </Typography>
      </Alert>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Stats cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Runs', value: stats.runs?.total || 0 },
            { label: 'Voltooid', value: stats.runs?.completed || 0, color: 'success.main' },
            { label: 'Mislukt', value: stats.runs?.failed || 0, color: 'error.main' },
            { label: 'Actief', value: stats.runs?.running || 0, color: 'primary.main' },
            { label: 'POIs ontdekt', value: stats.pois?.created || 0 },
            { label: 'Configs', value: stats.configs?.total || 0 },
          ].map(kpi => (
            <Grid item xs={6} sm={4} md={2} key={kpi.label}>
              <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: kpi.color || 'text.primary' }}>{kpi.value}</Typography>
                <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Recent runs */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Recente Runs</Typography>
        {runs.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Destination</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>POIs</TableCell>
                  <TableCell>Gestart</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {runs.slice(0, 15).map(run => (
                  <TableRow key={run.id}>
                    <TableCell>{run.destination || run.city || '—'}</TableCell>
                    <TableCell><Chip label={run.run_type || 'manual'} size="small" sx={{ height: 20, fontSize: 10 }} /></TableCell>
                    <TableCell>
                      <Chip label={run.status} size="small" color={STATUS_COLORS[run.status] || 'default'} sx={{ height: 20, fontSize: 10 }} />
                    </TableCell>
                    <TableCell>{(run.pois_created || 0) + (run.pois_updated || 0)}</TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {run.started_at ? new Date(run.started_at).toLocaleString('nl-NL') : run.createdAt ? new Date(run.createdAt).toLocaleString('nl-NL') : '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" color="text.secondary">Nog geen discovery runs uitgevoerd</Typography>
        )}
      </Paper>

      {/* Configurations */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <SettingsIcon fontSize="small" /> Configuraties
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Herbruikbare templates voor discovery runs. Worden ook gebruikt door de automatische kwartaal- en jaarlijkse agent.
            </Typography>
          </Box>
          <Button size="small" startIcon={<AddIcon />} onClick={() => {
            setConfigForm({ name: '', description: '', categories: [], sources: 'google_places', maxPOIsPerCategory: 50 });
            setConfigDialog('new');
          }}>
            Nieuwe Configuratie
          </Button>
        </Box>
        {configs.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Naam</TableCell>
                  <TableCell>Categorieën</TableCell>
                  <TableCell>Bron</TableCell>
                  <TableCell align="center">Gebruikt</TableCell>
                  <TableCell align="center">Acties</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {configs.map(cfg => (
                  <TableRow key={cfg.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{cfg.name}</Typography>
                      {cfg.description && <Typography variant="caption" color="text.secondary">{cfg.description}</Typography>}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {(cfg.categories || []).slice(0, 3).map(c => {
                          const catObj = CATEGORIES.find(cat => cat.key === c);
                          return <Chip key={c} label={catObj?.label || c} size="small" sx={{ height: 18, fontSize: 9 }} />;
                        })}
                        {(cfg.categories || []).length > 3 && <Chip label={`+${cfg.categories.length - 3}`} size="small" sx={{ height: 18, fontSize: 9 }} />}
                      </Box>
                    </TableCell>
                    <TableCell>{(cfg.sources || []).join(', ')}</TableCell>
                    <TableCell align="center">{cfg.usageCount || 0}x</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Gebruik voor discovery">
                        <IconButton size="small" color="primary" onClick={() => {
                          setDiscoverForm(f => ({
                            ...f,
                            categories: CATEGORIES.filter(c => (cfg.categories || []).includes(c.key)),
                            maxPOIsPerCategory: cfg.maxPOIsPerCategory || 50,
                            configId: cfg.id,
                          }));
                          setDiscoverDialog(true);
                        }}><PlayArrowIcon sx={{ fontSize: 16 }} /></IconButton>
                      </Tooltip>
                      <IconButton size="small" onClick={() => {
                        setConfigForm({
                          name: cfg.name, description: cfg.description || '',
                          categories: CATEGORIES.filter(c => (cfg.categories || []).includes(c.key)),
                          sources: (cfg.sources || ['google_places'])[0],
                          maxPOIsPerCategory: cfg.maxPOIsPerCategory || 50,
                        });
                        setConfigDialog(cfg);
                      }}><EditIcon sx={{ fontSize: 16 }} /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteConfig(cfg.id)}>
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" color="text.secondary">Nog geen configuraties. Maak er een aan om discovery runs te standaardiseren.</Typography>
        )}
      </Paper>

      {/* Discovery Run Dialog */}
      <Dialog open={discoverDialog} onClose={() => setDiscoverDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nieuwe Discovery Run</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Zoek via Apify (Google Places) naar nieuwe POIs die nog niet in je database staan.
          </Typography>

          <Autocomplete
            options={DESTINATIONS}
            getOptionLabel={d => d.name}
            value={discoverForm.destination}
            onChange={(_, v) => setDiscoverForm(f => ({ ...f, destination: v || DESTINATIONS[0] }))}
            renderInput={(params) => <TextField {...params} label="Bestemming" size="small" />}
            disableClearable
            sx={{ mb: 2, mt: 1 }}
          />

          <Autocomplete
            multiple
            options={CATEGORIES}
            getOptionLabel={c => c.label}
            value={discoverForm.categories}
            onChange={(_, v) => setDiscoverForm(f => ({ ...f, categories: v }))}
            renderInput={(params) => <TextField {...params} label="Categorieën (leeg = alle)" size="small" />}
            renderTags={(value, getTagProps) =>
              value.map((c, i) => <Chip key={c.key} label={c.label} size="small" {...getTagProps({ index: i })} />)
            }
            sx={{ mb: 2 }}
          />

          <TextField fullWidth label="Max POIs per categorie" type="number" size="small"
            value={discoverForm.maxPOIsPerCategory}
            onChange={e => setDiscoverForm(f => ({ ...f, maxPOIsPerCategory: e.target.value }))} />

          {discoverForm.configId && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Gebruikt configuratie #{discoverForm.configId}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDiscoverDialog(false); setDiscoverForm(f => ({ ...f, configId: null })); }}>Annuleer</Button>
          <Button variant="contained" onClick={handleDiscover}
            disabled={actionLoading === 'discover' || !discoverForm.destination}
            startIcon={actionLoading === 'discover' ? <CircularProgress size={16} /> : <PlayArrowIcon />}>
            Start Discovery
          </Button>
        </DialogActions>
      </Dialog>

      {/* === OSM-FIRST DISCOVERY PROSPECTS === */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderColor: prospects.length > 0 ? 'warning.main' : 'divider', borderWidth: prospects.length > 0 ? 2 : 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TravelExploreIcon fontSize="small" color={prospects.length > 0 ? 'warning' : 'inherit'} />
              OSM Discovery Prospects
              {prospects.length > 0 && <Chip label={prospects.length} size="small" color="warning" sx={{ height: 20, fontSize: 10 }} />}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Gratis scan via OpenStreetMap. Nieuwe POIs die niet in je database staan. Review en keur goed voor Apify scraping.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {prospects.length > 0 && (
              <>
                <Button size="small" color="success" variant="contained" startIcon={<CheckCircleIcon />}
                  disabled={selectedProspects.size === 0 || actionLoading === 'approve'}
                  onClick={handleApproveSelected}>
                  Goedkeuren ({selectedProspects.size})
                </Button>
                <Button size="small" color="error" variant="outlined" startIcon={<CancelIcon />}
                  disabled={selectedProspects.size === 0 || actionLoading === 'reject'}
                  onClick={handleRejectSelected}>
                  Afwijzen ({selectedProspects.size})
                </Button>
              </>
            )}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select value={prospectDest || ''} displayEmpty onChange={e => setProspectDest(e.target.value)} sx={{ height: 32 }}>
                <MenuItem value="">Alle</MenuItem>
                {DESTINATIONS.map(d => <MenuItem key={d.id} value={d.id}>{d.name.split(' ')[0]}</MenuItem>)}
              </Select>
            </FormControl>
            <Button size="small" variant="outlined" startIcon={actionLoading === 'osm-scan' ? <CircularProgress size={14} /> : <MapIcon />}
              disabled={!!actionLoading}
              onClick={() => handleOsmScan(prospectDest || 1)}>
              OSM Scan
            </Button>
          </Box>
        </Box>

        {prospects.length > 0 ? (
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox size="small" checked={selectedProspects.size === prospects.filter(p => !prospectDest || p.destination_id === parseInt(prospectDest)).length && selectedProspects.size > 0} onChange={toggleAllProspects} />
                  </TableCell>
                  <TableCell>Naam</TableCell>
                  <TableCell>Categorie</TableCell>
                  <TableCell>OSM Type</TableCell>
                  <TableCell>Dichtstbijzijnd</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Dest</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {prospects
                  .filter(p => !prospectDest || p.destination_id === parseInt(prospectDest))
                  .map(p => (
                  <TableRow key={p.id} hover selected={selectedProspects.has(p.id)} onClick={() => toggleProspect(p.id)} sx={{ cursor: 'pointer' }}>
                    <TableCell padding="checkbox">
                      <Checkbox size="small" checked={selectedProspects.has(p.id)} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{p.osm_name}</Typography>
                    </TableCell>
                    <TableCell><Chip label={p.hb_category} size="small" sx={{ height: 18, fontSize: 9 }} /></TableCell>
                    <TableCell><Typography variant="caption">{p.osm_type}</Typography></TableCell>
                    <TableCell><Typography variant="caption" color="text.secondary">{p.best_match_name || '—'}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{(parseFloat(p.best_match_score) || 0).toFixed(2)}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{p.destination_id}</Typography></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Geen openstaande prospects. Start een OSM Scan om nieuwe POIs te ontdekken.
          </Typography>
        )}
      </Paper>

      {/* Config Dialog */}
      <Dialog open={!!configDialog} onClose={() => setConfigDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{typeof configDialog === 'object' ? 'Configuratie bewerken' : 'Nieuwe Configuratie'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Een configuratie is een herbruikbaar template voor discovery runs. Het wordt ook gebruikt door de automatische kwartaal-agent.
          </Typography>

          <TextField fullWidth label="Naam" size="small" value={configForm.name}
            onChange={e => setConfigForm(f => ({ ...f, name: e.target.value }))}
            placeholder="bijv. Calpe Kwartaal Scan" sx={{ mt: 1, mb: 2 }} />

          <TextField fullWidth label="Beschrijving" size="small" value={configForm.description}
            onChange={e => setConfigForm(f => ({ ...f, description: e.target.value }))}
            sx={{ mb: 2 }} />

          <Autocomplete
            multiple
            options={CATEGORIES}
            getOptionLabel={c => c.label}
            value={configForm.categories}
            onChange={(_, v) => setConfigForm(f => ({ ...f, categories: v }))}
            renderInput={(params) => <TextField {...params} label="Categorieën" size="small" />}
            renderTags={(value, getTagProps) =>
              value.map((c, i) => <Chip key={c.key} label={c.label} size="small" {...getTagProps({ index: i })} />)
            }
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }} size="small">
            <InputLabel>Bron</InputLabel>
            <Select value={configForm.sources} label="Bron"
              onChange={e => setConfigForm(f => ({ ...f, sources: e.target.value }))}>
              <MenuItem value="google_places">Apify (Google Places)</MenuItem>
            </Select>
          </FormControl>

          <TextField fullWidth label="Max POIs per categorie" type="number" size="small"
            value={configForm.maxPOIsPerCategory}
            onChange={e => setConfigForm(f => ({ ...f, maxPOIsPerCategory: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialog(null)}>Annuleer</Button>
          <Button variant="contained" onClick={handleSaveConfig}
            disabled={actionLoading === 'config' || !configForm.name}>
            {actionLoading === 'config' ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </DialogActions>
      </Dialog>

      {snack && (
        <Snackbar open autoHideDuration={4000} onClose={() => setSnack(null)}>
          <Alert severity="info" onClose={() => setSnack(null)}>{snack}</Alert>
        </Snackbar>
      )}
    </Box>
  );
}
