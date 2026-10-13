/**
 * Deterministic Indonesian receipt text parser (no LLM).
 *
 * Handles the common layouts: `name ... price`, `qty x unit total`,
 * `1x @49.000 49.000`, and — crucially — item NAME on one line with the
 * qty/price on the NEXT line (Marugame/QRIS-style receipts).
 */

export interface ParsedItem {
  name: string;
  price: number;
  taxable: boolean;
}

export interface ChargeHint {
  label: string;
  ratePct?: number;
  amount?: number;
}

export interface ParseResult {
  items: ParsedItem[];
  service?: ChargeHint;
  tax?: ChargeHint;
  discount?: number;
  rounding?: number;
  printedSubtotal?: number;
  printedTotal?: number;
  warnings: string[];
}

export function normalizeNumber(raw: string): number | null {
  if (!raw) return null;
  let s = raw.trim();
  if (!s) return null;

  let negative = false;
  s = s.replace(/rp\.?/gi, "").replace(/idr/gi, "").replace(/\$/g, "");
  s = s.replace(/\s+/g, "");
  if (/^[-−–]/.test(s)) {
    negative = true;
    s = s.replace(/^[-−–]+/, "");
  }
  s = s.replace(/[^0-9.,]/g, "");
  if (!s) return null;

  const hasDot = s.includes(".");
  const hasComma = s.includes(",");
  let value: number;

  if (!hasDot && !hasComma) {
    value = Number(s);
  } else if (hasDot && hasComma) {
    const decIdx = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
    const intPart = s.slice(0, decIdx).replace(/[.,]/g, "");
    const fracPart = s.slice(decIdx + 1).replace(/[^0-9]/g, "");
    value = Number(`${intPart || "0"}.${fracPart || "0"}`);
  } else {
    const sep = hasDot ? "." : ",";
    const groups = s.split(sep);
    const allThousands = groups.length > 1 && groups.slice(1).every((g) => g.length === 3);
    if (allThousands) {
      value = Number(groups.join(""));
    } else {
      const last = groups[groups.length - 1];
      if (last.length <= 2) {
        const intPart = groups.slice(0, -1).join("");
        value = Number(`${intPart || "0"}.${last}`);
      } else {
        value = Number(groups.join(""));
      }
    }
  }

  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[n];
}

function ratio(a: string, b: string): number {
  const max = Math.max(a.length, b.length, 1);
  return 1 - levenshtein(a, b) / max;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function matchesLabel(n: string, candidates: string[]): boolean {
  for (const c of candidates) {
    if (!c) continue;
    if (n === c) return true;
    if (n.startsWith(c) && c.length >= 3) return true;
    if (c.startsWith(n) && n.length >= 4) return true;
    if (ratio(n, c) >= 0.7) return true;
  }
  return false;
}

function includesAny(n: string, list: string[]): boolean {
  return list.some((k) => n.includes(k));
}

const MONEY_RE = /((?:rp\.?\s*)?[-−–]?\d[\d.,]*(?:\s\d{3})*)\s*$/i;

const LABELS = {
  subtotal: ["subtotal", "subto", "subtot"],
  service: ["service", "servicecharge", "svc"],
  tax: ["pb1", "pbjt", "ppn", "ppnbm", "pajak", "tax", "vat", "dpp", "pb"],
  discount: ["diskon", "discount", "potongan", "promo", "voucher", "hemat"],
  rounding: ["rounding", "pembulatan"],
  total: ["total", "grandtotal", "totalbayar", "totalakhir", "jumlahbayar", "jumlah"],
};

const SERVICE_KEYS = ["servicecharge", "biayalayanan", "layanan"];
const TAX_KEYS = ["pb1", "pbjt", "ppn", "ppnbm", "pajak"];
const ROUND_KEYS = ["pembulatan", "rounding"];
const GRANDTOTAL_KEYS = ["grandtotal", "totalbayar", "totalakhir"];

const SKIP_WORDS = new Set<string>([
  "cashier",
  "kasir",
  "meja",
  "table",
  "pax",
  "signature",
  "alamat",
  "telp",
  "telepon",
  "email",
  "npwp",
  "tunai",
  "cash",
  "kembalian",
  "kembali",
  "change",
  "debit",
  "kredit",
  "kartu",
  "qris",
  "edc",
  "bni",
  "visa",
  "mastercard",
  "server",
  "waiter",
  "pramusaji",
  "nota",
  "struk",
  "approval",
  "account",
  "purchased",
  "kode",
  "code",
  "purpose",
  "display",
]);

const SKIP_PHRASES = [
  "totalitem",
  "totalqty",
  "jumlahitem",
  "itemcount",
  "changedue",
  "eftno",
  "http",
  "www",
  "inclusive",
  "termasuk",
];

const DATE_RE = /\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4}/;
const TIME_RE = /\b\d{1,2}:\d{2}\b/;
const PHONE_RE = /\d{3,4}[\s-]\d{3,4}[\s-]\d{3,4}/;
const CODE_RE = /\d{7,}/;

function isSkipped(line: string, fullNorm: string): boolean {
  const tokens = line.toLowerCase().match(/[a-z]+/g);
  if (tokens && tokens.some((t) => SKIP_WORDS.has(t))) return true;
  return SKIP_PHRASES.some((p) => fullNorm.includes(p));
}

function cleanName(raw: string): string {
  let n = raw.replace(/\s+/g, " ").trim();
  n = n.replace(/^[|*·•>\]]+\s*/, "");
  n = n.replace(/^(?:([A-Za-z])\1\s+)+/, "");
  n = n.replace(/^(?:[A-Za-z]\s+)+/, "");
  n = n.replace(/^\d+\s*[xX]?\s+/, "");
  n = n.replace(/^[Il]\s+/, "");
  n = n.replace(/^[A-Z]\s+(?=[A-Za-z])/, "");
  n = n.replace(/@\s*(?:rp\.?\s*)?\d[\d.,]*(?:\s\d{3})*/gi, " ");
  n = n.replace(/[|*·•]+/g, " ");
  n = n.replace(/\s*[-–—]{2,}\s*/g, " ");
  n = n.replace(/[.:…]+$/, "").trim();
  n = n.replace(/\s+/g, " ").trim();
  return n;
}

function letterCount(s: string): number {
  const m = s.match(/[A-Za-z]/g);
  return m ? m.length : 0;
}

export function parseReceipt(rawText: string): ParseResult {
  const items: ParsedItem[] = [];
  const warnings: string[] = [];
  let service: ChargeHint | undefined;
  let tax: ChargeHint | undefined;
  let discount: number | undefined;
  let rounding: number | undefined;
  let printedSubtotal: number | undefined;
  let printedTotal: number | undefined;
  let pendingName: string | null = null;

  const lines = rawText.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/g, "");
    if (!line.trim()) continue;
    if (line.includes("#")) continue;
    if (CODE_RE.test(line)) continue;

    const fullNorm = norm(line);
    if (!fullNorm) continue;
    if (includesAny(fullNorm, ["totalitem", "totalqty", "jumlahitem", "itemcount"])) continue;
    if (DATE_RE.test(line) || TIME_RE.test(line) || PHONE_RE.test(line)) continue;
    if (isSkipped(line, fullNorm)) continue;

    const trailing = MONEY_RE.exec(line);
    const amount = trailing ? normalizeNumber(trailing[1].replace(/[.,]+$/, "")) : null;
    const head = trailing ? line.slice(0, trailing.index) : line;
    const headNorm = norm(head);
    const pct = /(\d{1,2}(?:[.,]\d{1,2})?)\s*%/.exec(line);

    if (/^(jl|pt|npwp|http|www|tel|fax)/.test(headNorm)) {
      pendingName = null;
      continue;
    }

    if (headNorm.includes("subtotal") || matchesLabel(headNorm, LABELS.subtotal)) {
      if (amount != null) printedSubtotal = amount;
      pendingName = null;
      continue;
    }
    if (
      includesAny(headNorm, SERVICE_KEYS) ||
      matchesLabel(headNorm, LABELS.service) ||
      headNorm.includes("charge")
    ) {
      service = { label: "Service Charge" };
      if (pct) service.ratePct = normalizeNumber(pct[1]) ?? undefined;
      if (amount != null) service.amount = amount;
      pendingName = null;
      continue;
    }
    if (includesAny(headNorm, TAX_KEYS) || matchesLabel(headNorm, LABELS.tax)) {
      tax = { label: "Tax" };
      if (pct) tax.ratePct = normalizeNumber(pct[1]) ?? undefined;
      if (amount != null) tax.amount = amount;
      pendingName = null;
      continue;
    }
    if (includesAny(headNorm, ROUND_KEYS) || matchesLabel(headNorm, LABELS.rounding)) {
      if (amount != null) rounding = amount;
      pendingName = null;
      continue;
    }
    if (matchesLabel(headNorm, LABELS.discount)) {
      discount = amount != null ? Math.abs(amount) : undefined;
      pendingName = null;
      continue;
    }
    if (
      includesAny(headNorm, GRANDTOTAL_KEYS) ||
      headNorm === "total" ||
      matchesLabel(headNorm, LABELS.total)
    ) {
      if (amount != null) printedTotal = amount;
      pendingName = null;
      continue;
    }
    if (headNorm.startsWith("total")) {
      pendingName = null;
      continue;
    }

    if (!trailing || amount == null) {
      const nm = cleanName(line);
      pendingName = letterCount(nm) >= 3 ? nm : null;
      continue;
    }

    const lineName = cleanName(head);
    if (letterCount(lineName) >= 3) {
      items.push({ name: lineName, price: amount, taxable: true });
      pendingName = null;
    } else if (pendingName) {
      items.push({ name: pendingName, price: amount, taxable: true });
      pendingName = null;
    }
  }

  if (items.length >= 3) {
    const total = items.reduce((s, i) => s + i.price, 0);
    const kept = items.filter((it) => Math.abs(it.price - (total - it.price)) > 1);
    if (kept.length !== items.length) {
      items.length = 0;
      items.push(...kept);
    }
  }

  const itemsSum = items.reduce((s, i) => s + i.price, 0);
  if (items.length === 0) {
    warnings.push("no items detected");
  } else if (printedSubtotal != null && Math.abs(itemsSum - printedSubtotal) > 1) {
    warnings.push(`items (${itemsSum}) do not match printed subtotal (${printedSubtotal})`);
  } else if (printedTotal != null && Math.abs(itemsSum - printedTotal) > 1) {
    warnings.push(`items (${itemsSum}) do not match printed total (${printedTotal})`);
  }

  const result: ParseResult = { items, warnings };
  if (service) result.service = service;
  if (tax) result.tax = tax;
  if (discount != null) result.discount = discount;
  if (rounding != null) result.rounding = rounding;
  if (printedSubtotal != null) result.printedSubtotal = printedSubtotal;
  if (printedTotal != null) result.printedTotal = printedTotal;
  return result;
}
