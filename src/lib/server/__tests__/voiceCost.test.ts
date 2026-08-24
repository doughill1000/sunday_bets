// The AI voice's spend accounting (#849, ADR-0008 §6).
//
// The caps in voice.ts are only as honest as the number they compare against. For most of this
// module's life that number came from two hardcoded per-token rates that never matched what the
// gateway actually billed — output was off 5× — so "$0.05 per call" really meant about $0.20.
// The Gateway reports real spend on `usage.cost`, so these tests pin the precedence: reported
// cost wins, and the rate table is only the fallback for a response that carries no cost field.
import { describe, it, expect, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: {} }));

const { estimateCostUsd } = await import('../recap/voice');

describe('estimateCostUsd', () => {
  it('uses the cost the gateway reported, not the local rate table', () => {
    // A real probe: 39 in / 57 out on openai/gpt-5.6-sol billed $0.000648.
    expect(estimateCostUsd(39, 57, 0.000648)).toBe(0.000648);
  });

  it('prefers the reported cost even when it disagrees with the token estimate', () => {
    // Whatever the rates say locally, the invoice is the invoice — a promo, a cached-token
    // discount, or a mid-flight price change must not be argued with.
    expect(estimateCostUsd(1000, 1000, 0.5)).toBe(0.5);
    expect(estimateCostUsd(1000, 1000, 0)).toBe(0);
  });

  it('falls back to the token estimate when no cost is reported', () => {
    // $2/1M in, $10/1M out.
    expect(estimateCostUsd(1_000_000, 0)).toBeCloseTo(2, 10);
    expect(estimateCostUsd(0, 1_000_000)).toBeCloseTo(10, 10);
    // The #189-measured recap shape, on the current model: 540×$2/1M + 310×$10/1M.
    expect(estimateCostUsd(540, 310)).toBeCloseTo(0.00418, 10);
  });

  it('falls back when the reported cost is absent or unusable', () => {
    const estimate = estimateCostUsd(540, 310);
    expect(estimateCostUsd(540, 310, null)).toBe(estimate);
    expect(estimateCostUsd(540, 310, undefined)).toBe(estimate);
    // A NaN or negative from a malformed payload must not read as "this call was free".
    expect(estimateCostUsd(540, 310, Number.NaN)).toBe(estimate);
    expect(estimateCostUsd(540, 310, -1)).toBe(estimate);
  });

  it('treats missing token counts as zero rather than throwing', () => {
    expect(estimateCostUsd(null, null)).toBe(0);
  });
});
