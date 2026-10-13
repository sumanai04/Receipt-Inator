"use client";

import { useCallback, useRef, useState } from "react";
import { buildVariants, type Variant } from "@/lib/ocr/preprocess";
import { recognizeWithPsm, PSM_LADDER } from "@/lib/ocr/engine";
import { scoreResult, type OcrMetrics } from "@/lib/ocr/score";

interface ResultRow {
  id: string;
  variant: Variant;
  psmLabel: string;
  text: string;
  metrics: OcrMetrics;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function OcrLabPage() {
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const run = useCallback(async (file: File) => {
    setRows([]);
    setDone(0);
    setRunning(true);
    setStatus("Reading image...");
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPreview(dataUrl);

      setStatus("Building variants...");
      const { variants } = await buildVariants(dataUrl);
      const combos = variants.length * PSM_LADDER.length;
      setTotal(combos);

      let i = 0;
      for (const variant of variants) {
        for (const psm of PSM_LADDER) {
          setStatus(`OCR ${variant.label} — ${psm.label}`);
          const out = await recognizeWithPsm(variant.dataUrl, psm.value);
          const metrics = scoreResult(out.data);
          const row: ResultRow = {
            id: `${variant.kind}:${psm.label}`,
            variant,
            psmLabel: psm.label,
            text: out.text,
            metrics,
          };
          setRows((prev) => [...prev, row]);
          i += 1;
          setDone(i);
        }
      }
      setStatus("Done.");
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setRunning(false);
    }
  }, []);

  const best = rows
    .filter((r) => !r.metrics.failed)
    .sort((a, b) => b.metrics.score - a.metrics.score)[0];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-100">OCR Lab</h1>
        <p className="text-sm text-gray-500">
          Runs every preprocessing variant × PSM mode, scores each, and shows the
          best. Uses Tesseract.js (ind+eng, DPI 300, preserve spaces).
        </p>
      </header>

      <div className="flex items-center gap-3">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={running}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl"
        >
          Choose receipt image
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) run(f);
          }}
        />
        {total > 0 && (
          <span className="text-sm text-gray-400">
            {done}/{total}
          </span>
        )}
        {status && <span className="text-sm text-gray-400">{status}</span>}
      </div>

      {preview && (
        <div className="border border-gray-800 rounded-xl p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="receipt" className="max-h-48 rounded" />
        </div>
      )}

      {best && (
        <section className="border border-emerald-700 bg-emerald-950/40 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-emerald-300 font-semibold">
              Best: {best.variant.label} · {best.psmLabel}
            </h2>
            <span className="text-emerald-400 font-mono text-sm">
              score {best.metrics.score.toFixed(1)} · conf{" "}
              {best.metrics.avgConfidence.toFixed(0)} · weak{" "}
              {(best.metrics.weakFraction * 100).toFixed(0)}%
            </span>
          </div>
          <pre className="text-xs text-gray-200 whitespace-pre-wrap font-mono bg-black/30 rounded p-3 max-h-72 overflow-auto">
            {best.text}
          </pre>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className={`border rounded-xl p-3 space-y-2 ${
              best && r.id === best.id
                ? "border-emerald-600"
                : r.metrics.failed
                  ? "border-red-900/60"
                  : "border-gray-800"
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-300 font-medium">
                {r.variant.label} · {r.psmLabel}
              </span>
              <span
                className={`font-mono ${
                  r.metrics.failed ? "text-red-400" : "text-emerald-400"
                }`}
              >
                {r.metrics.score.toFixed(1)}
              </span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={r.variant.dataUrl}
              alt={r.variant.label}
              className="max-h-32 rounded border border-gray-800"
            />
            <div className="text-[11px] text-gray-500 font-mono">
              chars {r.metrics.charCount} · words {r.metrics.wordCount} · conf{" "}
              {r.metrics.avgConfidence.toFixed(0)}
              {r.metrics.uncertainNumbers ? " · ⚠ numbers" : ""}
              {r.metrics.failed ? " · FAILED" : ""}
            </div>
            <pre className="text-[10px] text-gray-400 whitespace-pre-wrap font-mono max-h-40 overflow-auto">
              {r.text || "(empty)"}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
