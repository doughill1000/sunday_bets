import { describe, it, expect } from 'vitest';
import { sanitizeParams } from '$lib/server/oddsApiResponses';

describe('sanitizeParams', () => {
  it('strips the apiKey so it is never persisted', () => {
    const params = new URLSearchParams({
      apiKey: 'super-secret-key',
      regions: 'us',
      markets: 'spreads'
    });

    const sanitized = sanitizeParams(params);

    expect(sanitized).not.toHaveProperty('apiKey');
    expect(JSON.stringify(sanitized)).not.toContain('super-secret-key');
    expect(sanitized).toEqual({ regions: 'us', markets: 'spreads' });
  });

  it('keeps every non-key param intact', () => {
    const params = new URLSearchParams({
      apiKey: 'k',
      daysFrom: '3'
    });

    expect(sanitizeParams(params)).toEqual({ daysFrom: '3' });
  });

  it('is a no-op when there is no apiKey to strip', () => {
    const params = new URLSearchParams({ regions: 'us' });

    expect(sanitizeParams(params)).toEqual({ regions: 'us' });
  });
});
