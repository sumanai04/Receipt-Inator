/**
 * Client-side image preprocessing for OCR (Canvas only, no dependencies).
 *
 * Design notes (from research):
 * - NEVER feed a globally-binarized (OTSU) image to OCR — it erases faint
 *   thermal strokes. Prefer grayscale + contrast; use adaptive threshold only
 *   as ONE candidate variant.
 * - Normalize to a target long edge (~2600px): upscale small photos, and
 *   DOWNSCALE big phone photos (blind 3x upscaling a 4096px photo = 100+MP and
 *   will hang/crash the canvas).
 */

export type VariantKind = "original" | "gray" | "autocontrast" | "adaptive";

export interface Variant {
  kind: VariantKind;
  label: string;
  dataUrl: string;
  width: number;
  height: number;
}

const LABELS: Record<VariantKind, string> = {
  original: "Original",
  gray: "Grayscale",
  autocontrast: "Gray + auto-contrast",
  adaptive: "Adaptive threshold",
};

const TARGET_LONG_EDGE = 2600;
const MAX_LONG_EDGE = 3600;
const MAX_UPSCALE = 4;

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

function planScale(w: number, h: number): number {
  const long = Math.max(w, h);
  if (long <= 0) return 1;
  let scale = TARGET_LONG_EDGE / long;
  if (scale > 1) scale = Math.min(scale, MAX_UPSCALE); // don't blow up tiny images
  if (long * scale > MAX_LONG_EDGE) scale = MAX_LONG_EDGE / long;
  return scale;
}

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  return { canvas, ctx };
}

function toGray(pixels: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels.length);
  for (let i = 0; i < pixels.length; i += 4) {
    const g = Math.round(
      0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]
    );
    out[i] = out[i + 1] = out[i + 2] = g;
    out[i + 3] = 255;
  }
  return out;
}

/** Percentile contrast stretch (2% / 98% clip). */
function autocontrast(gray: Uint8ClampedArray): Uint8ClampedArray {
  const hist = new Array<number>(256).fill(0);
  let n = 0;
  for (let i = 0; i < gray.length; i += 4) {
    hist[gray[i]]++;
    n++;
  }
  const cut = Math.floor(n * 0.02);
  let acc = 0;
  let lo = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= cut) {
      lo = v;
      break;
    }
  }
  acc = 0;
  let hi = 255;
  for (let v = 255; v >= 0; v--) {
    acc += hist[v];
    if (acc >= cut) {
      hi = v;
      break;
    }
  }
  const range = Math.max(1, hi - lo);
  const out = new Uint8ClampedArray(gray.length);
  for (let i = 0; i < gray.length; i += 4) {
    const v = Math.max(0, Math.min(255, Math.round(((gray[i] - lo) / range) * 255)));
    out[i] = out[i + 1] = out[i + 2] = v;
    out[i + 3] = 255;
  }
  return out;
}

/** Adaptive (local-mean) threshold via integral image. */
function adaptiveThreshold(
  gray: Uint8ClampedArray,
  w: number,
  h: number,
  block = 25,
  c = 10
): Uint8ClampedArray {
  const integral = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += gray[(y * w + x) * 4];
      integral[(y + 1) * (w + 1) + (x + 1)] =
        integral[y * (w + 1) + (x + 1)] + rowSum;
    }
  }
  const r = Math.floor(block / 2);
  const out = new Uint8ClampedArray(gray.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r);
      const y0 = Math.max(0, y - r);
      const x1 = Math.min(w - 1, x + r);
      const y1 = Math.min(h - 1, y + r);
      const count = (x1 - x0 + 1) * (y1 - y0 + 1);
      const sum =
        integral[(y1 + 1) * (w + 1) + (x1 + 1)] -
        integral[y0 * (w + 1) + (x1 + 1)] -
        integral[(y1 + 1) * (w + 1) + x0] +
        integral[y0 * (w + 1) + x0];
      const mean = sum / count;
      const idx = (y * w + x) * 4;
      const v = gray[idx] < mean - c ? 0 : 255;
      out[idx] = out[idx + 1] = out[idx + 2] = v;
      out[idx + 3] = 255;
    }
  }
  return out;
}

interface Built {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  imageData: ImageData;
}

function drawScaled(img: HTMLImageElement, scale: number): Built {
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  return { canvas, ctx, w, h, imageData };
}

function finish(built: Built, kind: VariantKind): Variant {
  built.ctx.putImageData(built.imageData, 0, 0);
  return {
    kind,
    label: LABELS[kind],
    dataUrl: built.canvas.toDataURL("image/png"),
    width: built.w,
    height: built.h,
  };
}

/** Build the candidate variants at a normalized size. */
export async function buildVariants(src: string): Promise<{
  base: HTMLImageElement;
  variants: Variant[];
}> {
  const img = await loadImage(src);
  const scale = planScale(img.naturalWidth, img.naturalHeight);
  const variants: Variant[] = [];

  variants.push(finish(drawScaled(img, scale), "original"));

  {
    const b = drawScaled(img, scale);
    b.imageData.data.set(toGray(b.imageData.data));
    variants.push(finish(b, "gray"));
  }

  {
    const b = drawScaled(img, scale);
    b.imageData.data.set(autocontrast(toGray(b.imageData.data)));
    variants.push(finish(b, "autocontrast"));
  }

  {
    const b = drawScaled(img, scale);
    b.imageData.data.set(adaptiveThreshold(toGray(b.imageData.data), b.w, b.h));
    variants.push(finish(b, "adaptive"));
  }

  return { base: img, variants };
}
