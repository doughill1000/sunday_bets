export function toDecimalNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number.parseFloat(String(v));
  return Number.isNaN(n) ? null : n;
}
