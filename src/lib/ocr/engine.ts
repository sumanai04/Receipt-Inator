/**
 * Tesseract.js engine wrapper.
 *
 * - One worker, created once and reused (never the deprecated top-level
 *   `recognize`, which reloads language data per call).
 * - `user_defined_dpi: 300` avoids the "0 dpi -> 70 dpi" empty-page failure.
 * - `preserve_interword_spaces: 1` keeps the name/price columns separated.
 * - `ind + eng` for Indonesian receipts (PB1, PEMBULATAN, KEMBALIAN, ...).
 */

import { createWorker, OEM, PSM } from "tesseract.js";

export type PsmValue = (typeof PSM)[keyof typeof PSM];

type TessWorker = Awaited<ReturnType<typeof createWorker>>;

let workerPromise: Promise<TessWorker> | null = null;

export function getWorker(
  onProgress?: (message: string, progress: number) => void
): Promise<TessWorker> {
  workerPromise ??= createWorker(["ind", "eng"], OEM.LSTM_ONLY, {
    workerPath: "/tesseract/worker.min.js",
    corePath: "/tesseract/core",
    langPath: "/tesseract/lang",
    logger: (m) => {
      if (onProgress && typeof m.progress === "number") {
        onProgress(m.status ?? "", m.progress);
      }
    },
  }).then(async (worker) => {
    await worker.setParameters({
      preserve_interword_spaces: "1",
      user_defined_dpi: "300",
      // receipts are almost never white-on-black; avoids a wasted inverted pass
      tessedit_do_invert: "0",
    });
    return worker;
  });
  return workerPromise;
}

export async function terminateWorker(): Promise<void> {
  if (workerPromise) {
    const w = await workerPromise;
    await w.terminate();
    workerPromise = null;
  }
}

export interface RecognizeOutput {
  text: string;
  confidence: number;
  data: unknown;
}

export async function recognizeWithPsm(
  dataUrl: string,
  psm: PsmValue
): Promise<RecognizeOutput> {
  const worker = await getWorker();
  await worker.setParameters({ tessedit_pageseg_mode: psm });
  const { data } = await worker.recognize(dataUrl, {}, { text: true, blocks: true });
  return { text: data.text ?? "", confidence: data.confidence ?? 0, data };
}

/** PSM ladder, cheapest/most-likely first. */
export const PSM_LADDER: { label: string; value: PsmValue }[] = [
  { label: "PSM 4 (single column)", value: PSM.SINGLE_COLUMN },
  { label: "PSM 6 (single block)", value: PSM.SINGLE_BLOCK },
  { label: "PSM 11 (sparse text)", value: PSM.SPARSE_TEXT },
];
