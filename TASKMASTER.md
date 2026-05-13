# TASKMASTER — Receipt-Inator

## Environment

- **Repo:** https://github.com/sumanai04/Receipt-Inator.git
- **Branch:** `main`
- **Deploy:** Vercel (auto-deploys on push to `main`)
- **Working directory:** `src/frontend` (not repo root — `package.json`, Next.js app, and `.git` live here)
- **Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS 3, React 18
- **OCR:** Tesseract.js (browser-side)
- **AI parsing:** DeepSeek Vision API (server action at `src/actions/receiptParser.ts`)

## Key commands (run from `src/frontend`)

```
npm run dev         # Start dev server
npm run build       # Production build
npx tsc --noEmit    # TypeScript check (lint is not configured yet)
```

## Project structure (under `src/frontend/src`)

```
app/
  layout.tsx        # Root layout
  page.tsx          # Main page — all state + flow orchestration
  globals.css       # Tailwind + base styles
components/features/
  BillUploader.tsx  # Drag/drop, camera, Tesseract OCR
  BillEditor.tsx    # Manual item + people add forms
  PeopleManager.tsx # Add/remove people
  SplitSummary.tsx  # Totals grid, per-person breakdown, save
  HistoryPanel.tsx  # Saved sessions list
actions/
  receiptParser.ts  # DeepSeek Vision server action
lib/
  types.ts          # BillItem, Person, BillSession types
  utils.ts          # generateId, formatCurrency
  storage.ts        # localStorage save/load/delete
```

## Changes made so far

### 1. Mobile responsive forms (commits f703376, f1b33a7)
- **BillEditor.tsx** — add-item form: `flex flex-col sm:flex-row` so inputs stack on mobile. Name input full-width, price + button on second row.
- **PeopleManager.tsx** — same treatment for add-person form.

### 2. Mobile responsive totals grid (commit 8ba168c)
- **SplitSummary.tsx** — subtotal/tax/tip grid: `grid-cols-1 sm:grid-cols-3` so each card stacks full-width on mobile. Added `text-sm` + `truncate` to prevent overflow of large currency values.

### 3. Negative item prices for rounding (commit 1847a9a)
- **BillEditor.tsx** — removed `min="0"` from price input and changed `price <= 0` to `price === 0` so users can add negative entries like "Rounding -200".

### 4. Cross-reference OCR text with DeepSeek (commit ef26329)
- **receiptParser.ts** — `analyzeReceiptImage` now accepts optional `ocrText` param. When provided, Tesseract's raw OCR output is injected into the DeepSeek prompt so the model can cross-reference both image and text.
- **page.tsx** — restructured flow: DeepSeek now fires from `handleOCRComplete` (after Tesseract finishes) instead of `handleImageReady`, so both image and OCR text are available. Regex fallback still runs if DeepSeek fails.
