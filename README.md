# Bill Splitter

Split bills from receipt photos. Snap a picture, and the app extracts every line item using AI vision — then split them across people with tax, tip, and rounding handled automatically.

**No login. No backend. All data stays in your browser.**

## Features

- **Receipt photo parsing** — DeepSeek Vision extracts items, prices, and quantities from any receipt
- **Offline fallback** — Tesseract.js OCR runs locally in your browser when the AI is unavailable
- **Camera capture** — Take a photo directly (uses the rear camera on mobile)
- **Drag & drop** — Drop an image file onto the upload area
- **Manual entry** — Add items and people by hand if you prefer
- **Per-person assignment** — Tap to assign each item to one or more people
- **Auto-split remainder** — Unassigned items and tax/tip are split evenly
- **IDR support** — Currency formatted as Indonesian Rupiah; handles dot-as-thousands-separator (`15.000` = 15000)
- **Smart filtering** — Skips subtotal, tax, cash, change, and other non-item lines (English + Indonesian)
- **Negative value handling** — Rounding adjustments and discounts work correctly
- **Session history** — Saved sessions persist in localStorage; load or delete them anytime
- **Mobile-first UI** — Designed for phone browsers, works as a Vercel deployment

## How It Works

```
Receipt photo
    │
    ├── DeepSeek Vision (server-side, primary)
    │   Sees the image, returns structured items via API
    │
    └── Tesseract.js (client-side, fallback)
        OCR extracts text, regex parses prices
        Kicks in automatically if DeepSeek finds nothing
```

Both run in parallel. Whichever returns usable items first wins.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| AI Vision | DeepSeek Vision API (`deepseek-chat`) |
| OCR Fallback | Tesseract.js v7 (browser-based) |
| Storage | localStorage (no database) |
| Deployment | Vercel |

## Getting Started

you could start immediately by using https://receipt-inator.vercel.app

or if you want to self host you could follow this instructions:

### Prerequisites

- Node.js 18+ and npm

### 1. Install dependencies

```bash
cd src/frontend
npm install
```

### 2. Set your DeepSeek API key

Create `.env.local`:

```bash
DEEPSEEK_API_KEY="sk-your-api-key-here"
```

Get a key at [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys).

> The app works without this key — it falls back to browser OCR + regex. But DeepSeek Vision is significantly more accurate.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Build for production

```bash
npm run build
npm start
```

## Deploy to Vercel

1. Push this project to a GitHub repo
2. In Vercel, import the repo and set:
   - **Root Directory:** `src/frontend`
   - **Framework:** Next.js
3. Add the environment variable in Vercel project settings:
   - `DEEPSEEK_API_KEY` — your DeepSeek API key
4. Deploy

The app works on mobile browsers immediately — no native app needed.

## Project Structure

```
src/frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Main page + receipt parsing logic
│   │   ├── layout.tsx                # Root layout
│   │   └── globals.css               # Tailwind base
│   ├── actions/
│   │   └── receiptParser.ts          # Server Action → DeepSeek Vision API
│   ├── components/
│   │   └── features/
│   │       ├── BillUploader.tsx       # Drag/drop, file picker, camera capture
│   │       ├── BillEditor.tsx         # Item list + per-person assignment
│   │       ├── SplitSummary.tsx       # Tax/tip, totals, per-person breakdown
│   │       ├── HistoryPanel.tsx       # Saved session drawer
│   │       └── PeopleManager.tsx      # Add/remove people
│   └── lib/
│       ├── types.ts                  # BillItem, Person, BillSession
│       ├── utils.ts                  # formatCurrency (IDR), generateId, cn
│       └── storage.ts                # localStorage CRUD
├── next.config.mjs                   # Server Action body size (10mb)
├── tailwind.config.ts
└── package.json
```

## License

MIT
