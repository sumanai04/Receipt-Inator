"use client";

import { useState, useCallback } from "react";
import type { BillItem, Person, BillSession } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { loadSessions, saveSession, deleteSession } from "@/lib/storage";
import BillUploader from "@/components/features/BillUploader";
import { analyzeReceiptImage } from "@/actions/receiptParser";
import BillEditor from "@/components/features/BillEditor";
import SplitSummary from "@/components/features/SplitSummary";
import HistoryPanel from "@/components/features/HistoryPanel";

function parsePrice(raw: string): number {
  const isNegative = raw.startsWith("-");
  const num = isNegative ? raw.slice(1) : raw;
  // "15.000" → 15000, "1.500.000" → 1500000 (thousands separators)
  // "15.99" → 15.99 (decimal)
  let result: number;
  if (num.includes(".")) {
    const segments = num.split(".");
    const allThousands = segments.slice(1).every((s) => s.length === 3);
    result = allThousands ? parseFloat(num.replace(/\./g, "")) : parseFloat(num);
  } else {
    result = parseFloat(num);
  }
  return isNegative ? -result : result;
}

const nonItemKeywords = /^(subtotal|sub total|total|grand total|tax|ppn|service|service charge|cash|change|kembalian|payment|debit|credit|qris|rounding|pembulatan|discount|diskon|promo|voucher|thank|order|table|waiter|kasir|cashier)$/i;

function parseReceiptText(text: string): { name: string; price: number }[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const items: { name: string; price: number }[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    // Strip currency prefix and commas, keep spaces, dots, and minus signs
    const cleaned = line.replace(/\bRp\b/gi, "").replace(/[$,]/g, "").trim();

    if (nonItemKeywords.test(cleaned)) continue;

    // Match "Item name ... number" — allows negative (e.g. "Rounding  -200")
    const priceAtEnd = cleaned.match(/^(.+?)\s+(-?\d[\d.]*)\s*$/);
    if (priceAtEnd) {
      const name = priceAtEnd[1].replace(/[.*#]/g, "").replace(/\bx\d+\b/gi, "").trim();
      if (nonItemKeywords.test(name)) continue;
      const price = parsePrice(priceAtEnd[2]);
      if (name && price !== 0 && !isNaN(price) && name.length > 1 && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        items.push({ name, price });
      }
      continue;
    }

    // Match "number ... Item name" (some receipts print price first)
    const priceAtStart = cleaned.match(/^(-?\d[\d.]*)\s+(.+?)\s*$/);
    if (priceAtStart) {
      const price = parsePrice(priceAtStart[1]);
      const name = priceAtStart[2].replace(/[.*#]/g, "").replace(/\bx\d+\b/gi, "").trim();
      if (nonItemKeywords.test(name)) continue;
      if (name && price !== 0 && !isNaN(price) && name.length > 1 && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        items.push({ name, price });
      }
    }
  }

  return items;
}

export default function HomePage() {
  const [items, setItems] = useState<BillItem[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [billImage, setBillImage] = useState<string | undefined>();
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<BillSession[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [loadedTax, setLoadedTax] = useState(0);
  const [loadedTip, setLoadedTip] = useState(0);
  const [sessionKey, setSessionKey] = useState(0);
  const [ocrRawText, setOcrRawText] = useState<string | null>(null);
  const [showOcrText, setShowOcrText] = useState(false);
  const [parserUsed, setParserUsed] = useState<"deepseek" | "regex" | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const handleImageReady = useCallback(
    (imageDataUrl: string) => {
      setBillImage(imageDataUrl);
      setHasStarted(true);
    },
    []
  );

  const handleOCRComplete = useCallback(
    async (text: string, imageDataUrl: string) => {
      setOcrRawText(text || null);
      setShowOcrText(true);
      setIsParsing(true);

      const result = await analyzeReceiptImage(imageDataUrl, text);

      if (result.success && result.items.length > 0) {
        setItems(
          result.items.map((p) => ({
            id: generateId(),
            name: p.name,
            price: p.price,
            assignedTo: [],
          }))
        );
        setParserUsed("deepseek");
      } else {
        // DeepSeek failed — fall back to regex
        const parsed = parseReceiptText(text);
        if (parsed.length > 0) {
          setItems(
            parsed.map((p) => ({
              id: generateId(),
              name: p.name,
              price: p.price,
              assignedTo: [],
            }))
          );
          setParserUsed("regex");
        }
      }
      setIsParsing(false);
    },
    []
  );

  const handleSave = useCallback(
    (tax: number, tip: number) => {
      const subtotal = items.reduce((sum, i) => sum + i.price, 0);
      const total = subtotal + tax + tip;

      const session: BillSession = {
        id: generateId(),
        date: new Date().toISOString(),
        items,
        people,
        tax,
        tip,
        subtotal,
        total,
        billImage,
      };

      saveSession(session);
      alert("Bill session saved!");
    },
    [items, people, billImage]
  );

  const handleLoadSession = useCallback((session: BillSession) => {
    setItems(session.items);
    setPeople(session.people);
    setBillImage(session.billImage);
    setLoadedTax(session.tax);
    setLoadedTip(session.tip);
    setSessionKey((k) => k + 1);
    setHasStarted(true);
    setShowHistory(false);
  }, []);

  const handleDeleteSession = useCallback((id: string) => {
    deleteSession(id);
    setSessions(loadSessions());
  }, []);

  const openHistory = useCallback(() => {
    setSessions(loadSessions());
    setShowHistory(true);
  }, []);

  const startManual = () => setHasStarted(true);

  const newSession = () => {
    setItems([]);
    setPeople([]);
    setBillImage(undefined);
    setHasStarted(false);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Bill Splitter</h1>
          <p className="text-gray-500 text-sm">Split bills from receipt photos</p>
        </div>
        <div className="flex gap-2">
          {hasStarted && (
            <button
              onClick={newSession}
              className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
              title="New session"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
          <button
            onClick={openHistory}
            className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
            title="History"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Upload Section */}
      {!hasStarted && (
        <div className="space-y-6">
          <BillUploader
            onImageReady={handleImageReady}
            onOCRComplete={handleOCRComplete}
          />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-gray-950 px-4 text-sm text-gray-600">or</span>
            </div>
          </div>
          <button
            onClick={startManual}
            className="w-full py-3 border border-gray-800 hover:border-gray-600 text-gray-400 hover:text-gray-200 rounded-xl transition-colors text-sm"
          >
            Enter items manually
          </button>
        </div>
      )}

      {/* Main Content */}
      {hasStarted && (
        <div className="space-y-8">
          {billImage && (
            <div className="relative rounded-xl overflow-hidden max-h-36">
              <img
                src={billImage}
                alt="Receipt"
                className="w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent" />
            </div>
          )}

          {ocrRawText !== null && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowOcrText(!showOcrText)}
                className="w-full flex items-center justify-between p-3 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                <span>
                  OCR Output
                  {isParsing
                    ? " — analyzing with DeepSeek..."
                    : parserUsed === "deepseek"
                      ? ` — ${items.length} items via DeepSeek Vision`
                      : parserUsed === "regex"
                        ? ` — ${items.length} items via OCR + regex`
                        : " — no items detected"}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${showOcrText ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showOcrText && (
                <pre className="p-3 pt-0 text-xs text-gray-500 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                  {ocrRawText || "(no text detected)"}
                </pre>
              )}
            </div>
          )}
          {isParsing && (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
              <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              DeepSeek Vision is analyzing the receipt...
            </div>
          )}

          <BillEditor
            items={items}
            people={people}
            onChangeItems={setItems}
            onChangePeople={setPeople}
          />

          <SplitSummary
            key={sessionKey}
            items={items}
            people={people}
            billImage={billImage}
            initialTax={loadedTax}
            initialTip={loadedTip}
            onSave={handleSave}
          />
        </div>
      )}

      {/* History Panel */}
      {showHistory && (
        <HistoryPanel
          sessions={sessions}
          onLoad={handleLoadSession}
          onDelete={handleDeleteSession}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}
