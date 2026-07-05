// Display formatting — port of the web app's src/lib/ui/format.ts.
export function formatKickoff(iso: string) {
  const d = new Date(iso);
  const dow = d.toLocaleDateString(undefined, { weekday: 'short' });
  const date = d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${dow} ${date} ${time}`;
}

export function formatSignedPoints(points: number): string {
  return points > 0 ? `+${points}` : `${points}`;
}

export function formatRecord(wins: number, losses: number, pushes: number): string {
  return `${wins}-${losses}-${pushes}`;
}
