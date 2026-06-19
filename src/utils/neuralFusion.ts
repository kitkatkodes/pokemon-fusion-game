/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Neural Style Transfer — TensorFlow.js, browser-only
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 *  Model: Google Magenta arbitrary-image-stylization-v1-256
 *  Weights loaded at runtime from Google's public CDN (~8 MB total).
 *  No npm package needed — only @tensorflow/tfjs.
 *
 *  Architecture (two sub-networks):
 *   1. Style Predictor — encodes style image → 100-D bottleneck vector
 *   2. Style Transformer — maps content image + bottleneck → stylised image
 *
 *  Backend: WebGL (GPU) → WASM → CPU (auto-detected)
 */

import * as tf from '@tensorflow/tfjs';

// ─── Model URLs ────────────────────────────────────────────
// Publicly hosted by the Magenta team with CORS enabled.
const PREDICTOR_URL =
  'https://storage.googleapis.com/magentadata/js/checkpoints/style/arbitrary/predictor_js/model.json';
const TRANSFORMER_URL =
  'https://storage.googleapis.com/magentadata/js/checkpoints/style/arbitrary/transferer_js/model.json';

// ─── Singleton ─────────────────────────────────────────────

interface StyleModels {
  styleNet: tf.GraphModel;
  transformNet: tf.GraphModel;
}

let _modelsPromise: Promise<StyleModels> | null = null;
let _backendInit = false;

async function initBackend() {
  if (_backendInit) return;
  for (const b of ['webgl', 'wasm', 'cpu'] as const) {
    try {
      const ok = await tf.setBackend(b);
      if (ok) { await tf.ready(); _backendInit = true; return; }
    } catch { /* try next */ }
  }
}

/**
 * Load both sub-networks (lazy singleton — runs once, then returns cached promise).
 * Downloads ~8 MB from Google CDN; browser caches weights after first visit.
 */
export function loadNeuralModels(): Promise<StyleModels> {
  if (!_modelsPromise) {
    _modelsPromise = (async () => {
      await initBackend();
      console.info('[Neural Fusion] Loading Magenta style-transfer models…');
      const [styleNet, transformNet] = await Promise.all([
        tf.loadGraphModel(PREDICTOR_URL),
        tf.loadGraphModel(TRANSFORMER_URL),
      ]);
      console.info('[Neural Fusion] Models ready. Backend:', tf.getBackend());
      return { styleNet, transformNet };
    })();
  }
  return _modelsPromise;
}

/** Call this at app startup so the model is warm before the first game round. */
export const preloadNeuralModel = loadNeuralModels;

// ─── Image helpers ─────────────────────────────────────────

/**
 * Composite an RGBA sprite onto a grey background (producing opaque output).
 * The model expects fully opaque images — transparent areas must be filled.
 */
function makeOpaque(data: ImageData): ImageData {
  const n = data.width * data.height;
  const out = new ImageData(data.width, data.height);
  const BG = 160; // neutral grey
  for (let i = 0; i < n; i++) {
    const a = data.data[i * 4 + 3] / 255;
    out.data[i * 4]     = Math.round(data.data[i * 4]     * a + BG * (1 - a));
    out.data[i * 4 + 1] = Math.round(data.data[i * 4 + 1] * a + BG * (1 - a));
    out.data[i * 4 + 2] = Math.round(data.data[i * 4 + 2] * a + BG * (1 - a));
    out.data[i * 4 + 3] = 255;
  }
  return out;
}

/** RGBA ImageData → float32 tensor [1, H, W, 3], values normalised to [0, 1]. */
function toTensor(data: ImageData): tf.Tensor4D {
  const { width, height } = data;
  const floats = new Float32Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    floats[i * 3]     = data.data[i * 4]     / 255;
    floats[i * 3 + 1] = data.data[i * 4 + 1] / 255;
    floats[i * 3 + 2] = data.data[i * 4 + 2] / 255;
  }
  return tf.tensor4d(floats, [1, height, width, 3]);
}

/** Float32 tensor [1,H,W,3] (values 0–1) → RGBA ImageData with restored alpha. */
async function toImageData(
  tensor: tf.Tensor,
  origAlpha: Uint8ClampedArray,
  width: number,
  height: number,
): Promise<ImageData> {
  // Squeeze batch dimension if present
  const t3 = tensor.rank === 4
    ? (tensor as tf.Tensor4D).squeeze([0]) as tf.Tensor3D
    : tensor as tf.Tensor3D;

  const floats = await t3.data() as Float32Array;
  if (t3 !== tensor) t3.dispose();

  const out = new ImageData(width, height);
  for (let i = 0; i < width * height; i++) {
    out.data[i * 4]     = Math.min(255, Math.round(floats[i * 3]     * 255));
    out.data[i * 4 + 1] = Math.min(255, Math.round(floats[i * 3 + 1] * 255));
    out.data[i * 4 + 2] = Math.min(255, Math.round(floats[i * 3 + 2] * 255));
    out.data[i * 4 + 3] = origAlpha[i]; // restore transparent background
  }
  return out;
}

// ─── Public API ────────────────────────────────────────────

/**
 * Run neural style transfer in the browser via TensorFlow.js.
 *
 * @param contentData  Sprite that supplies the **shape / structure**
 * @param styleData    Sprite that supplies the **colour palette & texture**
 * @returns            ImageData: contentData's silhouette rendered in styleData's aesthetic
 *
 * Timing: ~2–5 s on GPU (WebGL), ~15–30 s on CPU fallback.
 */
export async function neuralStylize(
  contentData: ImageData,
  styleData: ImageData,
): Promise<ImageData> {
  const { styleNet, transformNet } = await loadNeuralModels();
  const { width, height } = contentData;

  // Save original alpha before compositing on background
  const origAlpha = new Uint8ClampedArray(width * height);
  for (let i = 0; i < width * height; i++) origAlpha[i] = contentData.data[i * 4 + 3];

  // Build opaque versions for the neural network
  const contentOpaque = makeOpaque(contentData);
  const styleOpaque   = makeOpaque(styleData);

  let styleBottleneck: tf.Tensor | null = null;
  let stylized: tf.Tensor | null = null;

  try {
    const contentTensor = toTensor(contentOpaque);

    // Style predictor expects 256×256 input
    const styleTensor = toTensor(styleOpaque);
    const styleResized = tf.image.resizeBilinear(
      styleTensor as tf.Tensor4D,
      [256, 256],
    );
    styleTensor.dispose();

    // 1. Encode style image → bottleneck (100-D)
    styleBottleneck = styleNet.predict(styleResized) as tf.Tensor;
    styleResized.dispose();

    // 2. Decode: content + bottleneck → stylised image
    stylized = transformNet.predict([contentTensor, styleBottleneck]) as tf.Tensor;
    contentTensor.dispose();

    const result = await toImageData(stylized, origAlpha, width, height);
    return result;
  } finally {
    styleBottleneck?.dispose();
    stylized?.dispose();
  }
}
