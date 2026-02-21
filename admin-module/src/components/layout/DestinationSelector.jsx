import { Select, MenuItem, FormControl } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { DESTINATIONS } from '../../utils/destinations.js';

export default function DestinationSelector({ value, onChange }) {
  const { t } = useTranslation();

  return (
    <FormControl size="small" sx={{ minWidth: 180 }}>
      <Select
        value={value || 'all'}
        onChange={(e) => onChange?.(e.target.value)}
        sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'inherit', '& .MuiSelect-icon': { color: 'inherit' } }}
      >
        <MenuItem value="all">{t('common.allDestinations')}</MenuItem>
        {DESTINATIONS.map(d => (
          <MenuItem key={d.code} value={d.code}>{d.flag} {d.name}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
