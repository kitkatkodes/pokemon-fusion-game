/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Neural Style Transfer — browser-only via TensorFlow.js
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 *  Model: arbitrary-image-stylization-v1-256
 *  (Johnson et al. fast style transfer, conditioned on any style image)
 *
 *  Downloads ~8 MB of model weights from Google's CDN on first use,
 *  then the browser caches them — subsequent visits are instant.
 *
 *  Backend priority: WebGL (GPU) → WASM → CPU
 */

import * as tf from '@tensorflow/tfjs';
import { load } from '@tensorflow-models/arbitrary-image-stylization';

// ─── Singleton model handle ────────────────────────────────

type StyleTransferModel = Awaited<ReturnType<typeof load>>;
let _modelPromise: Promise<StyleTransferModel> | null = null;
let _backendReady = false;

async function ensureBackend() {
  if (_backendReady) return;
  // Try fast backends first
  for (const backend of ['webgl', 'wasm', 'cpu'] as const) {
    try {
      const ok = await tf.setBackend(backend);
      if (ok) { await tf.ready(); _backendReady = true; return; }
    } catch { /* try next */ }
  }
  throw new Error('No TensorFlow.js backend available');
}

/**
 * Load (or return the already-loaded) style transfer model.
 * Safe to call multiple times — downloads only once per session.
 */
export function loadNeuralModel(): Promise<StyleTransferModel> {
  if (!_modelPromise) {
    _modelPromise = (async () => {
      await ensureBackend();
      console.info('[Neural Fusion] Downloading style-transfer model (~8 MB)…');
      const model = await load();
      console.info('[Neural Fusion] Model ready. Backend:', tf.getBackend());
      return model;
    })();
  }
  return _modelPromise;
}

/** Call this as early as possible (e.g. App mount) so the model is warm by game start. */
export const preloadNeuralModel = loadNeuralModel;

// ─── Canvas helpers ────────────────────────────────────────

/**
 * Render an RGBA ImageData onto a canvas with a neutral grey background.
 * Necessary because the style transfer model expects fully opaque inputs —
 * transparent pixels would contribute black (0,0,0) to the computation.
 */
function toOpaqueCanvas(data: ImageData): HTMLCanvasElement {
  const { width, height } = data;
  const cv = document.createElement('canvas');
  cv.width = width;
  cv.height = height;
  const ctx = cv.getContext('2d')!;

  // Neutral mid-grey background (avoids biasing colours toward black or white)
  ctx.fillStyle = '#a0a0a0';
  ctx.fillRect(0, 0, width, height);

  // Composite the sprite over it
  const tmp = document.createElement('canvas');
  tmp.width = width;
  tmp.height = height;
  tmp.getContext('2d')!.putImageData(data, 0, 0);
  ctx.drawImage(tmp, 0, 0);

  return cv;
}

/**
 * Convert the model's output tensor (float32 [H,W,3] or [1,H,W,3], values 0–1)
 * back to an ImageData, restoring the original sprite's alpha channel.
 */
async function tensorToImageData(
  tensor: tf.Tensor,
  originalAlpha: Uint8ClampedArray,
  width: number,
  height: number,
): Promise<ImageData> {
  // Squeeze batch dim if present
  const t3 = tensor.rank === 4
    ? (tensor as tf.Tensor4D).squeeze([0]) as tf.Tensor3D
    : tensor as tf.Tensor3D;

  const floats = await t3.data() as Float32Array;
  if (t3 !== tensor) t3.dispose();

  const out = new ImageData(width, height);
  const n = width * height;
  for (let i = 0; i < n; i++) {
    out.data[i * 4]     = Math.min(255, Math.round(floats[i * 3]     * 255));
    out.data[i * 4 + 1] = Math.min(255, Math.round(floats[i * 3 + 1] * 255));
    out.data[i * 4 + 2] = Math.min(255, Math.round(floats[i * 3 + 2] * 255));
    // Restore the original sprite's alpha so the background stays transparent
    out.data[i * 4 + 3] = originalAlpha[i];
  }
  return out;
}

// ─── Public API ────────────────────────────────────────────

/**
 * Run neural style transfer in the browser.
 *
 * @param contentData  Sprite that determines the **shape / structure**
 * @param styleData    Sprite that determines the **colour palette & texture**
 * @param styleRatio   Blending strength (0 = pure content, 1 = full style). Default 0.8.
 * @returns            ImageData with `contentData`'s silhouette coloured like `styleData`
 */
export async function neuralStylize(
  contentData: ImageData,
  styleData: ImageData,
  styleRatio = 0.8,
): Promise<ImageData> {
  const model = await loadNeuralModel();
  const { width, height } = contentData;

  // Extract original alpha channel (to restore after transfer)
  const origAlpha = new Uint8ClampedArray(width * height);
  for (let i = 0; i < width * height; i++) {
    origAlpha[i] = contentData.data[i * 4 + 3];
  }

  const contentCanvas = toOpaqueCanvas(contentData);
  const styleCanvas   = toOpaqueCanvas(styleData);

  // Run the neural network (WebGL-accelerated)
  const resultTensor = await model.stylize(contentCanvas, styleCanvas, styleRatio);

  const imageData = await tensorToImageData(resultTensor, origAlpha, width, height);
  resultTensor.dispose();

  return imageData;
}
