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
