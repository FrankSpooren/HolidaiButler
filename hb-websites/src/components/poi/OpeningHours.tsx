interface CalpeHours {
  open: string;
  close: string;
}

type OpeningHoursData =
  | Record<string, CalpeHours[]>  // Calpe format: { monday: [{ open, close }] }
  | Array<{ day: string; hours: string }>  // Texel format: [{ day: "dinsdag", hours: "06:00 to 16:00" }]
  | null;

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};
const DUTCH_DAY_MAP: Record<string, string> = {
  maandag: 'monday', dinsdag: 'tuesday', woensdag: 'wednesday',
  donderdag: 'thursday', vrijdag: 'friday', zaterdag: 'saturday', zondag: 'sunday',
};

function isTexelFormat(data: NonNullable<OpeningHoursData>): data is Array<{ day: string; hours: string }> {
  return Array.isArray(data);
}

function normalizeHours(data: NonNullable<OpeningHoursData>): Array<{ day: string; label: string; hours: string }> {
  if (isTexelFormat(data)) {
    return data.map(entry => {
      const key = DUTCH_DAY_MAP[entry.day.toLowerCase()] ?? entry.day.toLowerCase();
      return {
        day: key,
        label: DAY_LABELS[key] ?? entry.day,
        hours: entry.hours.replace(' to ', ' - '),
      };
    });
  }

  return DAY_ORDER
    .filter(day => data[day])
    .map(day => ({
      day,
      label: DAY_LABELS[day],
      hours: data[day].map(slot => `${slot.open} - ${slot.close}`).join(', '),
    }));
}

function getTodayKey(): string {
  return DAY_ORDER[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
}

export default function OpeningHours({ data }: { data: OpeningHoursData }) {
  if (!data) return null;

  const rows = normalizeHours(data);
  if (rows.length === 0) return null;

  const today = getTodayKey();

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-2">Opening Hours</h3>
      <div className="space-y-1">
        {rows.map(row => (
          <div
            key={row.day}
            className={`flex justify-between text-sm px-2 py-1 rounded ${
              row.day === today ? 'bg-primary/10 font-medium' : ''
            }`}
          >
            <span className="text-muted">{row.label}</span>
            <span className="text-foreground">{row.hours || 'Closed'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
