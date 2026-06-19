/**
 * Computer vision — edge detection.
 * Implements Sobel operator + non-max suppression for clean edge maps.
 */

import { gaussianBlurGray, toGrayscale } from './imageProcessing';

/** Compute Sobel magnitude map (Float32Array, values 0–1). */
export function sobelEdges(data: ImageData): Float32Array {
  const { width, height } = data;
  // Pre-blur to reduce noise
  const gray = gaussianBlurGray(toGrayscale(data), width, height, 1.2);
  const edges = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const tl = gray[(y - 1) * width + (x - 1)];
      const tc = gray[(y - 1) * width + x];
      const tr = gray[(y - 1) * width + (x + 1)];
      const ml = gray[y * width + (x - 1)];
      const mr = gray[y * width + (x + 1)];
      const bl = gray[(y + 1) * width + (x - 1)];
      const bc = gray[(y + 1) * width + x];
      const br = gray[(y + 1) * width + (x + 1)];

      const gx = -tl - 2 * ml - bl + tr + 2 * mr + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;

      edges[y * width + x] = Math.min(1, Math.sqrt(gx * gx + gy * gy));
    }
  }
  return edges;
}

/**
 * Extract a clean silhouette mask (1 = inside sprite, 0 = transparent bg).
 * Uses alpha channel + mild blur for smooth edges.
 */
export function extractSilhouette(data: ImageData, threshold = 0.1): Float32Array {
  const n = data.width * data.height;
  const mask = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    mask[i] = data.data[i * 4 + 3] / 255 > threshold ? 1 : 0;
  }
  return mask;
}

/**
 * Dominant color analysis — extract top-K colors using a simplified
 * 3-level octree quantisation (fast, runs in the browser).
 */
export interface ColorSample {
  r: number;
  g: number;
  b: number;
  weight: number; // 0–1 relative frequency
}

export function extractDominantColors(data: ImageData, k = 6): ColorSample[] {
  const { data: px } = data;
  // Bucket colors into 8×8×8 grid (3 bits per channel)
  const buckets = new Map<number, { r: number; g: number; b: number; count: number }>();

  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 30) continue; // skip near-transparent
    const r = px[i] >> 5; // 0-7
    const g = px[i + 1] >> 5;
    const b = px[i + 2] >> 5;
    const key = r * 64 + g * 8 + b;
    const existing = buckets.get(key);
    if (existing) {
      existing.r += px[i];
      existing.g += px[i + 1];
      existing.b += px[i + 2];
      existing.count++;
    } else {
      buckets.set(key, { r: px[i], g: px[i + 1], b: px[i + 2], count: 1 });
    }
  }

  // Sort by count descending, take top-k
  const sorted = [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, k);

  const total = sorted.reduce((s, b) => s + b.count, 0) || 1;

  return sorted.map((b) => ({
    r: Math.round(b.r / b.count),
    g: Math.round(b.g / b.count),
    b: Math.round(b.b / b.count),
    weight: b.count / total,
  }));
}

/** Compute average hue shift between two palettes (in degrees, –180 to 180). */
export function computeHueShift(palette1: ColorSample[], palette2: ColorSample[]): number {
  const avgHue = (p: ColorSample[]) => {
    let sinSum = 0;
    let cosSum = 0;
    for (const c of p) {
      const h = rgbToHue(c.r, c.g, c.b) * (Math.PI / 180);
      sinSum += Math.sin(h) * c.weight;
      cosSum += Math.cos(h) * c.weight;
    }
    return Math.atan2(sinSum, cosSum) * (180 / Math.PI);
  };
  return avgHue(palette2) - avgHue(palette1);
}

function rgbToHue(r: number, g: number, b: number): number {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  if (d === 0) return 0;
  let h = 0;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return ((h * 60) + 360) % 360;
}
