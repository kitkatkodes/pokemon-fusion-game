/**
 * Neural style transfer via @magenta/image (ArbitraryStyleTransferNetwork).
 * The library is loaded at runtime from CDN — no npm package needed.
 * API mirrors the standalone HTML demo in pokefusion.html exactly.
 */

// ─── CDN type declaration ──────────────────────────────────

declare global {
  interface Window {
    mi?: {
      ArbitraryStyleTransferNetwork: new () => {
        initialize(): Promise<void>;
        stylize(
          content: HTMLCanvasElement | HTMLImageElement,
          style:   HTMLCanvasElement | HTMLImageElement,
          strength?: number,
        ): Promise<ImageData>;
      };
    };
  }
}

// ─── Script loader (tries CDNs in order) ──────────────────

const CDN_URLS = [
  'https://cdn.jsdelivr.net/npm/@magenta/image@0.2.1/dist/magentaimage.min.js',
  'https://unpkg.com/@magenta/image@0.2.1/dist/magentaimage.min.js',
];

function loadScript(urls: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const tryNext = (i: number) => {
      if (i >= urls.length) { reject(new Error('All CDNs failed')); return; }
      const s = document.createElement('script');
      s.src = urls[i];
      s.onload  = () => resolve();
      s.onerror = () => tryNext(i + 1);
      document.head.appendChild(s);
    };
    tryNext(0);
  });
}

// ─── Singleton model ───────────────────────────────────────

type StyleNet = InstanceType<NonNullable<Window['mi']>['ArbitraryStyleTransferNetwork']>;
let _netPromise: Promise<StyleNet> | null = null;

export function loadStyleNet(): Promise<StyleNet> {
  if (_netPromise) return _netPromise;
  _netPromise = (async () => {
    if (!window.mi) await loadScript(CDN_URLS);
    if (!window.mi) throw new Error('Style-transfer library failed to load from CDN');
    const net = new window.mi.ArbitraryStyleTransferNetwork();
    await net.initialize();
    return net;
  })();
  return _netPromise;
}

/** Call early (e.g. App mount) so the model is warm before the first round. */
export const preloadNeuralModel = loadStyleNet;

// ─── Canvas helpers ────────────────────────────────────────

/** Fetch a Pokémon artwork URL and draw it onto a white-background canvas. */
export function artworkToCanvas(url: string, size: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      resolve(c);
    };
    img.onerror = () => reject(new Error('Could not fetch artwork: ' + url));
    img.src = url;
  });
}

// ─── Public API ────────────────────────────────────────────

/**
 * Run neural style transfer.
 * @param contentCanvas  Body Pokémon canvas (384 × 384) — determines shape
 * @param styleCanvas    Skin Pokémon canvas  (256 × 256) — determines colour/texture
 * @param strength       0–1 style blend (default 0.9)
 * @returns              ImageData of the stylised fusion
 */
export async function neuralStylize(
  contentCanvas: HTMLCanvasElement,
  styleCanvas:   HTMLCanvasElement,
  strength = 0.9,
): Promise<ImageData> {
  const net = await loadStyleNet();
  return net.stylize(contentCanvas, styleCanvas, strength);
}
