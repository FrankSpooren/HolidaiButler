import React from 'react';
import {
  Box,
  Skeleton,
  Card,
  CardContent,
  Grid,
  Stack,
  Paper,
} from '@mui/material';

/**
 * Loading Skeletons Collection
 * HolidaiButler Customer Portal
 * Sprint 3: Polish & Performance
 *
 * Provides consistent loading states across the application
 * following best practices for perceived performance.
 */

/**
 * POI Card Skeleton
 * Used in POI list/grid views
 */
export const POICardSkeleton = ({ variant = 'default' }) => {
  if (variant === 'compact') {
    return (
      <Card sx={{ height: 280 }}>
        <Skeleton variant="rectangular" height={140} animation="wave" />
        <CardContent>
          <Skeleton width="40%" height={24} />
          <Skeleton width="80%" height={20} sx={{ mt: 1 }} />
          <Skeleton width="60%" height={16} sx={{ mt: 0.5 }} />
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Skeleton width={60} height={20} />
            <Skeleton width={80} height={20} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Skeleton variant="rectangular" height={200} animation="wave" />
      <CardContent sx={{ flexGrow: 1 }}>
        <Skeleton width="30%" height={24} sx={{ mb: 1 }} />
        <Skeleton width="90%" height={28} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, my: 1 }}>
          <Skeleton variant="circular" width={16} height={16} />
          <Skeleton width="50%" height={16} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Skeleton width={100} height={20} />
          <Skeleton width={40} height={16} />
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
          <Skeleton width={80} height={24} />
          <Skeleton width={80} height={24} />
        </Box>
      </CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, pt: 0 }}>
        <Box>
          <Skeleton width={60} height={28} />
          <Skeleton width={80} height={14} />
        </Box>
        <Skeleton variant="rectangular" width={80} height={36} sx={{ borderRadius: 1 }} />
      </Box>
    </Card>
  );
};

/**
 * POI Grid Skeleton
 * Full grid of POI card skeletons
 */
export const POIGridSkeleton = ({ count = 6, columns = { xs: 1, sm: 2, md: 3 } }) => (
  <Grid container spacing={3}>
    {Array.from({ length: count }).map((_, index) => (
      <Grid item xs={12} sm={6} md={4} key={index}>
        <POICardSkeleton />
      </Grid>
    ))}
  </Grid>
);

/**
 * List Item Skeleton
 * Used in list views
 */
export const ListItemSkeleton = ({ showImage = true }) => (
  <Paper sx={{ p: 2, display: 'flex', gap: 2 }}>
    {showImage && (
      <Skeleton variant="rectangular" width={120} height={80} sx={{ borderRadius: 1, flexShrink: 0 }} />
    )}
    <Box sx={{ flexGrow: 1 }}>
      <Skeleton width="70%" height={24} />
      <Skeleton width="50%" height={18} sx={{ mt: 0.5 }} />
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <Skeleton width={60} height={20} />
        <Skeleton width={80} height={20} />
      </Box>
    </Box>
    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
      <Skeleton width={50} height={24} />
      <Skeleton width={70} height={32} sx={{ mt: 1 }} />
    </Box>
  </Paper>
);

/**
 * List Skeleton
 * Multiple list items
 */
export const ListSkeleton = ({ count = 5 }) => (
  <Stack spacing={2}>
    {Array.from({ length: count }).map((_, index) => (
      <ListItemSkeleton key={index} />
    ))}
  </Stack>
);

/**
 * Detail Page Skeleton
 * Used for POI/Restaurant detail pages
 */
export const DetailPageSkeleton = () => (
  <Box>
    {/* Hero Image */}
    <Skeleton variant="rectangular" height={300} animation="wave" />

    <Box sx={{ p: 3 }}>
      {/* Title and badges */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ flexGrow: 1 }}>
          <Skeleton width={100} height={24} sx={{ mb: 1 }} />
          <Skeleton width="60%" height={40} />
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Skeleton width={80} height={24} />
            <Skeleton width={100} height={24} />
          </Box>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Skeleton width={80} height={36} />
          <Skeleton width={100} height={20} />
        </Box>
      </Box>

      {/* Description */}
      <Box sx={{ mt: 3 }}>
        <Skeleton width="100%" height={20} />
        <Skeleton width="100%" height={20} />
        <Skeleton width="80%" height={20} />
      </Box>

      {/* Info cards */}
      <Grid container spacing={2} sx={{ mt: 3 }}>
        {[1, 2, 3].map((i) => (
          <Grid item xs={12} sm={4} key={i}>
            <Paper sx={{ p: 2 }}>
              <Skeleton variant="circular" width={40} height={40} />
              <Skeleton width="80%" height={24} sx={{ mt: 1 }} />
              <Skeleton width="60%" height={18} />
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Gallery */}
      <Box sx={{ mt: 3 }}>
        <Skeleton width={120} height={28} sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', gap: 1, overflow: 'hidden' }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              width={200}
              height={150}
              sx={{ borderRadius: 1, flexShrink: 0 }}
            />
          ))}
        </Box>
      </Box>

      {/* CTA */}
      <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
        <Skeleton variant="rectangular" width={150} height={48} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" width={150} height={48} sx={{ borderRadius: 1 }} />
      </Box>
    </Box>
  </Box>
);

/**
 * Filter Bar Skeleton
 * Used for filter/search areas
 */
export const FilterBarSkeleton = () => (
  <Box sx={{ mb: 3 }}>
    {/* Search */}
    <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, mb: 2 }} />

    {/* Filter chips */}
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} width={100} height={36} sx={{ borderRadius: 18 }} />
      ))}
    </Box>
  </Box>
);

/**
 * Form Skeleton
 * Used for booking/reservation forms
 */
export const FormSkeleton = () => (
  <Stack spacing={3}>
    {/* Form fields */}
    {[1, 2, 3].map((i) => (
      <Box key={i}>
        <Skeleton width={100} height={20} sx={{ mb: 0.5 }} />
        <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1 }} />
      </Box>
    ))}

    {/* Date/Time row */}
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Box sx={{ flexGrow: 1 }}>
        <Skeleton width={80} height={20} sx={{ mb: 0.5 }} />
        <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1 }} />
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <Skeleton width={80} height={20} sx={{ mb: 0.5 }} />
        <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1 }} />
      </Box>
    </Box>

    {/* Submit button */}
    <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1, mt: 2 }} />
  </Stack>
);

/**
 * Table Skeleton
 * Used for data tables
 */
export const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <Paper>
    {/* Header */}
    <Box sx={{ display: 'flex', p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
      {Array.from({ length: columns }).map((_, i) => (
        <Box key={i} sx={{ flex: i === 0 ? 2 : 1, px: 1 }}>
          <Skeleton width="80%" height={20} />
        </Box>
      ))}
    </Box>

    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <Box
        key={rowIndex}
        sx={{ display: 'flex', p: 2, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Box key={colIndex} sx={{ flex: colIndex === 0 ? 2 : 1, px: 1 }}>
            <Skeleton width={colIndex === 0 ? '60%' : '40%'} height={20} />
          </Box>
        ))}
      </Box>
    ))}
  </Paper>
);

/**
 * Profile Skeleton
 * Used for user profile pages
 */
export const ProfileSkeleton = () => (
  <Box>
    {/* Header */}
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
      <Skeleton variant="circular" width={100} height={100} />
      <Box sx={{ flexGrow: 1 }}>
        <Skeleton width={200} height={32} />
        <Skeleton width={150} height={20} sx={{ mt: 1 }} />
      </Box>
      <Skeleton variant="rectangular" width={100} height={40} sx={{ borderRadius: 1 }} />
    </Box>

    {/* Stats */}
    <Grid container spacing={2} sx={{ mb: 4 }}>
      {[1, 2, 3, 4].map((i) => (
        <Grid item xs={6} sm={3} key={i}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Skeleton width={60} height={36} sx={{ mx: 'auto' }} />
            <Skeleton width={80} height={18} sx={{ mx: 'auto', mt: 1 }} />
          </Paper>
        </Grid>
      ))}
    </Grid>

    {/* Content sections */}
    {[1, 2].map((i) => (
      <Box key={i} sx={{ mb: 3 }}>
        <Skeleton width={150} height={28} sx={{ mb: 2 }} />
        <Paper sx={{ p: 2 }}>
          <Stack spacing={2}>
            {[1, 2, 3].map((j) => (
              <Box key={j} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Skeleton variant="rectangular" width={60} height={60} sx={{ borderRadius: 1 }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Skeleton width="70%" height={20} />
                  <Skeleton width="50%" height={16} sx={{ mt: 0.5 }} />
                </Box>
                <Skeleton width={80} height={24} />
              </Box>
            ))}
          </Stack>
        </Paper>
      </Box>
    ))}
  </Box>
);

/**
 * Map Skeleton
 * Used for map loading states
 */
export const MapSkeleton = ({ height = 400 }) => (
  <Box sx={{ position: 'relative', height }}>
    <Skeleton
      variant="rectangular"
      height="100%"
      sx={{ borderRadius: 2 }}
      animation="wave"
    />
    {/* Map controls placeholder */}
    <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
      <Skeleton variant="rectangular" width={40} height={80} sx={{ borderRadius: 1 }} />
    </Box>
    {/* Search bar placeholder */}
    <Box sx={{ position: 'absolute', top: 16, left: 16, right: 80 }}>
      <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1 }} />
    </Box>
  </Box>
);

/**
 * Booking Summary Skeleton
 * Used in checkout/confirmation
 */
export const BookingSummarySkeleton = () => (
  <Paper sx={{ p: 3 }}>
    <Skeleton width={120} height={28} sx={{ mb: 2 }} />

    {/* Items */}
    {[1, 2].map((i) => (
      <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Skeleton width="60%" height={20} />
        <Skeleton width={60} height={20} />
      </Box>
    ))}

    <Box sx={{ borderTop: '1px solid', borderColor: 'divider', my: 2, pt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton width={80} height={24} />
        <Skeleton width={80} height={24} />
      </Box>
    </Box>

    <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1, mt: 2 }} />
  </Paper>
);

// Default export with all skeletons
const LoadingSkeletons = {
  POICard: POICardSkeleton,
  POIGrid: POIGridSkeleton,
  ListItem: ListItemSkeleton,
  List: ListSkeleton,
  DetailPage: DetailPageSkeleton,
  FilterBar: FilterBarSkeleton,
  Form: FormSkeleton,
  Table: TableSkeleton,
  Profile: ProfileSkeleton,
  Map: MapSkeleton,
  BookingSummary: BookingSummarySkeleton,
};

export default LoadingSkeletons;
