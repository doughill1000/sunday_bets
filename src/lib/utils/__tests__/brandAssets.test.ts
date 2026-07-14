import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  IOS_STARTUP_IMAGES,
  pngDimensions,
  startupImageMedia,
  startupImagePlacement
} from '../../../../scripts/generate-brand-assets.mjs';

const repoRoot = process.cwd();

describe('iOS startup images', () => {
  it('keeps every generated PNG at its declared device-pixel dimensions', async () => {
    for (const startupImage of IOS_STARTUP_IMAGES) {
      const png = await readFile(path.join(repoRoot, 'static', startupImage.filename));
      expect(pngDimensions(png)).toEqual({
        width: startupImage.width,
        height: startupImage.height
      });
    }
  });

  it('keeps the centered lockup inside the declared safe area', () => {
    for (const startupImage of IOS_STARTUP_IMAGES) {
      const placement = startupImagePlacement(startupImage.width, startupImage.height);

      expect(placement.x).toBeGreaterThanOrEqual(placement.safeInset);
      expect(placement.y).toBeGreaterThanOrEqual(placement.safeInset);
      expect(startupImage.width - placement.x - placement.width).toBeGreaterThanOrEqual(
        placement.safeInset
      );
      expect(startupImage.height - placement.y - placement.height).toBeGreaterThanOrEqual(
        placement.safeInset
      );
    }
  });

  it('wires one exact portrait media query for every generated PNG', async () => {
    const appHtml = await readFile(path.join(repoRoot, 'src', 'app.html'), 'utf8');
    const document = new DOMParser().parseFromString(appHtml, 'text/html');
    const links = Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[rel="apple-touch-startup-image"]')
    ).map((link) => ({ href: link.getAttribute('href'), media: link.getAttribute('media') }));

    expect(links).toEqual(
      IOS_STARTUP_IMAGES.map((startupImage) => ({
        href: `/${startupImage.filename}`,
        media: startupImageMedia(startupImage)
      }))
    );
  });
});
