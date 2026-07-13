import { test, expect, type Page } from '@playwright/test';

/**
 * Theme preference (#532).
 *
 * The dark/light/system control on /settings persists per user
 * (`public.users.theme_pref`, written via /api/profile) and is resolved onto
 * `<html>` at SSR (hooks.server.ts `transformPageChunk`) so a reload paints the
 * correct theme with no flash of the wrong one. `system` is left as `class="dark"`
 * server-side and narrowed before first paint by the blocking script in app.html
 * that reads `prefers-color-scheme`.
 *
 * Runs authenticated (default `chromium` project storageState). The spec mutates
 * the shared seeded user's preference, so it restores `dark` in a `finally` block —
 * every other spec assumes the default dark app.
 */

test.describe.configure({ timeout: 30_000 });

const htmlIsDark = (page: Page) =>
  page.evaluate(() => document.documentElement.classList.contains('dark'));

async function setTheme(page: Page, label: 'Dark' | 'Light' | 'System') {
  const saved = page.waitForResponse(
    (r) => r.url().includes('/api/profile') && r.request().method() === 'PUT' && r.ok()
  );
  await page.getByRole('radio', { name: label }).click();
  await saved;
}

test('theme toggles live, persists across reload, and paints without a flash', async ({ page }) => {
  try {
    await page.goto('/settings');

    // Default preference is dark (DEFAULT_THEME_MODE): the app ships dark-only until a
    // user opts in, so a fresh user resolves to the dark class.
    expect(await htmlIsDark(page)).toBe(true);

    // Switch to Light → applied to <html> immediately (ahead of the round-trip).
    await setTheme(page, 'Light');
    expect(await htmlIsDark(page)).toBe(false);

    // Reload → still light (persisted), proving the pref round-tripped to the DB and
    // came back through the auth-context read.
    await page.reload();
    expect(await htmlIsDark(page)).toBe(false);

    // No flash of the wrong theme: the SSR document itself carries the light class, so
    // the browser paints light before any JS runs. Fetch the raw HTML (authenticated via
    // storageState) and assert the <html> tag has no `dark` class.
    const rawLight = await (await page.request.get('/settings')).text();
    const htmlTagLight = rawLight.match(/<html[^>]*>/i)?.[0] ?? '';
    expect(htmlTagLight, htmlTagLight).not.toContain('dark');

    // System mode follows the OS. Emulate a light OS then a dark OS and assert the class
    // tracks it across a reload — SSR defaults the class to dark and the app.html script
    // narrows it to the media query before paint.
    await setTheme(page, 'System');

    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();
    expect(await htmlIsDark(page)).toBe(false);

    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    expect(await htmlIsDark(page)).toBe(true);
  } finally {
    // Restore the shared seeded user's default so other specs see the dark app.
    await page.request.put('/api/profile', { data: { theme_pref: 'dark' } });
  }
});
