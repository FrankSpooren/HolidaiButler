import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Container,
  Box,
  Typography,
  Button,
  Chip,
  Grid,
  Paper,
  CircularProgress,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ArrowBack,
  Event as EventIcon,
  Place,
  Schedule,
  Euro,
  EuroOff,
  Person,
  Language,
  Phone,
  Email,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { nl, enUS, es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import agendaAPI from '../services/agendaService';

const dateLocales = { nl, en: enUS, es };

/**
 * AgendaDetails Screen
 * Detailed event information page
 * Mobile-first responsive design
 */

function AgendaDetails() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const locale = dateLocales[i18n.language] || nl;

  // Fetch event details
  const { data, isLoading, error } = useQuery(
    ['event', eventId],
    () => agendaAPI.getEventById(eventId),
    {
      onError: (err) => {
        toast.error(t('common.error'));
        console.error('Error fetching event:', err);
      },
    }
  );

  const event = data?.data;

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error || !event) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h6" color="error" align="center">
          {t('common.error')}
        </Typography>
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button variant="contained" onClick={() => navigate('/agenda')}>
            {t('common.backToList')}
          </Button>
        </Box>
      </Container>
    );
  }

  const title = event.title?.[i18n.language] || event.title?.nl || event.title?.en || 'Event';
  const description =
    event.description?.[i18n.language] || event.description?.nl || event.description?.en || '';

  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const isSameDay = format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd');

  const dateDisplay = isSameDay
    ? format(startDate, 'EEEE, dd MMMM yyyy', { locale })
    : `${format(startDate, 'dd MMMM', { locale })} - ${format(endDate, 'dd MMMM yyyy', { locale })}`;

  const timeDisplay = event.allDay
    ? t('timeOfDay.all-day')
    : `${format(startDate, 'HH:mm', { locale })} - ${format(endDate, 'HH:mm', { locale })}`;

  const primaryImage = event.images?.find((img) => img.isPrimary)?.url || event.images?.[0]?.url;

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 2, md: 4 } }}>
      <Container maxWidth="lg">
        {/* Back Button */}
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/agenda')}
          sx={{ mb: 3 }}
        >
          {t('common.backToList')}
        </Button>

        {/* Hero Image */}
        {primaryImage && (
          <Box
            component="img"
            src={primaryImage}
            alt={title}
            sx={{
              width: '100%',
              height: { xs: 250, sm: 400, md: 500 },
              objectFit: 'cover',
              borderRadius: 2,
              mb: 3,
            }}
          />
        )}

        <Grid container spacing={3}>
          {/* Main Content */}
          <Grid item xs={12} md={8}>
            <Paper elevation={2} sx={{ p: { xs: 2, md: 3 } }}>
              {/* Title */}
              <Typography
                variant="h3"
                component="h1"
                gutterBottom
                sx={{ fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' } }}
              >
                {title}
              </Typography>

              {/* Categories */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
                <Chip
                  label={t(`categories.${event.primaryCategory}`)}
                  color="primary"
                />
                {event.secondaryCategories?.map((cat) => (
                  <Chip
                    key={cat}
                    label={t(`categories.${cat}`)}
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Description */}
              <Typography
                variant="body1"
                paragraph
                sx={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.8,
                }}
              >
                {description}
              </Typography>

              {/* Target Audience */}
              {event.targetAudience && event.targetAudience.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    {t('event.audience')}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {event.targetAudience.map((audience) => (
                      <Chip
                        key={audience}
                        label={t(`audience.${audience}`)}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            <Paper elevation={2} sx={{ p: 2, position: 'sticky', top: 16 }}>
              {/* Date & Time */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <EventIcon sx={{ mr: 1, color: 'primary.main', mt: 0.5 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {t('event.date')}
                    </Typography>
                    <Typography variant="body1">{dateDisplay}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <Schedule sx={{ mr: 1, color: 'primary.main', mt: 0.5 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {t('event.time')}
                    </Typography>
                    <Typography variant="body1">{timeDisplay}</Typography>
                  </Box>
                </Box>

                {/* Location */}
                {event.location?.name && (
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Place sx={{ mr: 1, color: 'primary.main', mt: 0.5 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t('event.location')}
                      </Typography>
                      <Typography variant="body1">{event.location.name}</Typography>
                      {event.location.address && (
                        <Typography variant="body2" color="text.secondary">
                          {event.location.address}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}

                {/* Price */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  {event.pricing?.isFree ? <EuroOff sx={{ mr: 1, color: 'success.main', mt: 0.5 }} /> : <Euro sx={{ mr: 1, color: 'primary.main', mt: 0.5 }} />}
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {t('event.price')}
                    </Typography>
                    <Typography variant="body1">
                      {event.pricing?.isFree ? t('event.free') : event.pricing?.price?.amount ? `€${event.pricing.price.amount}` : '-'}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Organizer */}
              {event.organizer?.name && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem' }}>
                    {t('event.organizer')}
                  </Typography>
                  <Typography variant="body2">{event.organizer.name}</Typography>
                  {event.organizer.website && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <Language fontSize="small" sx={{ mr: 0.5 }} />
                      <Typography
                        variant="body2"
                        component="a"
                        href={event.organizer.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ color: 'primary.main', textDecoration: 'none' }}
                      >
                        {t('event.website')}
                      </Typography>
                    </Box>
                  )}
                  {event.organizer.phone && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <Phone fontSize="small" sx={{ mr: 0.5 }} />
                      <Typography variant="body2">{event.organizer.phone}</Typography>
                    </Box>
                  )}
                  {event.organizer.email && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <Email fontSize="small" sx={{ mr: 0.5 }} />
                      <Typography variant="body2">{event.organizer.email}</Typography>
                    </Box>
                  )}
                </Box>
              )}

              {/* Registration */}
              {event.registration?.required && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box>
                    <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem' }}>
                      {t('event.registration')}
                    </Typography>
                    <Typography variant="body2" color="warning.main" gutterBottom>
                      {t('event.registrationRequired')}
                    </Typography>
                    {event.registration.url && (
                      <Button
                        variant="contained"
                        fullWidth
                        href={event.registration.url}
                        target="_blank"
                        sx={{ mt: 1 }}
                      >
                        {t('event.registration')}
                      </Button>
                    )}
                  </Box>
                </>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default AgendaDetails;
