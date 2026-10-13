/**
 * OCR result scoring + failure detection.
 *
 * `recognize()` never throws on an empty page — it just returns no words.
 * So we treat near-empty / low-confidence results as FAILURE explicitly.
 */

export interface OcrWord {
  text: string;
  confidence: number;
}

export interface OcrMetrics {
  charCount: number;
  wordCount: number;
  avgConfidence: number;
  weakFraction: number;
  uncertainNumbers: boolean;
  unreliableLines: number;
  score: number;
  failed: boolean;
  reliable: boolean;
}

interface Bbox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface RawWord {
  text?: string;
  confidence?: number;
  bbox?: Bbox;
}

interface RawLine {
  words?: RawWord[];
}

interface RawParagraph {
  lines?: RawLine[];
}

interface RawBlock {
  paragraphs?: RawParagraph[];
}

interface RawPage {
  text?: string;
  confidence?: number;
  words?: RawWord[];
  blocks?: RawBlock[] | null;
}

function flattenWords(data: unknown): OcrWord[] {
  const page = data as RawPage;
  if (page.words && page.words.length) {
    return page.words.map((w) => ({ text: w.text ?? "", confidence: w.confidence ?? 0 }));
  }
  const out: OcrWord[] = [];
  for (const block of page.blocks ?? []) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        for (const word of line.words ?? []) {
          out.push({ text: word.text ?? "", confidence: word.confidence ?? 0 });
        }
      }
    }
  }
  return out;
}

function lines(data: unknown): RawWord[][] {
  const page = data as RawPage;
  const out: RawWord[][] = [];
  for (const block of page.blocks ?? []) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        out.push(line.words ?? []);
      }
    }
  }
  return out;
}

export function scoreResult(data: unknown): OcrMetrics {
  const page = data as RawPage;
  const words = flattenWords(data).filter((w) => w.text.trim().length > 0);

  let charCount = 0;
  let weakChars = 0;
  let uncertainNumbers = false;
  for (const w of words) {
    const len = w.text.replace(/\s/g, "").length;
    charCount += len;
    if (w.confidence < 60) weakChars += len;
    if (w.confidence < 70 && /\d/.test(w.text)) uncertainNumbers = true;
  }
  const weakFraction = charCount ? weakChars / charCount : 1;
  const avgConfidence = words.length
    ? words.reduce((s, w) => s + w.confidence, 0) / words.length
    : 0;

  let unreliableLines = 0;
  for (const line of lines(data)) {
    let n = 0;
    let weak = 0;
    let weighted = 0;
    for (const w of line) {
      const t = (w.text ?? "").trim();
      const len = t.replace(/[^A-Za-z0-9]/g, "").length;
      if (!len) continue;
      n += len;
      weighted += len * (w.confidence ?? 0);
      if ((w.confidence ?? 0) < 60) weak += len;
    }
    if (n >= 6 && weighted / n < 45 && weak / n > 0.65) unreliableLines++;
  }

  const confidence = page.confidence ?? avgConfidence;
  const score =
    words.length === 0
      ? -1
      : confidence - 20 * weakFraction - Math.min(45, 15 * unreliableLines);

  const failed = charCount < 10 || words.length < 3 || confidence < 60;
  const reliable =
    charCount >= 10 && confidence >= 80 && weakFraction <= 0.2 && unreliableLines === 0;

  return {
    charCount,
    wordCount: words.length,
    avgConfidence,
    weakFraction,
    uncertainNumbers,
    unreliableLines,
    score,
    failed,
    reliable,
  };
}
