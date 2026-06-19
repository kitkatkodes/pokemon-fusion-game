/**
 * Color-space utilities for the fusion pipeline.
 * RGB ↔ HSL, palette blending, hue/saturation transfer.
 */

/** RGB → HSL (h: 0–360, s: 0–1, l: 0–1) */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h * 360, s, l];
}

/** HSL → RGB */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = h / 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [
    Math.round(hue2rgb(h + 1 / 3) * 255),
    Math.round(hue2rgb(h) * 255),
    Math.round(hue2rgb(h - 1 / 3) * 255),
  ];
}

/**
 * Apply a hue rotation and saturation boost to every non-transparent pixel.
 * hueDelta: degrees to rotate (-180 to 180)
 * satBoost: multiplier for saturation (1 = no change, 1.2 = more vivid)
 */
export function applyHueRotation(
  data: ImageData,
  hueDelta: number,
  satBoost = 1.0,
): ImageData {
  const out = new ImageData(
    new Uint8ClampedArray(data.data),
    data.width,
    data.height,
  );
  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i + 3] < 10) continue;
    const [h, s, l] = rgbToHsl(out.data[i], out.data[i + 1], out.data[i + 2]);
    const newH = (h + hueDelta + 360) % 360;
    const newS = Math.min(1, s * satBoost);
    const [r, g, b] = hslToRgb(newH, newS, l);
    out.data[i] = r;
    out.data[i + 1] = g;
    out.data[i + 2] = b;
  }
  return out;
}

/**
 * Reinhard-style luminance transfer: shift mean brightness of `data`
 * towards target lightness `targetL` by `strength` factor (0-1).
 */
export function transferLuminance(
  data: ImageData,
  targetL: number,
  strength = 0.3,
): ImageData {
  // Compute source mean lightness
  let sumL = 0, count = 0;
  for (let i = 0; i < data.data.length; i += 4) {
    if (data.data[i + 3] < 10) continue;
    const [, , l] = rgbToHsl(data.data[i], data.data[i + 1], data.data[i + 2]);
    sumL += l; count++;
  }
  const srcL = count > 0 ? sumL / count : 0.5;
  const delta = (targetL - srcL) * strength;

  const out = new ImageData(new Uint8ClampedArray(data.data), data.width, data.height);
  for (let i = 0; i < out.data.length; i += 4) {
    if (out.data[i + 3] < 10) continue;
    const [h, s, l] = rgbToHsl(out.data[i], out.data[i + 1], out.data[i + 2]);
    const newL = Math.min(1, Math.max(0, l + delta));
    const [r, g, b] = hslToRgb(h, s, newL);
    out.data[i] = r;
    out.data[i + 1] = g;
    out.data[i + 2] = b;
  }
  return out;
}

/** Compute average lightness of non-transparent pixels. */
export function avgLightness(data: ImageData): number {
  let sum = 0, count = 0;
  for (let i = 0; i < data.data.length; i += 4) {
    if (data.data[i + 3] < 10) continue;
    const [, , l] = rgbToHsl(data.data[i], data.data[i + 1], data.data[i + 2]);
    sum += l; count++;
  }
  return count > 0 ? sum / count : 0.5;
}
