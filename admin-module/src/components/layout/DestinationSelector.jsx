import { Select, MenuItem, FormControl } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { DESTINATIONS } from '../../utils/destinations.js';
import useAuthStore from '../../stores/authStore.js';

export default function DestinationSelector({ value, onChange }) {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);

  // Filter destinations by user's allowed_destinations (platform_admin sees all)
  const allowedDests = user?.allowed_destinations;
  const isPlatformAdmin = user?.role === 'platform_admin';
  const visibleDestinations = isPlatformAdmin || !allowedDests || allowedDests.length === 0
    ? DESTINATIONS
    : DESTINATIONS.filter(d => allowedDests.includes(d.code));

  // If user can only see 1 destination, show "All" option disabled (auto-select that destination)
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
          <MenuItem key={d.code} value={d.code}>{d.flag} {d.name}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
