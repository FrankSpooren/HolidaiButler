import { useEffect } from 'react';
import { Select, MenuItem, FormControl, Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import useAuthStore from '../../stores/authStore.js';
import useDestinationStore from '../../stores/destinationStore.js';
import client from '../../api/client.js';

const FLAG_MAP = { 1: '🇪🇸', 2: '🇳🇱', 4: '🇧🇪', 5: '🇪🇸', 6: '🇪🇸', 7: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' };

export default function DestinationSelector({ value, onChange }) {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const setDestinations = useDestinationStore(s => s.setDestinations);

  // Fetch destinations from API (includes featureFlags, destinationType, status)
  const { data } = useQuery({
    queryKey: ['destinations-list'],
    queryFn: () => client.get('/destinations').then(r => r.data),
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  const allDests = data?.data?.destinations || [];

  // Sync to store whenever data changes
  useEffect(() => {
    if (allDests.length > 0) {
      setDestinations(allDests);
    }
  }, [allDests, setDestinations]);

  // Filter by user's allowed destinations
  const allowedDests = user?.allowed_destinations;
  const isPlatformAdmin = user?.role === 'platform_admin';
  const visibleDestinations = isPlatformAdmin || !allowedDests || allowedDests.length === 0
    ? allDests
    : allDests.filter(d => allowedDests.includes(d.code));

  const showAll = isPlatformAdmin || visibleDestinations.length > 1;

  return (
    <FormControl size="small" sx={{ minWidth: 180 }}>
      <Select
        value={value || 'all'}
        onChange={(e) => onChange?.(e.target.value)}
        sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'inherit', '& .MuiSelect-icon': { color: 'inherit' } }}
      >
        {showAll && <MenuItem value="all">{t('common.allDestinations')}</MenuItem>}
        {visibleDestinations.map(d => (
          <MenuItem key={d.code} value={d.code}>
            {FLAG_MAP[d.id] || '🌍'} {d.name}
            {d.destinationType === 'content_only' && (
              <Chip label="CS" size="small" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} color="info" variant="outlined" />
            )}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
