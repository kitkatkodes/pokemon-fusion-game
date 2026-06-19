/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  WHO'S THAT FUSION? — Computer Vision Fusion Pipeline
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Multi-stage fusion algorithm:
 *
 *  1. Load & normalise both sprites to 256×256 RGBA
 *  2. Extract silhouette masks (alpha channel)
 *  3. Compute Sobel edge maps for structural guidance
 *  4. Build a spatial blend mask:
 *     - Diagonal gradient provides overall split direction
 *     - Alpha masks force transparent regions to use the
 *       other sprite (avoids floating features on blank bg)
 *     - Gaussian blur (σ≈20 px) produces a smooth seam
 *  5. Laplacian Pyramid Blending (4 levels):
 *     - Each channel (R,G,B,A) is decomposed into coarse +
 *       fine detail bands; bands are blended independently
 *       at different scales → avoids ghosting / halos
 *  6. Color grading:
 *     - Compute dominant hue of each sprite
 *     - Shift result hue by 50% of the difference
 *     - Boost saturation slightly for a vivid "fused" look
 *  7. Add subtle scanline texture for the gaming aesthetic
 *
 *  All processing runs in the browser using Canvas 2D API
 *  and typed arrays.  No server, no WASM, no external deps.
 */

import {
  FUSION_SIZE,
  loadSpriteAsImageData,
  imageDataToDataURL,
  gaussianBlurGray,
  downsample2x,
  upsample2x,
} from './imageProcessing';
import { sobelEdges, extractDominantColors, computeHueShift } from './edgeDetection';
import { applyHueRotation, avgLightness, transferLuminance } from './colorAnalysis';

// ─── Types ────────────────────────────────────────────────

interface PyramidLevel {
  data: Float32Array;
  width: number;
  height: number;
}

// ─── Laplacian Pyramid helpers ────────────────────────────

function buildGaussianPyramid(input: Float32Array, w: number, h: number, levels: number): PyramidLevel[] {
  const pyramid: PyramidLevel[] = [{ data: new Float32Array(input), width: w, height: h }];
  for (let i = 1; i < levels; i++) {
    const prev = pyramid[i - 1];
    const blurred = gaussianBlurGray(prev.data, prev.width, prev.height, 1.5);
    const down = downsample2x(blurred, prev.width, prev.height);
    pyramid.push({ data: down, width: Math.floor(prev.width / 2), height: Math.floor(prev.height / 2) });
  }
  return pyramid;
}

function buildLaplacianPyramid(gauss: PyramidLevel[]): PyramidLevel[] {
  const lap: PyramidLevel[] = [];
  for (let i = 0; i < gauss.length - 1; i++) {
    const cur = gauss[i];
    const next = gauss[i + 1];
    const up = upsample2x(next.data, next.width, next.height);
    // Crop/pad to match current level size
    const diff = new Float32Array(cur.width * cur.height);
    for (let j = 0; j < diff.length; j++) diff[j] = cur.data[j] - (up[j] ?? 0);
    lap.push({ data: diff, width: cur.width, height: cur.height });
  }
  lap.push(gauss[gauss.length - 1]); // coarsest level is kept as-is
  return lap;
}

function blendPyramids(
  lap1: PyramidLevel[],
  lap2: PyramidLevel[],
  maskPyramid: PyramidLevel[],
): PyramidLevel[] {
  return lap1.map((l1, i) => {
    const l2 = lap2[i];
    const m = maskPyramid[i];
    const blended = new Float32Array(l1.data.length);
    for (let j = 0; j < blended.length; j++) {
      const w = m.data[j] ?? 0.5;
      blended[j] = w * l1.data[j] + (1 - w) * l2.data[j];
    }
    return { data: blended, width: l1.width, height: l1.height };
  });
}

function reconstructFromLaplacian(lap: PyramidLevel[]): Float32Array {
  let current = lap[lap.length - 1].data;
  let cw = lap[lap.length - 1].width;
  let ch = lap[lap.length - 1].height;

  for (let i = lap.length - 2; i >= 0; i--) {
    const up = upsample2x(current, cw, ch);
    const level = lap[i];
    current = new Float32Array(level.data.length);
    for (let j = 0; j < current.length; j++) {
      current[j] = (up[j] ?? 0) + level.data[j];
    }
    cw = level.width;
    ch = level.height;
  }
  return current;
}

// ─── Blend mask construction ──────────────────────────────

/**
 * Build a per-pixel blend weight map (Float32Array, 0=use sprite2, 1=use sprite1).
 *
 * Strategy:
 *   - Where only one sprite has alpha → use that sprite exclusively
 *   - Where both are present → use a diagonal-gradient split biased by
 *     relative edge strength (strong edges of A pull the mask toward A)
 *   - Gaussian blur the result for a smooth seam
 */
function buildBlendMask(
  data1: ImageData,
  data2: ImageData,
  edges1: Float32Array,
  edges2: Float32Array,
  size: number,
): Float32Array {
  const mask = new Float32Array(size * size);

  for (let i = 0; i < size * size; i++) {
    const a1 = data1.data[i * 4 + 3] / 255;
    const a2 = data2.data[i * 4 + 3] / 255;
    const e1 = edges1[i];
    const e2 = edges2[i];

    const x = i % size;
    const y = Math.floor(i / size);

    // Diagonal gradient 0→1 (top-left → bottom-right)
    const diag = (x + y) / (2 * (size - 1));

    if (a1 > 0.15 && a2 < 0.05) {
      // Only sprite1 has content
      mask[i] = 1.0;
    } else if (a2 > 0.15 && a1 < 0.05) {
      // Only sprite2 has content
      mask[i] = 0.0;
    } else if (a1 > 0.15 && a2 > 0.15) {
      // Both present: blend based on diagonal + edge competition
      const edgeBias = e1 / (e1 + e2 + 1e-6) - 0.5; // –0.5 to +0.5
      mask[i] = Math.min(1, Math.max(0, (1 - diag) + edgeBias * 0.3));
    } else {
      mask[i] = 1 - diag; // transparent background — follow diagonal
    }
  }

  // Smooth the seam aggressively for a natural-looking fusion
  return gaussianBlurGray(mask, size, size, 18);
}

// ─── Per-channel pyramid blend ────────────────────────────

function fuseChannel(
  ch1: Float32Array,
  ch2: Float32Array,
  maskSmooth: Float32Array,
  size: number,
  levels = 4,
): Float32Array {
  const gauss1 = buildGaussianPyramid(ch1, size, size, levels);
  const gauss2 = buildGaussianPyramid(ch2, size, size, levels);
  const gaussMask = buildGaussianPyramid(maskSmooth, size, size, levels);

  const lap1 = buildLaplacianPyramid(gauss1);
  const lap2 = buildLaplacianPyramid(gauss2);

  const blended = blendPyramids(lap1, lap2, gaussMask);
  return reconstructFromLaplacian(blended);
}

// ─── Scanline texture ─────────────────────────────────────

function applyScanlines(data: ImageData, strength = 0.06): ImageData {
  const out = new ImageData(new Uint8ClampedArray(data.data), data.width, data.height);
  for (let y = 0; y < data.height; y++) {
    if (y % 2 === 0) continue; // darken every other row
    for (let x = 0; x < data.width; x++) {
      const i = (y * data.width + x) * 4;
      if (out.data[i + 3] < 10) continue;
      out.data[i]     = Math.round(out.data[i]     * (1 - strength));
      out.data[i + 1] = Math.round(out.data[i + 1] * (1 - strength));
      out.data[i + 2] = Math.round(out.data[i + 2] * (1 - strength));
    }
  }
  return out;
}

// ─── Public API ───────────────────────────────────────────

export interface FusionResult {
  dataUrl: string;
  /** Dominant hue of each parent sprite (degrees) for display */
  hue1: number;
  hue2: number;
}

/**
 * Generate a fused Pokémon image from two sprite URLs.
 *
 * Uses a full Laplacian pyramid blend (4 levels) with an edge-guided
 * diagonal mask, followed by colour grading to merge both palettes.
 */
export async function generateFusion(
  url1: string,
  url2: string,
): Promise<FusionResult> {
  const SIZE = FUSION_SIZE;
  const LEVELS = 4;

  // ── 1. Load sprites ──────────────────────────────────────
  const [raw1, raw2] = await Promise.all([
    loadSpriteAsImageData(url1, SIZE),
    loadSpriteAsImageData(url2, SIZE),
  ]);

  // ── 2. Edge maps ─────────────────────────────────────────
  const edges1 = sobelEdges(raw1);
  const edges2 = sobelEdges(raw2);

  // ── 3. Blend mask ────────────────────────────────────────
  const mask = buildBlendMask(raw1, raw2, edges1, edges2, SIZE);

  // ── 4. Extract RGBA channels as Float32Arrays ─────────────
  const extractChannel = (data: ImageData, ch: number) => {
    const n = SIZE * SIZE;
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) out[i] = data.data[i * 4 + ch] / 255;
    return out;
  };

  const [r1, g1, b1, a1] = [0, 1, 2, 3].map((ch) => extractChannel(raw1, ch));
  const [r2, g2, b2, a2] = [0, 1, 2, 3].map((ch) => extractChannel(raw2, ch));

  // ── 5. Laplacian pyramid blend per channel ────────────────
  const rOut = fuseChannel(r1, r2, mask, SIZE, LEVELS);
  const gOut = fuseChannel(g1, g2, mask, SIZE, LEVELS);
  const bOut = fuseChannel(b1, b2, mask, SIZE, LEVELS);
  const aOut = fuseChannel(a1, a2, mask, SIZE, LEVELS);

  // ── 6. Pack result into ImageData ────────────────────────
  const resultData = new Uint8ClampedArray(SIZE * SIZE * 4);
  for (let i = 0; i < SIZE * SIZE; i++) {
    resultData[i * 4]     = Math.round(Math.min(1, Math.max(0, rOut[i])) * 255);
    resultData[i * 4 + 1] = Math.round(Math.min(1, Math.max(0, gOut[i])) * 255);
    resultData[i * 4 + 2] = Math.round(Math.min(1, Math.max(0, bOut[i])) * 255);
    resultData[i * 4 + 3] = Math.round(Math.min(1, Math.max(0, aOut[i])) * 255);
  }
  let result = new ImageData(resultData, SIZE, SIZE);

  // ── 7. Color grading ─────────────────────────────────────
  const palette1 = extractDominantColors(raw1, 8);
  const palette2 = extractDominantColors(raw2, 8);
  const hueShift = computeHueShift(palette1, palette2);

  // Shift hue halfway between both sprites and boost saturation
  result = applyHueRotation(result, hueShift * 0.5, 1.15);

  // Equalise lightness slightly toward the average of both sprites
  const targetL = (avgLightness(raw1) + avgLightness(raw2)) / 2;
  result = transferLuminance(result, targetL, 0.2);

  // ── 8. Subtle scanline overlay for gaming aesthetic ────────
  result = applyScanlines(result, 0.05);

  // ── 9. Export ────────────────────────────────────────────
  const avgHue = (palette: ReturnType<typeof extractDominantColors>) => {
    let sinS = 0, cosS = 0;
    for (const c of palette) {
      const h = Math.atan2(
        c.r / 255 - c.g / 255,
        c.b / 255 - c.r / 255,
      );
      sinS += Math.sin(h) * c.weight;
      cosS += Math.cos(h) * c.weight;
    }
    return ((Math.atan2(sinS, cosS) * 180) / Math.PI + 360) % 360;
  };

  return {
    dataUrl: imageDataToDataURL(result),
    hue1: avgHue(palette1),
    hue2: avgHue(palette2),
  };
}

/** Return just the data URL (convenience wrapper). */
export async function generateFusionDataUrl(url1: string, url2: string): Promise<string> {
  const result = await generateFusion(url1, url2);
  return result.dataUrl;
}
