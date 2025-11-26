import { Card, CardContent, CardMedia, Typography, Chip, Box, IconButton } from '@mui/material';
import { Event as EventIcon, Place, Schedule, Euro, EuroOff } from '@mui/icons-material';
import { format } from 'date-fns';
import { nl, enUS, es, de, fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

/**
 * AgendaCard Component
 * Displays a single event in card format
 * Mobile-first responsive design
 */

const dateLocales = {
  nl,
  en: enUS,
  es,
  de,
  fr,
};

function AgendaCard({ event, variant = 'grid' }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const locale = dateLocales[i18n.language] || nl;

  // Get localized title and description
  const title = event.title?.[i18n.language] || event.title?.nl || event.title?.en || 'Event';
  const description = event.description?.[i18n.language] || event.description?.nl || '';

  // Format date
  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const isSameDay = format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd');

  const dateDisplay = isSameDay
    ? format(startDate, 'dd MMMM yyyy', { locale })
    : `${format(startDate, 'dd MMM', { locale })} - ${format(endDate, 'dd MMM yyyy', { locale })}`;

  const timeDisplay = event.allDay
    ? t('timeOfDay.all-day')
    : format(startDate, 'HH:mm', { locale });

  // Get primary image
  const primaryImage = event.images?.find((img) => img.isPrimary)?.url || event.images?.[0]?.url;

  const handleClick = () => {
    navigate(`/agenda/${event._id}`);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  if (variant === 'list') {
    return (
      <Card
        component="article"
        role="button"
        tabIndex={0}
        aria-label={`${t('event.viewDetails')}: ${title}`}
        sx={{
          display: 'flex',
          mb: 2,
          cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 4,
          },
          '&:focus': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
        }}
        onClick={handleClick}
        onKeyPress={handleKeyPress}
      >
        {primaryImage && (
          <CardMedia
            component="img"
            sx={{
              width: { xs: 100, sm: 150 },
              height: { xs: 100, sm: 150 },
              objectFit: 'cover',
            }}
            image={primaryImage}
            alt={`${title} - ${t('event.eventImage')}`}
          />
        )}
        <CardContent sx={{ flex: 1, p: { xs: 1.5, sm: 2 } }}>
          <Typography variant="h6" component="h2" gutterBottom>
            {title}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
              <EventIcon fontSize="small" sx={{ mr: 0.5, color: 'primary.main' }} aria-hidden="true" />
              <Typography variant="body2" color="text.secondary" component="time" dateTime={event.startDate}>
                {dateDisplay}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
              <Schedule fontSize="small" sx={{ mr: 0.5, color: 'primary.main' }} aria-hidden="true" />
              <Typography variant="body2" color="text.secondary">
                {timeDisplay}
              </Typography>
            </Box>

            {event.location?.name && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Place fontSize="small" sx={{ mr: 0.5, color: 'primary.main' }} aria-hidden="true" />
                <Typography variant="body2" color="text.secondary">
                  {event.location.name}
                </Typography>
              </Box>
            )}
          </Box>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              mb: 1,
            }}
          >
            {description}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              label={t(`categories.${event.primaryCategory}`)}
              size="small"
              color="primary"
              variant="outlined"
              aria-label={`${t('event.category')}: ${t(`categories.${event.primaryCategory}`)}`}
            />
            {event.pricing?.isFree && (
              <Chip
                icon={<EuroOff aria-hidden="true" />}
                label={t('event.free')}
                size="small"
                color="success"
                variant="outlined"
                aria-label={t('event.freeEvent')}
              />
            )}
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Grid variant (default)
  return (
    <Card
      component="article"
      role="button"
      tabIndex={0}
      aria-label={`${t('event.viewDetails')}: ${title}`}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
        },
        '&:focus': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 2,
        },
      }}
      onClick={handleClick}
      onKeyPress={handleKeyPress}
    >
      {primaryImage ? (
        <CardMedia
          component="img"
          height="200"
          image={primaryImage}
          alt={`${title} - ${t('event.eventImage')}`}
          sx={{
            objectFit: 'cover',
          }}
        />
      ) : (
        <Box
          sx={{
            height: 200,
            bgcolor: 'grey.200',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          role="img"
          aria-label={t('event.noImage')}
        >
          <EventIcon sx={{ fontSize: 60, color: 'grey.400' }} aria-hidden="true" />
        </Box>
      )}

      <CardContent sx={{ flexGrow: 1, p: { xs: 1.5, sm: 2 } }}>
        <Typography
          variant="h6"
          component="h2"
          gutterBottom
          sx={{
            fontSize: { xs: '1rem', sm: '1.25rem' },
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            minHeight: { xs: '2.5rem', sm: '3rem' },
          }}
        >
          {title}
        </Typography>

        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <EventIcon fontSize="small" sx={{ mr: 0.5, color: 'primary.main' }} aria-hidden="true" />
            <Typography variant="body2" color="text.secondary" component="time" dateTime={event.startDate}>
              {dateDisplay}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <Schedule fontSize="small" sx={{ mr: 0.5, color: 'primary.main' }} aria-hidden="true" />
            <Typography variant="body2" color="text.secondary">
              {timeDisplay}
            </Typography>
          </Box>

          {event.location?.name && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Place fontSize="small" sx={{ mr: 0.5, color: 'primary.main' }} aria-hidden="true" />
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {event.location.name}
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip
            label={t(`categories.${event.primaryCategory}`)}
            size="small"
            color="primary"
            sx={{ fontSize: '0.75rem' }}
            aria-label={`${t('event.category')}: ${t(`categories.${event.primaryCategory}`)}`}
          />
          {event.pricing?.isFree && (
            <Chip
              icon={<EuroOff sx={{ fontSize: '1rem' }} aria-hidden="true" />}
              label={t('event.free')}
              size="small"
              color="success"
              sx={{ fontSize: '0.75rem' }}
              aria-label={t('event.freeEvent')}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default AgendaCard;
