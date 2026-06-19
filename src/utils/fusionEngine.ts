/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Who's That Fusion? — Fusion Pipeline
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 *  Primary path — Neural Style Transfer (TensorFlow.js):
 *  ┌─────────────────────────────────────────────────────┐
 *  │  pass 1: stylize(A→content, B→style)                │
 *  │          → A's SHAPE with B's COLOURS & TEXTURE     │
 *  │  pass 2: stylize(B→content, A→style)                │
 *  │          → B's SHAPE with A's COLOURS & TEXTURE     │
 *  │  splice: top 50% of pass1 + bottom 50% of pass2    │
 *  │          = one creature, neither A nor B alone      │
 *  └─────────────────────────────────────────────────────┘
 *
 *  Fallback path (TF.js unavailable / OOM):
 *    Horizontal head/body splice with colour harmonisation
 *    (no neural component but still produces one body)
 */

import { loadSpriteAsImageData, imageDataToDataURL, FUSION_SIZE } from './imageProcessing';
import { extractDominantColors }                                    from './edgeDetection';
import { rgbToHsl, hslToRgb }                                      from './colorAnalysis';
import { neuralStylize }                                           from './neuralFusion';

// ─── Shared maths ─────────────────────────────────────────

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/** Vertical centre of mass of non-transparent pixels (y-coordinate). */
function verticalCOM(data: ImageData): number {
  let mass = 0, weightedY = 0;
  const { width, height } = data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data.data[(y * width + x) * 4 + 3] / 255;
      mass += a;
      weightedY += y * a;
    }
  }
  return mass > 0 ? weightedY / mass : height / 2;
}

function contentBounds(data: ImageData) {
  const { width, height } = data;
  let top = height, bottom = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data.data[(y * width + x) * 4 + 3] > 15) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  return { top, bottom };
}

// ─── Neural fusion path ────────────────────────────────────

/**
 * Two-pass neural style transfer → horizontal splice.
 * Each pass (~2–4 s on GPU via WebGL) produces a stylised sprite.
 * The splice combines them into a single-bodied creature.
 */
async function neuralFusion(d1: ImageData, d2: ImageData): Promise<ImageData> {
  const SIZE = d1.width;

  // Pass 1: Sprite-A body, coloured/textured like Sprite-B
  // Pass 2: Sprite-B body, coloured/textured like Sprite-A
  // (sequential — WebGL context handles one inference at a time cleanly)
  const styled1 = await neuralStylize(d1, d2, 0.78); // A shaped like B
  const styled2 = await neuralStylize(d2, d1, 0.78); // B shaped like A

  // Determine horizontal split at the average centre-of-mass
  const com1 = verticalCOM(d1);
  const com2 = verticalCOM(d2);
  const b1   = contentBounds(d1);
  const splitY = Math.max(
    b1.top + (b1.bottom - b1.top) * 0.3,
    Math.min(b1.top + (b1.bottom - b1.top) * 0.7, (com1 + com2) / 2),
  );
  const blendHalf = Math.round(SIZE * 0.13); // ~33 px blend zone

  // Splice: top of styled1 + bottom of styled2, cosine-smooth seam
  const out = new ImageData(new Uint8ClampedArray(SIZE * SIZE * 4), SIZE, SIZE);

  for (let y = 0; y < SIZE; y++) {
    const w1 = smoothstep((splitY + blendHalf - y) / (2 * blendHalf));
    const w2 = 1 - w1;

    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;

      // Alpha: blend from the two original sprites' alphas (already on styled images)
      const a1 = styled1.data[i + 3];
      const a2 = styled2.data[i + 3];
      const aOut = Math.round(a1 * w1 + a2 * w2);

      if (aOut < 5) continue; // skip fully transparent pixels

      out.data[i]     = Math.round(styled1.data[i]     * w1 + styled2.data[i]     * w2);
      out.data[i + 1] = Math.round(styled1.data[i + 1] * w1 + styled2.data[i + 1] * w2);
      out.data[i + 2] = Math.round(styled1.data[i + 2] * w1 + styled2.data[i + 2] * w2);
      out.data[i + 3] = aOut;
    }
  }

  // Subtle scanline pass for retro aesthetic
  for (let y = 1; y < SIZE; y += 2) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      if (out.data[i + 3] < 10) continue;
      out.data[i]     = Math.round(out.data[i]     * 0.93);
      out.data[i + 1] = Math.round(out.data[i + 1] * 0.93);
      out.data[i + 2] = Math.round(out.data[i + 2] * 0.93);
    }
  }

  return out;
}

// ─── Canvas fallback path ──────────────────────────────────

function bandMeanColor(data: ImageData, yStart: number, yEnd: number): [number, number, number] {
  let r = 0, g = 0, b = 0, count = 0;
  const { width } = data;
  const ys = Math.max(0, Math.round(yStart));
  const ye = Math.min(data.height - 1, Math.round(yEnd));
  for (let y = ys; y <= ye; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data.data[i + 3] > 15) {
        r += data.data[i]; g += data.data[i + 1]; b += data.data[i + 2]; count++;
      }
    }
  }
  return count === 0 ? [128, 128, 128] : [r / count, g / count, b / count];
}

function shiftPixelHue(
  r: number, g: number, b: number, targetH: number, strength: number,
): [number, number, number] {
  const [h, s, l] = rgbToHsl(r, g, b);
  if (s < 0.05) return [r, g, b];
  let delta = targetH - h;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return hslToRgb((h + delta * strength + 360) % 360, s, l);
}

/** Non-neural fallback: horizontal splice with hue harmonisation. */
function canvasFusion(d1: ImageData, d2: ImageData): ImageData {
  const SIZE = d1.width;
  const com1 = verticalCOM(d1);
  const com2 = verticalCOM(d2);
  const b1 = contentBounds(d1);
  const splitY = Math.max(
    b1.top + (b1.bottom - b1.top) * 0.3,
    Math.min(b1.top + (b1.bottom - b1.top) * 0.7, (com1 + com2) / 2),
  );
  const blendHalf = Math.round(SIZE * 0.14);

  const mean1 = bandMeanColor(d1, splitY - blendHalf, splitY + blendHalf);
  const mean2 = bandMeanColor(d2, splitY - blendHalf, splitY + blendHalf);
  const [h1] = rgbToHsl(...mean1);
  const [h2] = rgbToHsl(...mean2);

  const out = new ImageData(new Uint8ClampedArray(SIZE * SIZE * 4), SIZE, SIZE);

  for (let y = 0; y < SIZE; y++) {
    const w1 = smoothstep((splitY + blendHalf - y) / (2 * blendHalf));
    const w2 = 1 - w1;
    const seamDist = Math.abs(y - splitY) / blendHalf;
    const harmonyStr = Math.max(0, 1 - seamDist) * 0.4;

    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      const a1 = d1.data[i + 3], a2 = d2.data[i + 3];
      let rOut = 0, gOut = 0, bOut = 0, aOut = 0;

      if (w1 >= 0.98) {
        if (a1 > 10) { rOut = d1.data[i]; gOut = d1.data[i+1]; bOut = d1.data[i+2]; aOut = a1; }
      } else if (w2 >= 0.98) {
        if (a2 > 10) { rOut = d2.data[i]; gOut = d2.data[i+1]; bOut = d2.data[i+2]; aOut = a2; }
      } else {
        if (a1 > 10 && a2 > 10) {
          rOut = Math.round(d1.data[i] * w1 + d2.data[i] * w2);
          gOut = Math.round(d1.data[i+1] * w1 + d2.data[i+1] * w2);
          bOut = Math.round(d1.data[i+2] * w1 + d2.data[i+2] * w2);
          aOut = Math.max(a1, a2);
        } else if (a1 > 10 && w1 > 0.15) {
          rOut = d1.data[i]; gOut = d1.data[i+1]; bOut = d1.data[i+2];
          aOut = Math.round(a1 * smoothstep(w1));
        } else if (a2 > 10 && w2 > 0.15) {
          rOut = d2.data[i]; gOut = d2.data[i+1]; bOut = d2.data[i+2];
          aOut = Math.round(a2 * smoothstep(w2));
        }
      }

      if (aOut > 10 && harmonyStr > 0.01) {
        const [nr, ng, nb] = shiftPixelHue(rOut, gOut, bOut, w1 >= 0.5 ? h2 : h1, harmonyStr * (w1 >= 0.5 ? w2 : w1) * 2);
        rOut = nr; gOut = ng; bOut = nb;
      }

      out.data[i] = rOut; out.data[i+1] = gOut; out.data[i+2] = bOut; out.data[i+3] = aOut;
    }
  }
  return out;
}

// ─── Public interface ──────────────────────────────────────

export interface FusionResult {
  dataUrl: string;
  hue1: number;
  hue2: number;
}

/**
 * Generate a Pokémon fusion.
 * Attempts neural style transfer first; falls back to canvas splice on failure.
 */
export async function generateFusion(url1: string, url2: string): Promise<FusionResult> {
  const SIZE = FUSION_SIZE;

  const [d1, d2] = await Promise.all([
    loadSpriteAsImageData(url1, SIZE),
    loadSpriteAsImageData(url2, SIZE),
  ]);

  let fused: ImageData;
  try {
    fused = await neuralFusion(d1, d2);
  } catch (err) {
    console.warn('[Fusion] Neural path failed, using canvas fallback:', err);
    fused = canvasFusion(d1, d2);
  }

  // Compute dominant hues for colour display in the UI
  const p1 = extractDominantColors(d1, 4);
  const p2 = extractDominantColors(d2, 4);
  const avgHue = (p: typeof p1) => {
    let sinSum = 0, cosSum = 0;
    for (const c of p) {
      const [h] = rgbToHsl(c.r, c.g, c.b);
      sinSum += Math.sin((h * Math.PI) / 180) * c.weight;
      cosSum += Math.cos((h * Math.PI) / 180) * c.weight;
    }
    return ((Math.atan2(sinSum, cosSum) * 180) / Math.PI + 360) % 360;
  };

  return { dataUrl: imageDataToDataURL(fused), hue1: avgHue(p1), hue2: avgHue(p2) };
}
