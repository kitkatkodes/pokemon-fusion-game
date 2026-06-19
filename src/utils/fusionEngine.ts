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

const ART_URL = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

export interface FusionResult {
  dataUrl: string;
  hue1: number;
  hue2: number;
}

export async function generateFusion(id1: number, id2: number): Promise<FusionResult> {
  // Randomly decide which Pokémon is the body and which is the skin
  const [bodyId, skinId] = Math.random() < 0.5 ? [id1, id2] : [id2, id1];

  // Load artwork (matches sizes used in the standalone demo)
  const [contentCanvas, styleCanvas] = await Promise.all([
    artworkToCanvas(ART_URL(bodyId), 384), // content — large for detail
    artworkToCanvas(ART_URL(skinId), 256), // style   — 256 is what the model expects
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
