import { Box, Typography, Divider } from '@mui/material';
import { SelectField, TextField, SwitchField } from '../fields/index.js';

const VIEW_OPTIONS = [
  { value: 'dayGridMonth', label: 'Month view' },
  { value: 'dayGridWeek', label: 'Week view' },
  { value: 'listMonth', label: 'Agenda list' },
];
const START_DAY_OPTIONS = [
  { value: 1, label: 'Monday (NL/DE/ES)' },
  { value: 0, label: 'Sunday (EN)' },
];

export default function CalendarViewEditor({ data, onChange }) {
  data = data || {};
  const u = (field, value) => onChange({ ...data, [field]: value });
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>Calendar View</Typography>
      <TextField label="Title" value={data.title || ''} onChange={v => u('title', v)} />
      <SelectField label="Default view" value={data.view || 'dayGridMonth'} options={VIEW_OPTIONS} onChange={v => u('view', v)} />
      <SelectField label="Week starts on" value={data.startDay ?? 1} options={START_DAY_OPTIONS} onChange={v => u('startDay', parseInt(v))} />
      <SwitchField label="Show week numbers" checked={data.showWeekNumbers || false} onChange={v => u('showWeekNumbers', v)} />
      <Divider sx={{ my: 1 }} />
      <TextField label="Categories filter (comma-separated)" value={(data.categories || []).join(', ')} onChange={v => u('categories', v.split(',').map((s) => s.trim()).filter(Boolean))} helperText="Leave empty to show all events" />
      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
        Powered by FullCalendar (MIT). Includes month, week, and agenda views
        with built-in accessibility, i18n, and keyboard navigation.
      </Typography>
    </Box>
  );
}
