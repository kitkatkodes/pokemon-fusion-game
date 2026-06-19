/**
 * Fusion engine — wraps the @magenta/image neural style transfer
 * exactly as the standalone pokefusion.html demo does:
 *
 *   Body Pokémon  (384×384)  → content: shape / silhouette
 *   Skin Pokémon  (256×256)  → style:   colour & texture
 *   → ArbitraryStyleTransferNetwork.stylize() → ImageData → dataURL
 *
 * Body/Skin assignment is randomised each round for variety.
 */

import { artworkToCanvas, neuralStylize } from './neuralFusion';

export interface FusionResult {
  dataUrl: string;
  hue1: number;
  hue2: number;
}

/**
 * Generate a neural fusion from two official-artwork URLs.
 * Body (content) → shape; Skin (style) → colour & texture.
 * Assignment is randomised each call for variety.
 */
export async function generateFusion(url1: string, url2: string): Promise<FusionResult> {
  // Randomly decide which Pokémon is the body and which is the skin
  const [bodyUrl, skinUrl] = Math.random() < 0.5 ? [url1, url2] : [url2, url1];

  // Load artwork (matches sizes used in the standalone demo)
  const [contentCanvas, styleCanvas] = await Promise.all([
    artworkToCanvas(bodyUrl, 384), // content — large for detail
    artworkToCanvas(skinUrl, 256), // style   — 256 is what the model expects
  ]);

  // Run neural style transfer
  const imageData = await neuralStylize(contentCanvas, styleCanvas, 0.9);

  // Convert ImageData → dataURL via an offscreen canvas
  const out = document.createElement('canvas');
  out.width  = imageData.width;
  out.height = imageData.height;
  out.getContext('2d')!.putImageData(imageData, 0, 0);

  return { dataUrl: out.toDataURL('image/png'), hue1: 0, hue2: 0 };
}
