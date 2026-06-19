/** Core canvas / image-data utilities used by the CV pipeline. */

export const FUSION_SIZE = 256;

/** Load a remote image as an ImageData object (fetches via blob to avoid canvas taint). */
export async function loadSpriteAsImageData(url: string, size = FUSION_SIZE): Promise<ImageData> {
  const response = await fetch(url, { mode: 'cors' });
  if (!response.ok) throw new Error(`Failed to fetch sprite: ${url}`);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  // Scale to fit, centred, preserving aspect ratio
  const scale = Math.min(size / bitmap.width, size / bitmap.height) * 0.9;
  const dx = (size - bitmap.width * scale) / 2;
  const dy = (size - bitmap.height * scale) / 2;
  ctx.drawImage(bitmap, dx, dy, bitmap.width * scale, bitmap.height * scale);

  return ctx.getImageData(0, 0, size, size);
}

/** Convert ImageData back to a PNG data URL via an offscreen canvas. */
export function imageDataToDataURL(data: ImageData): string {
  const canvas = document.createElement('canvas');
  canvas.width = data.width;
  canvas.height = data.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL('image/png');
}

/** Clone an ImageData object (deep copy of pixel buffer). */
export function cloneImageData(src: ImageData): ImageData {
  return new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
}

/** Extract per-pixel alpha channel as Float32Array (values 0-1). */
export function extractAlpha(data: ImageData): Float32Array {
  const n = data.width * data.height;
  const alpha = new Float32Array(n);
  for (let i = 0; i < n; i++) alpha[i] = data.data[i * 4 + 3] / 255;
  return alpha;
}

/** Extract grayscale luminance as Float32Array (values 0-1, weighted RGB). */
export function toGrayscale(data: ImageData): Float32Array {
  const n = data.width * data.height;
  const gray = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    gray[i] = (data.data[o] * 0.299 + data.data[o + 1] * 0.587 + data.data[o + 2] * 0.114) / 255;
  }
  return gray;
}

/** Apply a Float32Array (0-1) grayscale map back to ImageData alpha. */
export function applyAlphaMask(data: ImageData, mask: Float32Array): ImageData {
  const out = cloneImageData(data);
  for (let i = 0; i < mask.length; i++) {
    out.data[i * 4 + 3] = Math.round(mask[i] * 255);
  }
  return out;
}

/** 1-D Gaussian kernel of given sigma, length = ceil(6*sigma)|1 */
export function makeGaussianKernel(sigma: number): Float32Array {
  const r = Math.ceil(3 * sigma);
  const size = 2 * r + 1;
  const k = new Float32Array(size);
  let sum = 0;
  for (let i = 0; i < size; i++) {
    const x = i - r;
    k[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += k[i];
  }
  for (let i = 0; i < size; i++) k[i] /= sum;
  return k;
}

/** Separable Gaussian blur on a Float32Array (single channel). */
export function gaussianBlurGray(
  input: Float32Array,
  width: number,
  height: number,
  sigma: number,
): Float32Array {
  const kernel = makeGaussianKernel(sigma);
  const r = (kernel.length - 1) / 2;
  const tmp = new Float32Array(width * height);
  const out = new Float32Array(width * height);

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val = 0;
      let wsum = 0;
      for (let k = -r; k <= r; k++) {
        const xi = Math.min(Math.max(x + k, 0), width - 1);
        val += input[y * width + xi] * kernel[k + r];
        wsum += kernel[k + r];
      }
      tmp[y * width + x] = val / wsum;
    }
  }
  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val = 0;
      let wsum = 0;
      for (let k = -r; k <= r; k++) {
        const yi = Math.min(Math.max(y + k, 0), height - 1);
        val += tmp[yi * width + x] * kernel[k + r];
        wsum += kernel[k + r];
      }
      out[y * width + x] = val / wsum;
    }
  }
  return out;
}

/** Downsample a grayscale Float32Array by factor 2 using simple 2×2 average. */
export function downsample2x(input: Float32Array, width: number, height: number): Float32Array {
  const w2 = Math.floor(width / 2);
  const h2 = Math.floor(height / 2);
  const out = new Float32Array(w2 * h2);
  for (let y = 0; y < h2; y++) {
    for (let x = 0; x < w2; x++) {
      out[y * w2 + x] =
        (input[y * 2 * width + x * 2] +
          input[y * 2 * width + x * 2 + 1] +
          input[(y * 2 + 1) * width + x * 2] +
          input[(y * 2 + 1) * width + x * 2 + 1]) /
        4;
    }
  }
  return out;
}

/** Upsample a grayscale Float32Array by factor 2 using bilinear interpolation. */
export function upsample2x(input: Float32Array, srcW: number, srcH: number): Float32Array {
  const w2 = srcW * 2;
  const h2 = srcH * 2;
  const out = new Float32Array(w2 * h2);
  for (let y = 0; y < h2; y++) {
    for (let x = 0; x < w2; x++) {
      const sx = x / 2;
      const sy = y / 2;
      const x0 = Math.min(Math.floor(sx), srcW - 1);
      const y0 = Math.min(Math.floor(sy), srcH - 1);
      const x1 = Math.min(x0 + 1, srcW - 1);
      const y1 = Math.min(y0 + 1, srcH - 1);
      const fx = sx - x0;
      const fy = sy - y0;
      out[y * w2 + x] =
        input[y0 * srcW + x0] * (1 - fx) * (1 - fy) +
        input[y0 * srcW + x1] * fx * (1 - fy) +
        input[y1 * srcW + x0] * (1 - fx) * fy +
        input[y1 * srcW + x1] * fx * fy;
    }
  }
  return out;
}
