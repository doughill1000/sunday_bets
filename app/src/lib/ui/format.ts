export function formatKickoff(iso: string) {
  const d = new Date(iso);
  const dow = d.toLocaleDateString(undefined, { weekday: 'short' });
  const date = d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${dow} ${date} ${time}`;
}
