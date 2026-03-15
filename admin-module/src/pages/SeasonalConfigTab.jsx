import { useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton,
  Chip, CircularProgress, Alert, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useTranslation } from 'react-i18next';
import {
  useSeasons, useCurrentSeason, useCreateSeason, useUpdateSeason, useDeleteSeason, useActivateSeason,
} from '../hooks/useContent.js';

export default function SeasonalConfigTab({ destinationId }) {
  const { t } = useTranslation();
  const [editDialog, setEditDialog] = useState(null); // null | 'new' | season object
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { data: seasonsData, isLoading } = useSeasons(destinationId);
  const { data: currentData } = useCurrentSeason(destinationId);
  const createMut = useCreateSeason();
  const updateMut = useUpdateSeason();
  const deleteMut = useDeleteSeason();
  const activateMut = useActivateSeason();

  const seasons = seasonsData?.data || [];
  const currentSeason = currentData?.data || null;

  const handleDelete = async (id) => {
    await deleteMut.mutateAsync(id);
    setDeleteConfirm(null);
  };

  const handleActivate = async (id) => {
    await activateMut.mutateAsync(id);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          {t('contentStudio.seasons.title', 'Seizoensconfiguratie')}
        </Typography>
        <Button
          variant="contained" size="small" startIcon={<AddIcon />}
          onClick={() => setEditDialog('new')}
        >
          {t('contentStudio.seasons.add', 'Seizoen toevoegen')}
        </Button>
      </Box>

      {currentSeason && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('contentStudio.seasons.active', 'Actief seizoen')}: <strong>{currentSeason.season_name}</strong>
          {' '}({new Date(currentSeason.start_date).toLocaleDateString('nl-NL')} — {new Date(currentSeason.end_date).toLocaleDateString('nl-NL')})
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : seasons.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {t('contentStudio.seasons.empty', 'Nog geen seizoenen geconfigureerd.')}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('contentStudio.seasons.name', 'Naam')}</TableCell>
                <TableCell>{t('contentStudio.seasons.period', 'Periode')}</TableCell>
                <TableCell>{t('contentStudio.seasons.status', 'Status')}</TableCell>
                <TableCell>{t('contentStudio.seasons.themes', 'Thema\'s')}</TableCell>
                <TableCell align="right">{t('common.actions', 'Acties')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {seasons.map(season => {
                const isActive = season.is_active === 1 || season.is_active === true;
                const themes = season.strategic_themes ? (typeof season.strategic_themes === 'string' ? JSON.parse(season.strategic_themes) : season.strategic_themes) : [];
                return (
                  <TableRow key={season.id} sx={{ bgcolor: isActive ? 'success.50' : undefined }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={isActive ? 600 : 400}>
                        {season.season_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {new Date(season.start_date).toLocaleDateString('nl-NL')} — {new Date(season.end_date).toLocaleDateString('nl-NL')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={isActive ? t('contentStudio.seasons.active', 'Actief') : t('contentStudio.seasons.inactive', 'Inactief')}
                        size="small"
                        color={isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {Array.isArray(themes) && themes.map((theme, i) => (
                        <Chip key={i} label={theme} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.3 }} />
                      ))}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={t('contentStudio.seasons.activate', 'Activeren')}>
                        <span>
                          <IconButton size="small" onClick={() => handleActivate(season.id)} disabled={isActive || activateMut.isPending}>
                            <PlayArrowIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={t('common.edit', 'Bewerken')}>
                        <IconButton size="small" onClick={() => setEditDialog(season)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('common.delete', 'Verwijderen')}>
                        <IconButton size="small" color="error" onClick={() => setDeleteConfirm(season)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit/Create dialog */}
      <SeasonDialog
        open={!!editDialog}
        season={editDialog === 'new' ? null : editDialog}
        destinationId={destinationId}
        onClose={() => setEditDialog(null)}
        onCreate={createMut}
        onUpdate={updateMut}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>{t('contentStudio.seasons.deleteTitle', 'Seizoen verwijderen')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('contentStudio.seasons.deleteConfirm', 'Weet je zeker dat je dit seizoen wilt verwijderen?')}
            <br /><strong>{deleteConfirm?.season_name}</strong>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>{t('common.cancel', 'Annuleren')}</Button>
          <Button
            color="error" variant="contained"
            onClick={() => handleDelete(deleteConfirm.id)}
            disabled={deleteMut.isPending}
          >
            {deleteMut.isPending ? <CircularProgress size={20} /> : t('common.delete', 'Verwijderen')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function SeasonDialog({ open, season, destinationId, onClose, onCreate, onUpdate }) {
  const { t } = useTranslation();
  const isEdit = !!season;

  const [form, setForm] = useState({
    season_name: '',
    start_date: '',
    end_date: '',
    hero_image_path: '',
    featured_poi_ids: '',
    strategic_themes: '',
  });

  // Reset form when dialog opens
  const handleEnter = () => {
    if (season) {
      setForm({
        season_name: season.season_name || '',
        start_date: season.start_date ? season.start_date.substring(0, 10) : '',
        end_date: season.end_date ? season.end_date.substring(0, 10) : '',
        hero_image_path: season.hero_image_path || '',
        featured_poi_ids: season.featured_poi_ids ? (typeof season.featured_poi_ids === 'string' ? season.featured_poi_ids : JSON.stringify(season.featured_poi_ids)) : '',
        strategic_themes: season.strategic_themes ? (typeof season.strategic_themes === 'string' ? season.strategic_themes : JSON.stringify(season.strategic_themes)) : '',
      });
    } else {
      setForm({ season_name: '', start_date: '', end_date: '', hero_image_path: '', featured_poi_ids: '', strategic_themes: '' });
    }
  };

  const handleSubmit = async () => {
    const data = {
      destination_id: destinationId,
      season_name: form.season_name,
      start_date: form.start_date,
      end_date: form.end_date,
    };
    if (form.hero_image_path) data.hero_image_path = form.hero_image_path;
    if (form.featured_poi_ids) {
      try { data.featured_poi_ids = JSON.parse(form.featured_poi_ids); } catch { data.featured_poi_ids = form.featured_poi_ids; }
    }
    if (form.strategic_themes) {
      try { data.strategic_themes = JSON.parse(form.strategic_themes); } catch {
        data.strategic_themes = form.strategic_themes.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    if (isEdit) {
      await onUpdate.mutateAsync({ id: season.id, data });
    } else {
      await onCreate.mutateAsync(data);
    }
    onClose();
  };

  const isPending = onCreate.isPending || onUpdate.isPending;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth TransitionProps={{ onEnter: handleEnter }}>
      <DialogTitle>
        {isEdit ? t('contentStudio.seasons.edit', 'Seizoen bewerken') : t('contentStudio.seasons.add', 'Seizoen toevoegen')}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <TextField
          label={t('contentStudio.seasons.name', 'Naam')}
          value={form.season_name}
          onChange={e => setForm(f => ({ ...f, season_name: e.target.value }))}
          fullWidth required
        />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            type="date" label={t('contentStudio.seasons.startDate', 'Startdatum')}
            value={form.start_date}
            onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
            InputLabelProps={{ shrink: true }} fullWidth required
          />
          <TextField
            type="date" label={t('contentStudio.seasons.endDate', 'Einddatum')}
            value={form.end_date}
            onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
            InputLabelProps={{ shrink: true }} fullWidth required
          />
        </Box>
        <TextField
          label={t('contentStudio.seasons.heroImage', 'Hero afbeelding pad')}
          value={form.hero_image_path}
          onChange={e => setForm(f => ({ ...f, hero_image_path: e.target.value }))}
          fullWidth placeholder="/storage/branding/seasonal-hero.jpg"
        />
        <TextField
          label={t('contentStudio.seasons.featuredPois', 'Featured POI IDs (JSON array)')}
          value={form.featured_poi_ids}
          onChange={e => setForm(f => ({ ...f, featured_poi_ids: e.target.value }))}
          fullWidth placeholder='[1, 2, 3]'
        />
        <TextField
          label={t('contentStudio.seasons.themes', 'Thema\'s (kommagescheiden)')}
          value={form.strategic_themes}
          onChange={e => setForm(f => ({ ...f, strategic_themes: e.target.value }))}
          fullWidth placeholder="zomer, strand, festivals"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel', 'Annuleren')}</Button>
        <Button
          onClick={handleSubmit} variant="contained"
          disabled={!form.season_name || !form.start_date || !form.end_date || isPending}
        >
          {isPending ? <CircularProgress size={20} /> : (isEdit ? t('common.save', 'Opslaan') : t('contentStudio.seasons.add', 'Toevoegen'))}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
