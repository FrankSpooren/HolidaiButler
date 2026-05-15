import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, TextField, Button, Chip, Grid, Alert, Snackbar,
  Accordion, AccordionSummary, AccordionDetails, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl,
  InputLabel, Select, MenuItem, FormControlLabel, Checkbox, CircularProgress,
  Paper, List, ListItem, ListItemText, ListItemSecondaryAction, Divider
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BusinessIcon from '@mui/icons-material/Business';
import FlagIcon from '@mui/icons-material/Flag';
import PeopleIcon from '@mui/icons-material/People';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import StrategyIcon from '@mui/icons-material/Insights';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import LinkIcon from '@mui/icons-material/Link';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import brandProfileService from '../../api/brandProfileService.js';

const INDUSTRY_OPTIONS = [
  'Toerisme & Recreatie', 'Retail & E-commerce', 'Horeca & Food', 'Cultuur & Entertainment',
  'Sport & Fitness', 'Gezondheid & Welzijn', 'Technologie & IT', 'Onderwijs & Training',
  'Financiële diensten', 'Vastgoed', 'Lokale overheid', 'Non-profit', 'Anders'
];

/**
 * MerkProfielSections — 7 brand profile accordion sections
 * Used inside BrandingPage, scoped to the active destination.
 */
export default function MerkProfielSections({ destinationId, destinationName, highlightKnowledgeId = null, onHighlightConsumed = null }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  // === DATA LOADING ===
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['brand-profile', destinationId],
    queryFn: () => brandProfileService.getProfile(destinationId),
    enabled: !!destinationId,
  });
  const { data: personasData, refetch: refetchPersonas } = useQuery({
    queryKey: ['brand-personas', destinationId],
    queryFn: () => brandProfileService.getPersonas(destinationId),
    enabled: !!destinationId,
  });
  const knowledgeListRef = useRef(null);
  const [highlightedKbId, setHighlightedKbId] = useState(null);
  const { data: knowledgeData, refetch: refetchKnowledge } = useQuery({
    queryKey: ['brand-knowledge', destinationId],
    queryFn: () => brandProfileService.getKnowledge(destinationId),
    enabled: !!destinationId,
  });
  const { data: competitorsData, refetch: refetchCompetitors } = useQuery({
    queryKey: ['brand-competitors', destinationId],
    queryFn: () => brandProfileService.getCompetitors(destinationId),
    enabled: !!destinationId,
  });

  const profile = profileData?.data || {};
  const personas = personasData?.data || [];
  const knowledge = knowledgeData?.data || {};

  // v4.95 deep-link consumer: scroll + highlight knowledge item bij ?kb=<id>
  useEffect(() => {
    if (!highlightKnowledgeId || !knowledge.items?.length) return;
    const exists = knowledge.items.find(i => i.id === Number(highlightKnowledgeId));
    if (!exists) return;
    setHighlightedKbId(Number(highlightKnowledgeId));
    // Wacht 200ms voor accordion-open + DOM-render, scroll vervolgens
    const t = setTimeout(() => {
      const el = document.getElementById(`kb-source-${highlightKnowledgeId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 250);
    // Highlight pulse 3s, dan reset
    const t2 = setTimeout(() => {
      setHighlightedKbId(null);
      if (onHighlightConsumed) onHighlightConsumed();
    }, 3000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [highlightKnowledgeId, knowledge.items?.length, onHighlightConsumed]);
  const competitors = competitorsData?.data || [];

  // === BRAND PROFILE FORM ===
  const [bp, setBp] = useState({});
  useEffect(() => {
    if (profile) setBp({
      company_name: profile.company_name || '',
      company_description: profile.company_description || '',
      industry: profile.industry || '',
      website_url: profile.website_url || '',
      country: profile.country || '',
      active_markets: profile.active_markets || [],
      mission: profile.mission || '',
      vision: profile.vision || '',
      core_values: profile.core_values || [],
      usps: profile.usps || [],
      seo_keywords: profile.seo_keywords || [],
      content_goals: profile.content_goals || {},
    });
  }, [profile?.company_name, profile?.mission, destinationId]);

  // Tone of Voice form (from branding.toneOfVoice)
  const [tone, setTone] = useState({});
  useEffect(() => {
    if (profile.toneOfVoice) setTone({ ...profile.toneOfVoice });
  }, [profile?.toneOfVoice?.personality, destinationId]);

  const saveMut = useMutation({
    mutationFn: (data) => brandProfileService.updateProfile(destinationId, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['brand-profile', destinationId] }); setSnack({ open: true, message: t('common.saved', 'Opgeslagen'), severity: 'success' }); },
    onError: (err) => setSnack({ open: true, message: err.message, severity: 'error' }),
  });

  const saveToneMut = useMutation({
    mutationFn: async (toneData) => {
      const c = (await import('../../api/client.js')).default;
      // Fetch current branding via destinations list (no dedicated GET /:id/branding endpoint)
      const { data: destsRes } = await c.get('/destinations');
      const dest = destsRes?.data?.destinations?.find(d => d.id === destinationId);
      const currentBranding = dest?.branding || {};
      return c.put(`/destinations/${destinationId}/branding`, { ...currentBranding, toneOfVoice: toneData }).then(r => r.data);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['brand-profile', destinationId] }); setSnack({ open: true, message: t('common.saved', 'Opgeslagen'), severity: 'success' }); },
    onError: (err) => setSnack({ open: true, message: err.message, severity: 'error' }),
  });

  // Chip input helper
  const [chipInputs, setChipInputs] = useState({});
  const addChip = (field) => {
    const val = (chipInputs[field] || '').trim();
    if (!val) return;
    setBp(prev => ({ ...prev, [field]: [...(prev[field] || []), val] }));
    setChipInputs(prev => ({ ...prev, [field]: '' }));
  };
  const removeChip = (field, idx) => setBp(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== idx) }));

  // === PERSONA DIALOG ===
  const [personaDialog, setPersonaDialog] = useState(null); // null=closed, {}=new, {id:...}=edit
  const [personaForm, setPersonaForm] = useState({});
  const personaCreateMut = useMutation({ mutationFn: (d) => brandProfileService.createPersona(destinationId, d), onSuccess: () => { refetchPersonas(); setPersonaDialog(null); } });
  const personaUpdateMut = useMutation({ mutationFn: ({ id, ...d }) => brandProfileService.updatePersona(id, d), onSuccess: () => { refetchPersonas(); setPersonaDialog(null); } });
  const personaDeleteMut = useMutation({ mutationFn: (id) => brandProfileService.deletePersona(id), onSuccess: () => refetchPersonas() });

  const openPersonaDialog = (persona = null) => {
    setPersonaForm(persona || { name: '', age_range: '', gender: '', location: '', language: 'nl', interests: '', pain_points: '', tone_notes: '', preferred_channels: [], is_primary: false });
    setPersonaDialog(persona || {});
  };

  // === KNOWLEDGE ===
  const knowledgeAddMut = useMutation({ mutationFn: (d) => brandProfileService.addKnowledge(destinationId, d), onSuccess: () => refetchKnowledge() });
  const knowledgeUploadMut = useMutation({ mutationFn: (file) => brandProfileService.uploadKnowledgeDoc(destinationId, file), onSuccess: () => refetchKnowledge() });
  const knowledgeDeleteMut = useMutation({ mutationFn: (id) => brandProfileService.deleteKnowledge(id), onSuccess: () => refetchKnowledge() });
  const [urlInput, setUrlInput] = useState('');

  // Knowledge Base preview dialog state (Blok 1)
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [previewState, setPreviewState] = useState(null);
  // shape: { id, source_name, isLoading, type: 'pdf'|'json'|'error', blobUrl?, content_excerpt?, ... }

  const openKbPreview = async (item) => {
    setPreviewState({ id: item.id, source_name: item.source_name, isLoading: true });
    try {
      const result = await brandProfileService.previewKnowledge(item.id);
      setPreviewState({ id: item.id, source_name: item.source_name, isLoading: false, ...result });
    } catch (err) {
      setPreviewState({
        id: item.id,
        source_name: item.source_name,
        isLoading: false,
        type: 'error',
        error: err.response?.data?.error?.message || err.message || 'Onbekende fout',
      });
    }
  };

  const closeKbPreview = () => {
    // Memory leak prevention: revoke blob URL when dialog closes
    if (previewState?.blobUrl) {
      URL.revokeObjectURL(previewState.blobUrl);
    }
    setPreviewState(null);
  };

  const handleKbDownload = async (id) => {
    try {
      await brandProfileService.downloadKnowledge(id);
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.error?.message || t('brandProfile.knowledge.downloadFailed', 'Download mislukt') });
    }
  };

  // === COMPETITORS ===
  const [compName, setCompName] = useState('');
  const [compUrl, setCompUrl] = useState('');
  const compAddMut = useMutation({ mutationFn: (d) => brandProfileService.addCompetitor(destinationId, d), onSuccess: () => { refetchCompetitors(); setCompName(''); setCompUrl(''); } });
  const compAnalyzeMut = useMutation({ mutationFn: (id) => brandProfileService.analyzeCompetitor(id), onSuccess: () => refetchCompetitors() });
  const compDeleteMut = useMutation({ mutationFn: (id) => brandProfileService.deleteCompetitor(id), onSuccess: () => refetchCompetitors() });

  // === WEBSITE ANALYSIS ===
  const [analyzing, setAnalyzing] = useState(false);
  const [websiteAnalysis, setWebsiteAnalysis] = useState(null);

  const handleAnalyzeWebsite = async () => {
    if (!bp.website_url) return;
    setAnalyzing(true);
    try {
      const result = await brandProfileService.analyzeWebsite(destinationId, bp.website_url);
      setWebsiteAnalysis(result.data?.analysis || null);
    } catch (err) {
      setSnack({ open: true, message: err.message, severity: 'error' });
    } finally { setAnalyzing(false); }
  };

  const sectionIcon = (Icon, label) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Icon fontSize="small" color="primary" />
      <Typography variant="subtitle1" fontWeight={600}>{label}</Typography>
    </Box>
  );

  if (profileLoading) return <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      {/* 1. Bedrijfsprofiel */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          {sectionIcon(BusinessIcon, t('brandProfile.sections.company', 'Bedrijfsprofiel'))}
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label={t('brandProfile.fields.company_name', 'Bedrijfsnaam')} value={bp.company_name || ''} onChange={e => setBp(p => ({ ...p, company_name: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('brandProfile.fields.industry', 'Branche')}</InputLabel>
                <Select value={bp.industry || ''} label={t('brandProfile.fields.industry', 'Branche')} onChange={e => setBp(p => ({ ...p, industry: e.target.value }))}>
                  {INDUSTRY_OPTIONS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField fullWidth size="small" label={t('brandProfile.fields.website', 'Website')} value={bp.website_url || ''} onChange={e => setBp(p => ({ ...p, website_url: e.target.value }))} placeholder="https://example.com" />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button variant="outlined" startIcon={analyzing ? <CircularProgress size={16} /> : <SearchIcon />} onClick={handleAnalyzeWebsite} disabled={!bp.website_url || analyzing} fullWidth sx={{ height: 40 }}>
                {t('brandProfile.fields.analyze_website', 'Analyseer website')}
              </Button>
            </Grid>
            {websiteAnalysis && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, borderColor: 'info.main', borderWidth: 2, bgcolor: 'info.50' }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Website-analyse resultaat:</Typography>
                  {websiteAnalysis.tone && <Typography variant="body2" sx={{ mb: 0.5 }}><strong>Toon:</strong> {websiteAnalysis.tone}</Typography>}
                  {websiteAnalysis.themes?.length > 0 && <Typography variant="body2" sx={{ mb: 0.5 }}><strong>Thema's:</strong> {websiteAnalysis.themes.join(', ')}</Typography>}
                  {websiteAnalysis.usps?.length > 0 && <Typography variant="body2" sx={{ mb: 0.5 }}><strong>USPs:</strong> {websiteAnalysis.usps.join(', ')}</Typography>}
                  {websiteAnalysis.audience_indicators?.length > 0 && <Typography variant="body2" sx={{ mb: 0.5 }}><strong>Doelgroep:</strong> {websiteAnalysis.audience_indicators.join(', ')}</Typography>}
                  {websiteAnalysis.writing_style && <Typography variant="body2" sx={{ mb: 0.5 }}><strong>Schrijfstijl:</strong> {websiteAnalysis.writing_style}</Typography>}
                  <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 1 }}>
                    <Button variant="contained" color="success" onClick={async () => {
                      // Merge analysis into brand profile + tone of voice → save
                      const updates = { ...bp };
                      // USPs: merge (deduplicate)
                      if (websiteAnalysis.usps?.length > 0) {
                        const existing = new Set((updates.usps || []).map(u => u.toLowerCase()));
                        const newUsps = websiteAnalysis.usps.filter(u => !existing.has(u.toLowerCase()));
                        updates.usps = [...(updates.usps || []), ...newUsps];
                      }
                      // Themes → SEO keywords (merge)
                      if (websiteAnalysis.themes?.length > 0) {
                        const existingKw = new Set((updates.seo_keywords || []).map(k => k.toLowerCase()));
                        const newKw = websiteAnalysis.themes.filter(t => !existingKw.has(t.toLowerCase()));
                        updates.seo_keywords = [...(updates.seo_keywords || []), ...newKw];
                      }
                      // Writing style → company_description (if empty)
                      if (!updates.company_description && websiteAnalysis.writing_style) {
                        updates.company_description = websiteAnalysis.writing_style;
                      }
                      setBp(updates);

                      // Save brand profile
                      try {
                        await saveMut.mutateAsync(updates);
                      } catch { /* snack handled by mutation */ }

                      // Save tone of voice (writing_style + tone → branding.toneOfVoice)
                      // AND update local tone state so fields are immediately visible
                      if (websiteAnalysis.tone || websiteAnalysis.writing_style) {
                        try {
                          const c = (await import('../../api/client.js')).default;
                          const { data: brandingRes } = await c.get(`/destinations/${destinationId}/branding`);
                          const currentBranding = brandingRes?.data?.branding || {};
                          const currentTone = currentBranding.toneOfVoice || {};
                          const updatedTone = {
                            ...currentTone,
                            personality: websiteAnalysis.tone || currentTone.personality || '',
                            adjectives: websiteAnalysis.writing_style || currentTone.adjectives || '',
                            audience: websiteAnalysis.audience_indicators?.join(', ') || currentTone.audience || '',
                            coreKeywords: websiteAnalysis.themes?.join(', ') || currentTone.coreKeywords || '',
                          };
                          await c.put(`/destinations/${destinationId}/branding`, {
                            ...currentBranding,
                            toneOfVoice: updatedTone,
                          });
                          // Update local tone state immediately
                          setTone(prev => ({ ...prev, ...updatedTone }));
                        } catch (toneErr) {
                          console.warn('Tone of voice update failed (non-blocking):', toneErr.message);
                        }
                      }

                      setSnack({ open: true, message: 'Analyse overgenomen in Merk Profiel en Tone of Voice', severity: 'success' });
                      setWebsiteAnalysis(null);
                    }}>
                      Overnemen in profiel
                    </Button>
                    <Button variant="outlined" onClick={() => setWebsiteAnalysis(null)}>
                      Sluiten
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={3} size="small" label={t('brandProfile.fields.description', 'Korte omschrijving')} value={bp.company_description || ''} onChange={e => setBp(p => ({ ...p, company_description: e.target.value }))} inputProps={{ maxLength: 500 }} helperText={`${(bp.company_description || '').length}/500`} />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>{t('brandProfile.fields.usps', 'USPs (unieke verkoopargumenten)')}</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                {(bp.usps || []).map((usp, i) => <Chip key={i} label={usp} onDelete={() => removeChip('usps', i)} size="small" />)}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField size="small" placeholder={t('brandProfile.fields.add_usp', 'Voeg USP toe')} value={chipInputs.usps || ''} onChange={e => setChipInputs(p => ({ ...p, usps: e.target.value }))} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addChip('usps'))} sx={{ flex: 1 }} />
                <Button size="small" onClick={() => addChip('usps')} startIcon={<AddIcon />}>{t('common.add', 'Toevoegen')}</Button>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={() => saveMut.mutate(bp)} disabled={saveMut.isPending} size="small">
                {saveMut.isPending ? t('common.saving', 'Opslaan...') : t('common.save', 'Opslaan')}
              </Button>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* 2. Missie, Visie & Waarden */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          {sectionIcon(FlagIcon, t('brandProfile.sections.mission', 'Missie, Visie & Waarden'))}
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={2} size="small" label={t('brandProfile.fields.mission', 'Missie')} value={bp.mission || ''} onChange={e => setBp(p => ({ ...p, mission: e.target.value }))} placeholder="Waarom bestaan wij?" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label={t('brandProfile.fields.vision', 'Visie')} value={bp.vision || ''} onChange={e => setBp(p => ({ ...p, vision: e.target.value }))} placeholder="Waar werken wij naartoe?" />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>{t('brandProfile.fields.core_values', 'Kernwaarden')}</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                {(bp.core_values || []).map((v, i) => <Chip key={i} label={v} onDelete={() => removeChip('core_values', i)} size="small" color="primary" variant="outlined" />)}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField size="small" placeholder="Voeg kernwaarde toe" value={chipInputs.core_values || ''} onChange={e => setChipInputs(p => ({ ...p, core_values: e.target.value }))} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addChip('core_values'))} sx={{ flex: 1 }} />
                <Button size="small" onClick={() => addChip('core_values')} startIcon={<AddIcon />}>{t('common.add', 'Toevoegen')}</Button>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={() => saveMut.mutate(bp)} disabled={saveMut.isPending} size="small">{t('common.save', 'Opslaan')}</Button>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* 3. Doelgroepen */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          {sectionIcon(PeopleIcon, t('brandProfile.sections.audiences', 'Doelgroepen'))}
          <Chip label={personas.length} size="small" sx={{ ml: 1 }} />
        </AccordionSummary>
        <AccordionDetails>
          <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={() => openPersonaDialog()} sx={{ mb: 2 }}>{t('brandProfile.fields.add_persona', 'Nieuwe doelgroep')}</Button>
          {personas.map(p => (
            <Paper key={p.id} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>{p.is_primary ? '★ ' : ''}{p.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {[p.age_range, p.location, p.language?.toUpperCase()].filter(Boolean).join(' · ')}
                  </Typography>
                  {p.interests && <Typography variant="body2" sx={{ mt: 0.5 }}>{p.interests}</Typography>}
                </Box>
                <Box>
                  <IconButton size="small" onClick={() => openPersonaDialog(p)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => personaDeleteMut.mutate(p.id)}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
              </Box>
            </Paper>
          ))}
          {personas.length === 0 && (
            <Box sx={{ py: 2, textAlign: 'center' }}>
              <Typography color="text.secondary" variant="body2" sx={{ mb: 1 }}>{t('brandProfile.personas.empty', 'Nog geen doelgroepen gedefinieerd.')}</Typography>
              <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setPersonaDialog({})}>{t('brandProfile.personas.addFirst', 'Eerste doelgroep toevoegen')}</Button>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      {/* 4. Tone of Voice — inline editing */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          {sectionIcon(RecordVoiceOverIcon, t('brandProfile.sections.tone', 'Tone of Voice'))}
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label={t('brandProfile.tone.personality', 'Persoonlijkheid')} value={tone.personality || ''} onChange={e => setTone(t => ({ ...t, personality: e.target.value }))} placeholder="Warm, professioneel, betrouwbaar" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label={t('brandProfile.tone.audience', 'Doelgroep')} value={tone.audience || ''} onChange={e => setTone(t => ({ ...t, audience: e.target.value }))} placeholder="Professionals 30-55, ondernemers" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label={t('brandProfile.tone.brandValues', 'Merkwaarden')} value={tone.brandValues || ''} onChange={e => setTone(t => ({ ...t, brandValues: e.target.value }))} placeholder="Kwaliteit, innovatie, duurzaamheid" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label={t('brandProfile.tone.coreKeywords', 'Kernwoorden')} value={tone.coreKeywords || ''} onChange={e => setTone(t => ({ ...t, coreKeywords: e.target.value }))} placeholder="Woorden die uw merk typeren" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label={t('brandProfile.tone.adjectives', 'Gewenste bijvoeglijke naamwoorden')} value={tone.adjectives || ''} onChange={e => setTone(t => ({ ...t, adjectives: e.target.value }))} placeholder="Betrouwbaar, innovatief, persoonlijk" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label={t('brandProfile.tone.avoidWords', 'Vermijd deze woorden')} value={tone.avoidWords || ''} onChange={e => setTone(t => ({ ...t, avoidWords: e.target.value }))} placeholder="Goedkoop, basic, saai" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label={t('brandProfile.tone.samplePhrases', 'Voorbeeldzinnen')} value={tone.samplePhrases || ''} onChange={e => setTone(t => ({ ...t, samplePhrases: e.target.value }))} placeholder="Typische zinnen die uw merk zou gebruiken" />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('brandProfile.tone.formalAddress', 'Aanspreekstijl')}</InputLabel>
                <Select value={tone.formalAddress || 'je'} label={t('brandProfile.tone.formalAddress', 'Aanspreekstijl')} onChange={e => setTone(t => ({ ...t, formalAddress: e.target.value }))}>
                  <MenuItem value="je">{t('brandProfile.tone.informal', 'Informeel (je/jij)')}</MenuItem>
                  <MenuItem value="u">{t('brandProfile.tone.formal', 'Formeel (u)')}</MenuItem>
                  <MenuItem value="mixed">{t('brandProfile.tone.mixed', 'Gemengd')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={() => saveToneMut.mutate(tone)} disabled={saveToneMut.isPending} size="small">
                {saveToneMut.isPending ? t('common.saving', 'Opslaan...') : t('common.save', 'Opslaan')}
              </Button>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* 5. Knowledge Base */}
      <Accordion defaultExpanded={!!highlightKnowledgeId}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          {sectionIcon(MenuBookIcon, t('brandProfile.sections.knowledge', 'Knowledge Base'))}
          <Chip label={`${knowledge.totalSources || 0} bronnen`} size="small" sx={{ ml: 1 }} />
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload documenten die de AI als bron mag gebruiken bij content generatie.
          </Typography>

          {/* Upload document */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Button variant="outlined" component="label" startIcon={knowledgeUploadMut.isPending ? <CircularProgress size={16} /> : <UploadFileIcon />} disabled={knowledgeUploadMut.isPending}>
              {t('brandProfile.fields.upload_document', 'Upload document')}
              <input type="file" hidden accept=".pdf,.docx,.doc,.txt,.csv" onChange={e => { const f = e.target.files?.[0]; if (f) knowledgeUploadMut.mutate(f); e.target.value = ''; }} />
            </Button>
            <TextField size="small" placeholder="https://example.com/page" value={urlInput} onChange={e => setUrlInput(e.target.value)} sx={{ flex: 1, minWidth: 200 }} />
            <Button variant="outlined" startIcon={<LinkIcon />} onClick={() => { if (urlInput.trim()) { knowledgeAddMut.mutate({ source_type: 'url', source_name: urlInput, source_url: urlInput }); setUrlInput(''); } }} disabled={!urlInput.trim()}>
              {t('brandProfile.fields.add_url', 'URL toevoegen')}
            </Button>
          </Box>

          {/* Knowledge items list (Blok 1 — clickable preview + download) */}
          <List dense>
            {(knowledge.items || []).map(item => (
              <ListItem
                key={item.id}
                id={`kb-source-${item.id}`}
                button
                onClick={() => openKbPreview(item)}
                sx={{
                  bgcolor: highlightedKbId === item.id ? 'success.light' : 'action.hover',
                  borderRadius: 1, mb: 0.5,
                  transition: 'background-color 0.6s ease',
                  outline: highlightedKbId === item.id ? '2px solid' : 'none',
                  outlineColor: 'success.main',
                  outlineOffset: 2,
                  cursor: 'pointer',
                  // Reserve room for 2 IconButtons (44px each) + spacing
                  pr: 12,
                }}
              >
                <ListItemText
                  primary={item.source_name}
                  secondary={`${item.source_type} · ${item.word_count} ${t('brandProfile.knowledge.words', 'woorden')}`}
                />
                <ListItemSecondaryAction>
                  <Tooltip title={t('brandProfile.knowledge.download', 'Download')}>
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleKbDownload(item.id); }}
                      aria-label={t('brandProfile.knowledge.download', 'Download')}
                      sx={{ minWidth: 44, minHeight: 44 }}
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('common.delete', 'Verwijderen')}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => { e.stopPropagation(); knowledgeDeleteMut.mutate(item.id); }}
                      aria-label={t('common.delete', 'Verwijderen')}
                      sx={{ minWidth: 44, minHeight: 44 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
          {knowledge.totalWords > 0 && (
            <Typography variant="caption" color="text.secondary">Totaal: {knowledge.totalSources} bronnen, ~{knowledge.totalWords} woorden</Typography>
          )}
        </AccordionDetails>
      </Accordion>

      {/* 6. Concurrenten */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          {sectionIcon(CompareArrowsIcon, t('brandProfile.sections.competitors', 'Concurrenten'))}
          <Chip label={competitors.length} size="small" sx={{ ml: 1 }} />
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField size="small" placeholder="Naam" value={compName} onChange={e => setCompName(e.target.value)} sx={{ flex: 1 }} />
            <TextField size="small" placeholder="https://concurrent.com" value={compUrl} onChange={e => setCompUrl(e.target.value)} sx={{ flex: 1 }} />
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => { if (compName.trim()) { compAddMut.mutate({ name: compName, website_url: compUrl }); } }} disabled={!compName.trim()}>
              {t('brandProfile.fields.add_competitor', 'Toevoegen')}
            </Button>
          </Box>
          {competitors.map(c => {
            let analysis = null;
            try { analysis = typeof c.analysis_summary === 'string' ? JSON.parse(c.analysis_summary) : c.analysis_summary; } catch { /* empty */ }
            return (
              <Paper key={c.id} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600}>{c.name}</Typography>
                    {c.website_url && <Typography variant="caption" color="primary">{c.website_url}</Typography>}
                  </Box>
                  <Box>
                    <Button size="small" startIcon={compAnalyzeMut.isPending ? <CircularProgress size={14} /> : <SearchIcon />}
                      onClick={() => compAnalyzeMut.mutate(c.id)} disabled={!c.website_url || compAnalyzeMut.isPending}>
                      {t('brandProfile.fields.analyze', 'Analyseer')}
                    </Button>
                    <IconButton size="small" color="error" onClick={() => compDeleteMut.mutate(c.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </Box>
                </Box>
                {analysis && (
                  <Box sx={{ mt: 1, pl: 1, borderLeft: '3px solid', borderColor: 'primary.main' }}>
                    {analysis.positioning && <Typography variant="body2"><strong>Positionering:</strong> {analysis.positioning}</Typography>}
                    {analysis.core_themes?.length > 0 && <Typography variant="body2"><strong>Thema's:</strong> {analysis.core_themes.join(', ')}</Typography>}
                    {analysis.differentiation_opportunities?.length > 0 && <Typography variant="body2"><strong>Differentiatie:</strong> {analysis.differentiation_opportunities.join(', ')}</Typography>}
                  </Box>
                )}
              </Paper>
            );
          })}
        </AccordionDetails>
      </Accordion>

      {/* 7. Content Strategie */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          {sectionIcon(StrategyIcon, t('brandProfile.sections.strategy', 'Content Strategie'))}
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>{t('brandProfile.fields.seo_keywords', 'SEO-focus keywords')}</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                {(bp.seo_keywords || []).map((kw, i) => <Chip key={i} label={kw} onDelete={() => removeChip('seo_keywords', i)} size="small" color="info" variant="outlined" />)}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField size="small" placeholder="Voeg keyword toe" value={chipInputs.seo_keywords || ''} onChange={e => setChipInputs(p => ({ ...p, seo_keywords: e.target.value }))} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addChip('seo_keywords'))} sx={{ flex: 1 }} />
                <Button size="small" onClick={() => addChip('seo_keywords')} startIcon={<AddIcon />}>{t('common.add', 'Toevoegen')}</Button>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" type="number" label={t('brandProfile.fields.blogs_per_month', 'Blogs per maand')} value={bp.content_goals?.blogs_per_month || ''} onChange={e => setBp(p => ({ ...p, content_goals: { ...(p.content_goals || {}), blogs_per_month: Number(e.target.value) } }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" type="number" label={t('brandProfile.fields.posts_per_week', 'Social posts per week')} value={bp.content_goals?.posts_per_week || ''} onChange={e => setBp(p => ({ ...p, content_goals: { ...(p.content_goals || {}), posts_per_week: Number(e.target.value) } }))} />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={() => saveMut.mutate(bp)} disabled={saveMut.isPending} size="small">{t('common.save', 'Opslaan')}</Button>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* === PERSONA DIALOG === */}
      <Dialog open={!!personaDialog} onClose={() => setPersonaDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{personaDialog?.id ? 'Doelgroep bewerken' : 'Nieuwe doelgroep'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField fullWidth size="small" label="Naam" value={personaForm.name || ''} onChange={e => setPersonaForm(p => ({ ...p, name: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="Leeftijd" value={personaForm.age_range || ''} onChange={e => setPersonaForm(p => ({ ...p, age_range: e.target.value }))} placeholder="35-55" /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="Geslacht" value={personaForm.gender || ''} onChange={e => setPersonaForm(p => ({ ...p, gender: e.target.value }))} placeholder="Gemengd" /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="Locatie" value={personaForm.location || ''} onChange={e => setPersonaForm(p => ({ ...p, location: e.target.value }))} /></Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small"><InputLabel>Taal</InputLabel>
                <Select value={personaForm.language || 'nl'} label="Taal" onChange={e => setPersonaForm(p => ({ ...p, language: e.target.value }))}>
                  <MenuItem value="nl">Nederlands</MenuItem><MenuItem value="en">English</MenuItem>
                  <MenuItem value="de">Deutsch</MenuItem><MenuItem value="es">Español</MenuItem><MenuItem value="fr">Français</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}><TextField fullWidth size="small" multiline rows={2} label="Interesses" value={personaForm.interests || ''} onChange={e => setPersonaForm(p => ({ ...p, interests: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" multiline rows={2} label="Pijnpunten" value={personaForm.pain_points || ''} onChange={e => setPersonaForm(p => ({ ...p, pain_points: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="Toon-notities" value={personaForm.tone_notes || ''} onChange={e => setPersonaForm(p => ({ ...p, tone_notes: e.target.value }))} placeholder="Warm, informeel, du-vorm" /></Grid>
            <Grid item xs={12}><FormControlLabel control={<Checkbox checked={personaForm.is_primary || false} onChange={e => setPersonaForm(p => ({ ...p, is_primary: e.target.checked }))} />} label="Primaire doelgroep" /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPersonaDialog(null)}>{t('common.cancel', 'Annuleren')}</Button>
          <Button variant="contained" onClick={() => {
            if (personaDialog?.id) personaUpdateMut.mutate({ id: personaDialog.id, ...personaForm });
            else personaCreateMut.mutate(personaForm);
          }} disabled={!personaForm.name || personaCreateMut.isPending || personaUpdateMut.isPending}>
            {personaDialog?.id ? 'Bijwerken' : 'Aanmaken'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Knowledge Base preview dialog (Blok 1 — EU AI Act transparency) */}
      <Dialog
        open={!!previewState}
        onClose={closeKbPreview}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        aria-labelledby="kb-preview-title"
      >
        <DialogTitle id="kb-preview-title" sx={{ pr: 7 }}>
          {previewState?.source_name || t('brandProfile.knowledge.preview', 'Voorbeeld')}
          <IconButton
            onClick={closeKbPreview}
            aria-label={t('common.close', 'Sluiten')}
            sx={{ position: 'absolute', right: 8, top: 8, minWidth: 44, minHeight: 44 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: isMobile ? 1 : 2 }}>
          {previewState?.isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          )}
          {previewState?.type === 'pdf' && (
            <iframe
              src={previewState.blobUrl}
              style={{ width: '100%', height: isMobile ? '70vh' : '70vh', border: 0 }}
              title={previewState.source_name}
            />
          )}
          {previewState?.type === 'json' && (
            <>
              {previewState.source_url && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  URL: {previewState.source_url}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {previewState.word_count} {t('brandProfile.knowledge.words', 'woorden')}
              </Typography>
              <Box
                component="pre"
                sx={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: 13,
                  bgcolor: 'action.hover',
                  p: 2,
                  borderRadius: 1,
                  maxHeight: '60vh',
                  overflow: 'auto',
                  m: 0,
                }}
              >
                {previewState.content_excerpt || t('brandProfile.knowledge.previewEmpty', '(geen inhoud beschikbaar)')}
              </Box>
              {previewState.download_required && (
                <Alert severity="info" sx={{ mt: 1.5 }}>
                  {t('brandProfile.knowledge.downloadForFull', 'Voorbeeld toont eerste 5000 tekens. Download voor de volledige inhoud.')}
                </Alert>
              )}
            </>
          )}
          {previewState?.type === 'error' && (
            <Alert severity="error">{previewState.error}</Alert>
          )}
        </DialogContent>
        <DialogActions>
          {previewState?.id && (
            <Button
              onClick={() => handleKbDownload(previewState.id)}
              startIcon={<DownloadIcon />}
            >
              {t('brandProfile.knowledge.download', 'Download')}
            </Button>
          )}
          <Button onClick={closeKbPreview}>
            {t('common.close', 'Sluiten')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))} message={snack.message} />
    </Box>
  );
}
