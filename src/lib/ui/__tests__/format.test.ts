// tests/ui/format.test.ts
import { describe, it, expect, vi } from 'vitest';
import { formatKickoff } from '$lib/ui/format';

describe('formatKickoff', () => {
  it('formats ISO into short DOW, date, and time', () => {
    // Freeze time zone-sensitive methods if you want determinism
    vi.useFakeTimers().setSystemTime(new Date('2025-09-10T12:00:00Z'));

    const out = formatKickoff('2025-09-14T17:00:00Z');
    // We can’t assert exact strings across locales; assert structure:
    expect(out).toMatch(/^\w{3} \d{1,2}\/\d{1,2} \d{1,2}:\d{2}/);
  });
});
