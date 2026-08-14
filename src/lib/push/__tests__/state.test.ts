import { describe, it, expect } from 'vitest';
import { resolvePushCardState, type PushDeviceStatus } from '../state';

const live: PushDeviceStatus = { supported: true, permission: 'granted', subscribed: true };

describe('resolvePushCardState', () => {
  it('is on only when the account switch and this device agree', () => {
    expect(resolvePushCardState(true, live)).toBe('on');
  });

  it('reports device-unsubscribed when the account is on but this device has no subscription (#814)', () => {
    // The reinstalled-PWA case: the account flag alone used to render a Disable button here.
    expect(resolvePushCardState(true, { ...live, subscribed: false })).toBe('device-unsubscribed');
  });

  it('reports device-unsubscribed when permission was never asked for on this device', () => {
    expect(resolvePushCardState(true, { ...live, permission: 'default', subscribed: false })).toBe(
      'device-unsubscribed'
    );
  });

  it('is off whenever the account switch is off, subscription or not', () => {
    expect(resolvePushCardState(false, { ...live, subscribed: false })).toBe('off');
    expect(resolvePushCardState(false, live)).toBe('off');
  });

  it('reports blocked rather than device-unsubscribed when permission is denied', () => {
    // Both are true of a denied device; only the blocked banner names the real remedy.
    expect(resolvePushCardState(true, { ...live, permission: 'denied', subscribed: false })).toBe(
      'blocked'
    );
    expect(resolvePushCardState(false, { ...live, permission: 'denied', subscribed: false })).toBe(
      'blocked'
    );
  });

  it('reports unsupported for a browser without the push APIs', () => {
    expect(
      resolvePushCardState(true, { supported: false, permission: 'unsupported', subscribed: false })
    ).toBe('unsupported');
  });

  it('falls back to the account answer while the device read is unresolved', () => {
    // navigator.serviceWorker.ready never settles without a registered SW, so this is not
    // a transient state everywhere — it must not raise a false "not on this device" alarm.
    expect(resolvePushCardState(true, null)).toBe('on');
    expect(resolvePushCardState(false, null)).toBe('off');
  });
});
