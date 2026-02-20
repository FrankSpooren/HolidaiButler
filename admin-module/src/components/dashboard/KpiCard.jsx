import { Card, CardContent, Typography, Box } from '@mui/material';
import { formatNumber } from '../../utils/formatters.js';

export default function KpiCard({ icon: Icon, label, value, color }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{
          width: 48, height: 48, borderRadius: 2,
          bgcolor: color ? `${color}18` : 'primary.light',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {Icon && <Icon sx={{ color: color || 'primary.main', fontSize: 24 }} />}
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {typeof value === 'number' ? formatNumber(value) : value}
          </Typography>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
