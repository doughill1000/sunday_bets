// Decide whether black or white text has better contrast on a gradient.
// We approximate by averaging the two stops' luminance.

function hexToRgb(hex: string): [number, number, number] {
  const n = hex.replace('#', '');
  const v =
    n.length === 3
      ? n.split('').map((c) => parseInt(c + c, 16))
      : [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
  return v as [number, number, number];
}

function srgbToLin(c: number) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  const R = srgbToLin(r),
    G = srgbToLin(g),
    B = srgbToLin(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function textOn(c1: string, c2?: string) {
  const L = (luminance(c1) + luminance(c2 ?? c1)) / 2;
  // Contrast vs black ~ (L+0.05)/(0.05); vs white ~ (1.05)/(L+0.05)
  const contrastBlack = (L + 0.05) / 0.05;
  const contrastWhite = 1.05 / (L + 0.05);
  return contrastWhite >= contrastBlack ? '#FFFFFF' : '#000000';
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn),
    min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0,
    s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn:
        h = ((gn - bn) / d) % 6;
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g] = [c, x];
  else if (h < 120) [r, g] = [x, c];
  else if (h < 180) [g, b] = [c, x];
  else if (h < 240) [g, b] = [x, c];
  else if (h < 300) [r, b] = [x, c];
  else [r, b] = [c, x];
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

// Lower a color's saturation toward gray while preserving its hue and
// lightness. `keep` is the fraction of saturation retained (0 = gray, 1 = unchanged).
export function mute(hex: string, keep: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  return hslToHex(h, s * keep, l);
}
