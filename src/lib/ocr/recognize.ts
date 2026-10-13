import { PSM } from "tesseract.js";
import { buildVariants, type VariantKind } from "./preprocess";
import { recognizeWithPsm, type PsmValue } from "./engine";
import { scoreResult } from "./score";
import { paddleRecognize } from "./paddle";
import { parseReceipt } from "@/lib/receipt/parser";

export interface ReceiptOcrResult {
  text: string;
  confidence: number;
  engine: "paddle" | "tesseract";
  itemCount: number;
}

interface Config {
  variant: VariantKind;
  psm: PsmValue;
  label: string;
}

const CONFIGS: Config[] = [
  { variant: "autocontrast", psm: PSM.SINGLE_COLUMN, label: "auto-contrast · PSM 4" },
  { variant: "original", psm: PSM.SINGLE_BLOCK, label: "original · PSM 6" },
  { variant: "adaptive", psm: PSM.SPARSE_TEXT, label: "adaptive · PSM 11" },
];

async function tesseractFallback(
  dataUrl: string,
  onProgress?: (label: string) => void
): Promise<ReceiptOcrResult> {
  const { variants } = await buildVariants(dataUrl);
  const byKind = new Map(variants.map((v) => [v.kind, v]));

  let bestText = "";
  let bestScore = -1;
  let bestConf = 0;

  for (const cfg of CONFIGS) {
    const variant = byKind.get(cfg.variant);
    if (!variant) continue;
    onProgress?.(`Tesseract ${cfg.label}`);
    const out = await recognizeWithPsm(variant.dataUrl, cfg.psm);
    const metrics = scoreResult(out.data);
    if (metrics.score > bestScore) {
      bestScore = metrics.score;
      bestText = out.text;
      bestConf = metrics.avgConfidence;
    }
    if (metrics.reliable) break;
  }

  return {
    text: bestText,
    confidence: bestConf,
    engine: "tesseract",
    itemCount: parseReceipt(bestText).items.length,
  };
}

export async function recognizeReceipt(
  dataUrl: string,
  onProgress?: (label: string) => void
): Promise<ReceiptOcrResult> {
  onProgress?.("PaddleOCR");
  try {
    const paddle = await paddleRecognize(dataUrl, false);
    const paddleParsed = parseReceipt(paddle.text);
    if (paddleParsed.items.length > 0) {
      return {
        text: paddle.text,
        confidence: paddle.score,
        engine: "paddle",
        itemCount: paddleParsed.items.length,
      };
    }
  } catch (err) {
    console.error("PaddleOCR path failed:", err);
  }

  return tesseractFallback(dataUrl, onProgress);
}
