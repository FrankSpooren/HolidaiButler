export function formatNumber(num) {
  if (num == null) return '—';
  return new Intl.NumberFormat('nl-NL').format(num);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('nl-NL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function formatUptime(hours) {
  if (hours == null) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours.toFixed(1)} uur`;
  const days = Math.floor(hours / 24);
  const remaining = (hours % 24).toFixed(0);
  return `${days}d ${remaining}u`;
}
