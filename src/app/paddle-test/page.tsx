"use client";

import { useCallback, useRef, useState } from "react";
import { paddleRecognize } from "@/lib/ocr/paddle";
import { parseReceipt } from "@/lib/receipt/parser";

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

export default function PaddleTestPage() {
  const [status, setStatus] = useState("");
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const run = useCallback(async (file: File) => {
    setStatus("loading model + running PaddleOCR…");
    setText("");
    setSummary("");
    try {
      const dataUrl = await readAsDataUrl(file);
      const out = await paddleRecognize(dataUrl, false);
      setText(out.text || "(no text)");
      const parsed = parseReceipt(out.text);
      setSummary(
        `lines ${out.lineCount} · avg score ${out.score.toFixed(2)} · items ${parsed.items.length} · ` +
          parsed.items.map((i) => `${i.name}=${i.price}`).join(", ")
      );
      setStatus("done");
    } catch (err) {
      setStatus(`error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold text-gray-100">PaddleOCR test</h1>
      <button
        onClick={() => inputRef.current?.click()}
        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-xl"
      >
        Choose image
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
      {status && <p className="text-sm text-gray-400">{status}</p>}
      {summary && <p className="text-sm text-emerald-300 break-words">{summary}</p>}
      <pre className="text-xs text-gray-200 whitespace-pre-wrap font-mono bg-black/30 rounded p-3 max-h-[28rem] overflow-auto">
        {text}
      </pre>
    </div>
  );
}
