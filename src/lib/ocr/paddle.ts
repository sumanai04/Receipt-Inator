import type { OcrResult, OcrResultItem, PaddleOCR } from "@paddleocr/paddleocr-js";
import { loadImage } from "./preprocess";

type PaddleInstance = Awaited<ReturnType<typeof PaddleOCR.create>>;

let instance: Promise<PaddleInstance> | null = null;

async function createInstance(useWorker: boolean): Promise<PaddleInstance> {
  const { PaddleOCR: Paddle } = await import("@paddleocr/paddleocr-js");
  return Paddle.create({
    lang: "id",
    ocrVersion: "PP-OCRv6",
    worker: useWorker,
    textDetectionModelName: "PP-OCRv6_small_det",
    textDetectionModelAsset: { url: "/paddleocr/det.tar" },
    textRecognitionModelName: "PP-OCRv6_small_rec",
    textRecognitionModelAsset: { url: "/paddleocr/rec.tar" },
    ortOptions: { backend: "wasm" },
  });
}

export function getPaddle(useWorker = true): Promise<PaddleInstance> {
  instance ??= createInstance(useWorker);
  return instance;
}

export async function disposePaddle(): Promise<void> {
  if (instance) {
    const ocr = await instance;
    ocr.dispose();
    instance = null;
  }
}

const MAX_LONG_EDGE = 2600;

function normalizedCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const long = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = long > MAX_LONG_EDGE ? MAX_LONG_EDGE / long : 1;
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

interface Box {
  text: string;
  x0: number;
  cy: number;
  h: number;
}

interface Row {
  cy: number;
  h: number;
  n: number;
  items: Box[];
}

function itemsToLines(items: OcrResultItem[]): string[] {
  const boxes: Box[] = items.map((it) => {
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const [x, y] of it.poly) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    return { text: it.text, x0, cy: (y0 + y1) / 2, h: Math.max(1, y1 - y0) };
  });

  boxes.sort((a, b) => a.cy - b.cy);

  const rows: Row[] = [];
  for (const b of boxes) {
    const row = rows.find((r) => Math.abs(r.cy - b.cy) < Math.max(r.h, b.h) * 0.6);
    if (row) {
      row.cy = (row.cy * row.n + b.cy) / (row.n + 1);
      row.n += 1;
      row.h = Math.max(row.h, b.h);
      row.items.push(b);
    } else {
      rows.push({ cy: b.cy, h: b.h, n: 1, items: [b] });
    }
  }

  return rows.map((r) =>
    r.items
      .sort((a, b) => a.x0 - b.x0)
      .map((i) => i.text)
      .join(" ")
  );
}

export interface PaddleText {
  text: string;
  score: number;
  lineCount: number;
}

export async function paddleRecognize(
  dataUrl: string,
  useWorker = true
): Promise<PaddleText> {
  const ocr = await getPaddle(useWorker);
  const img = await loadImage(dataUrl);
  const canvas = normalizedCanvas(img);
  const results: OcrResult[] = await ocr.predict(canvas);
  const result = results[0];
  if (!result || !result.items || result.items.length === 0) {
    return { text: "", score: 0, lineCount: 0 };
  }
  const items = result.items;
  const lines = itemsToLines(items);
  const score = items.reduce((s, it) => s + it.score, 0) / items.length;
  return { text: lines.join("\n"), score, lineCount: lines.length };
}
