# Receipt-inator

Split restaurant bills from a photo of the receipt. The app reads the line items **on your device**, assigns them to people, and works out exactly who owes what — with tax, service charge, and rounding handled fairly.

**100% browser-side. No login, no backend, no API keys, no cost. Nothing is uploaded.**

**Live:** https://receipt-inator.vercel.app

## How it works

- **On-device OCR.** [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) (PP-OCRv6, via ONNX Runtime Web) is the primary engine, with [Tesseract.js](https://github.com/naptha/tesseract.js) as fallback. Both run in the browser — your receipt never leaves the device.
- **Deterministic parsing.** A pure-TypeScript parser turns OCR text into items and charges. Tuned for Indonesian receipts (PB1/PBJT, service charge, pembulatan), with arithmetic validation that flags "this receipt doesn't add up" instead of guessing.
- **Exact money.** An integer-rupiah split engine applies per-item tax, equal service, tip, and largest-remainder rounding, so every person's total sums **exactly** to the bill.

## Stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS 3 · static export.

Design language and color-token conventions: [`DESIGN.md`](./DESIGN.md).

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. **No environment variables are required.**

## Build & deploy

The app builds to a **static export** (`out/`) — deploy it anywhere static.

```bash
npm run build      # outputs to out/
```

- **Vercel** — import the repo and deploy. No Root Directory override needed (the app is at the repo root); headers are configured in `vercel.json`.
- **Cloudflare Pages / Netlify / GitHub Pages** — publish the `out/` directory.

The OCR models are self-hosted under `public/` (PaddleOCR models + Tesseract worker/core/language data, ~16 MB) and cached by the browser after first use.

## Dev tools

Unlinked diagnostic routes used while tuning OCR extraction:

- `/ocr-lab` — runs every preprocessing variant × PSM mode and scores them.
- `/paddle-test` — PaddleOCR smoke test.

## Project layout

```
src/app/                  route shell + flow (upload → scanning → edit)
src/components/features/  BillUploader, BillEditor, PeopleManager, SplitSummary, HistoryPanel
src/lib/ocr/              PaddleOCR + Tesseract, preprocessing, confidence scoring
src/lib/receipt/          deterministic receipt parser
src/lib/money.ts          largest-remainder allocation (integer rupiah)
src/lib/split.ts          per-item tax + equal service + rounding
public/                   self-hosted OCR models
```
