# Bill Splitter

Split bills from receipt photos. Snap a picture — the app reads the items **on your device** and splits them across people, with tax and service handled fairly.

**Runs entirely in the browser. No login, no backend, no API keys, no cost. Nothing is uploaded.**

## How it works

- **OCR** runs client-side: **PaddleOCR** (PP-OCRv6 via ONNX Runtime Web) is the primary engine, with **Tesseract.js** as fallback. Both run in the browser; nothing is uploaded.
- A **deterministic parser** turns the OCR text into items + charges (Indonesian receipts: PB1/PBJT, service charge, pembulatan).
- A **money engine** splits per-item tax, equal service, and tip using integer rupiah with largest-remainder rounding, so each person's total always sums exactly to the bill.

## Quick start

```bash
cd src/frontend
npm install
npm run dev
```

Open http://localhost:3000

## Build & deploy

The app builds to a **static export** (`out/`) — deploy anywhere static.

```bash
npm run build      # outputs to out/
```

- **Vercel:** import the repo, set Root Directory to `src/frontend`. (Headers via `vercel.json`.)
- **Cloudflare Pages / Netlify / GitHub Pages:** publish the `out/` directory.

No environment variables are required.

## Dev tools

- `/ocr-lab` — diagnostics page: runs every preprocessing variant × PSM mode and scores them. Not linked from the app.

## Notes

- The OCR engine (worker, WASM core, `ind`/`eng` language data, ~16 MB) is self-hosted under `public/tesseract/` and cached by the browser after first use.
