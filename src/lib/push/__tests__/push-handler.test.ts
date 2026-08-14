import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// static/push-handler.js is plain JS loaded into the generated service worker via
// workbox.importScripts (vite.config.ts) — it is never bundled, so nothing else in the
// app imports it and a regression there is invisible to every other test. Evaluate the
// real shipped file against a stubbed SW global so this spec cannot drift from it.
// (import.meta.url is not a file: URL under Vitest's transform — resolve from the Vitest
// root, which is the project root.)
const SOURCE = readFileSync(resolve(process.cwd(), 'static/push-handler.js'), 'utf8');

type Listener = (event: unknown) => void;

function loadHandler() {
  const listeners = new Map<string, Listener>();
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const self = {
    addEventListener: (type: string, fn: Listener) => void listeners.set(type, fn),
    registration: { showNotification }
  };
  const clients = { matchAll: vi.fn().mockResolvedValue([]), openWindow: vi.fn() };

  new Function('self', 'clients', SOURCE)(self, clients);
  return { listeners, showNotification };
}

/** Fire the push listener with a payload the SW will read via event.data.json(). */
function firePush(data: { json: () => unknown; text: () => string } | null) {
  const { listeners, showNotification } = loadHandler();
  const push = listeners.get('push');
  if (!push) throw new Error('push-handler.js registered no push listener');
  push({ data, waitUntil: () => {} });
  return showNotification;
}

function payload(body: unknown) {
  return { json: () => body, text: () => JSON.stringify(body) };
}

describe('service worker push handler', () => {
  it('sets renotify alongside tag so a repeat push for the same tag re-alerts (#814)', () => {
    const showNotification = firePush(
      payload({ title: 'Hotshot', body: '3 games kick off soon', tag: 'pregame-week-42' })
    );

    expect(showNotification).toHaveBeenCalledTimes(1);
    const [title, options] = showNotification.mock.calls[0];
    expect(title).toBe('Hotshot');
    // Coalescing stays — one tray entry per subject...
    expect(options.tag).toBe('pregame-week-42');
    // ...but the replacement must alert instead of silently updating the tray entry.
    expect(options.renotify).toBe(true);
  });

  it('carries renotify on every tagged surface', () => {
    for (const tag of ['test', 'pregame-week-1', 'results-recap-week-1', 'ai-recap-g-week-1']) {
      const options = firePush(payload({ title: 'Hotshot', body: '', tag })).mock.calls[0][1];
      expect(options).toMatchObject({ tag, renotify: true });
    }
  });

  it('omits both tag and renotify when the payload carries no tag', () => {
    // renotify without a tag is a TypeError: setting it unconditionally would sink the
    // notification entirely rather than merely failing to re-alert.
    const options = firePush(payload({ title: 'Hotshot', body: 'no tag here' })).mock.calls[0][1];

    expect(options).not.toHaveProperty('renotify');
    expect(options).not.toHaveProperty('tag');
    expect(options.body).toBe('no tag here');
  });

  it('still shows an untagged notification when the payload is not JSON', () => {
    const showNotification = firePush({
      json: () => {
        throw new SyntaxError('not json');
      },
      text: () => 'raw body'
    });

    const [title, options] = showNotification.mock.calls[0];
    expect(title).toBe('Hotshot');
    expect(options.body).toBe('raw body');
    expect(options).not.toHaveProperty('renotify');
  });

  it('falls back to defaults when the push carries no data at all', () => {
    const [title, options] = firePush(null).mock.calls[0];

    expect(title).toBe('Hotshot');
    expect(options.data.url).toBe('/');
    expect(options).not.toHaveProperty('renotify');
  });
});
