import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Rating,
  Chip,
  CircularProgress,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close as CloseIcon,
  Verified as VerifiedIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Language as WebsiteIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

/**
 * POIComparisonModal - Side-by-side comparison of 2-4 POIs
 * WCAG 2.1 AA Compliant
 *
 * Features:
 * - Full-screen modal with close button
 * - Side-by-side comparison table
 * - Images, ratings, prices, descriptions
 * - Contact information
 * - Responsive design
 */
const POIComparisonModal = ({
  pois = [],
  isOpen,
  onClose,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const getBudgetLabel = (priceLevel) => {
    if (!priceLevel) return '-';
    const labels = {
      1: t('poi.budget', 'Budget'),
      2: t('poi.midRange', 'Middel'),
      3: t('poi.upscale', 'Luxe'),
      4: t('poi.luxury', 'Premium'),
    };
    return labels[priceLevel] || '-';
  };

  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      aria-labelledby="comparison-dialog-title"
    >
      <DialogTitle
        id="comparison-dialog-title"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" component="span">
          {t('poi.comparison.title', 'Vergelijk ervaringen')}
        </Typography>
        <IconButton
          onClick={onClose}
          aria-label={t('common.close', 'Sluiten')}
          sx={{ ml: 2 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {isLoading ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 300,
            }}
          >
            <CircularProgress />
          </Box>
        ) : pois.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {t('poi.comparison.noPois', 'Selecteer 2-4 ervaringen om te vergelijken')}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: pois.length * 250 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 150, fontWeight: 600 }}></TableCell>
                  {pois.map((poi) => (
                    <TableCell
                      key={poi.id}
                      align="center"
                      sx={{ minWidth: 200, maxWidth: 280 }}
                    >
                      {/* POI Header */}
                      <Box sx={{ mb: 2 }}>
                        {/* Image */}
                        <Box
                          sx={{
                            width: '100%',
                            height: 120,
                            borderRadius: 1,
                            overflow: 'hidden',
                            mb: 1.5,
                          }}
                        >
                          <img
                            src={poi.image || '/images/placeholder.jpg'}
                            alt={poi.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        </Box>

                        {/* Name & Category */}
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                          {poi.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                          <Chip label={poi.category} size="small" />
                          {poi.verified && (
                            <Chip
                              icon={<VerifiedIcon sx={{ fontSize: 14 }} />}
                              label={t('poi.verified', 'Geverifieerd')}
                              size="small"
                              color="success"
                            />
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {/* Rating */}
                <TableRow>
                  <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
                    {t('poi.rating', 'Beoordeling')}
                  </TableCell>
                  {pois.map((poi) => (
                    <TableCell key={poi.id} align="center">
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Rating value={poi.rating || 0} readOnly size="small" precision={0.1} />
                        <Typography variant="body2" color="text.secondary">
                          {poi.rating?.toFixed(1) || '-'} ({poi.reviewCount || 0})
                        </Typography>
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>

                {/* Price */}
                <TableRow>
                  <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
                    {t('poi.price', 'Prijs')}
                  </TableCell>
                  {pois.map((poi) => (
                    <TableCell key={poi.id} align="center">
                      {poi.price ? (
                        <Typography variant="h6" color="primary" fontWeight={600}>
                          {'\u20AC'}{poi.price}
                        </Typography>
                      ) : poi.priceLevel ? (
                        <Box>
                          <Typography variant="body1">
                            {'\u20AC'.repeat(poi.priceLevel)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {getBudgetLabel(poi.priceLevel)}
                          </Typography>
                        </Box>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  ))}
                </TableRow>

                {/* Location */}
                <TableRow>
                  <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationIcon fontSize="small" />
                      {t('poi.location', 'Locatie')}
                    </Box>
                  </TableCell>
                  {pois.map((poi) => (
                    <TableCell key={poi.id} align="center">
                      {poi.location || poi.address || '-'}
                    </TableCell>
                  ))}
                </TableRow>

                {/* Description */}
                <TableRow>
                  <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
                    {t('poi.description', 'Beschrijving')}
                  </TableCell>
                  {pois.map((poi) => (
                    <TableCell key={poi.id}>
                      <Typography
                        variant="body2"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {poi.description || '-'}
                      </Typography>
                    </TableCell>
                  ))}
                </TableRow>

                {/* Duration (if available) */}
                {pois.some(poi => poi.duration) && (
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
                      {t('poi.duration', 'Duur')}
                    </TableCell>
                    {pois.map((poi) => (
                      <TableCell key={poi.id} align="center">
                        {poi.duration || '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                )}

                {/* Contact */}
                <TableRow>
                  <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
                    {t('poi.contact', 'Contact')}
                  </TableCell>
                  {pois.map((poi) => (
                    <TableCell key={poi.id} align="center">
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {poi.phone && (
                          <Button
                            size="small"
                            startIcon={<PhoneIcon />}
                            href={`tel:${poi.phone}`}
                            sx={{ textTransform: 'none' }}
                          >
                            {poi.phone}
                          </Button>
                        )}
                        {poi.website && (
                          <Button
                            size="small"
                            startIcon={<WebsiteIcon />}
                            href={poi.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ textTransform: 'none' }}
                          >
                            {t('poi.visitWebsite', 'Website')}
                          </Button>
                        )}
                        {!poi.phone && !poi.website && '-'}
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Typography variant="body2" color="text.secondary">
          {t('poi.comparison.hint', 'Selecteer 2-4 ervaringen om te vergelijken')}
        </Typography>
        <Button onClick={onClose} variant="contained">
          {t('common.close', 'Sluiten')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default POIComparisonModal;
