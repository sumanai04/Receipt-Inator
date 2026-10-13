"use client";

import { useCallback, useState } from "react";
import type { BillCharges, BillItem, BillSession, Person } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { deleteSession, loadSessions, saveSession } from "@/lib/storage";
import { recognizeReceipt } from "@/lib/ocr/recognize";
import { parseReceipt } from "@/lib/receipt/parser";
import BillUploader from "@/components/features/BillUploader";
import BillEditor from "@/components/features/BillEditor";
import SplitSummary from "@/components/features/SplitSummary";
import HistoryPanel from "@/components/features/HistoryPanel";

type Stage = "upload" | "scanning" | "edit";

const EMPTY_CHARGES: BillCharges = { service: 0, tax: 0, tip: 0, rounding: 0 };

export default function HomePage() {
  const [stage, setStage] = useState<Stage>("upload");
  const [status, setStatus] = useState("");
  const [items, setItems] = useState<BillItem[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [charges, setCharges] = useState<BillCharges>(EMPTY_CHARGES);
  const [billImage, setBillImage] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | null>(null);
  const [engine, setEngine] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<BillSession[]>([]);

  const handleImage = useCallback(async (dataUrl: string) => {
    setBillImage(dataUrl);
    setNotice(null);
    setSaved(false);
    setStage("scanning");
    setStatus("Reading your bill…");
    try {
      const ocr = await recognizeReceipt(dataUrl, (label) =>
        setStatus(`Reading your bill… (${label})`)
      );
      setEngine(ocr.engine);
      const parsed = parseReceipt(ocr.text);
      setItems(
        parsed.items.map((p) => ({
          id: generateId(),
          name: p.name,
          price: p.price,
          taxable: p.taxable,
          assignedTo: [],
        }))
      );
      setCharges({
        service: parsed.service?.amount ?? 0,
        tax: parsed.tax?.amount ?? 0,
        tip: 0,
        rounding: parsed.rounding ?? 0,
      });
      setNotice(
        parsed.items.length === 0
          ? "We couldn't find any items — add them below."
          : parsed.warnings.some((w) => w.includes("do not match"))
            ? "Heads up: the printed receipt doesn't add up. Double-check the items below."
            : null
      );
      setStage("edit");
    } catch {
      setItems([]);
      setCharges(EMPTY_CHARGES);
      setNotice("We couldn't read this receipt — add the items manually.");
      setStage("edit");
    }
  }, []);

  const startManual = useCallback(() => {
    setItems([]);
    setPeople([]);
    setCharges(EMPTY_CHARGES);
    setBillImage(undefined);
    setNotice(null);
    setSaved(false);
    setStage("edit");
  }, []);

  const save = useCallback(() => {
    const subtotal = items.reduce((s, i) => s + i.price, 0);
    const total = subtotal + charges.service + charges.tax + charges.tip + charges.rounding;
    const session: BillSession = {
      id: generateId(),
      date: new Date().toISOString(),
      items,
      people,
      charges,
      subtotal,
      total,
      billImage,
    };
    saveSession(session);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [items, people, charges, billImage]);

  const openHistory = useCallback(() => {
    setSessions(loadSessions());
    setShowHistory(true);
  }, []);

  const loadSession = useCallback((session: BillSession) => {
    setItems(session.items);
    setPeople(session.people);
    setCharges(session.charges ?? EMPTY_CHARGES);
    setBillImage(session.billImage);
    setNotice(null);
    setSaved(false);
    setShowHistory(false);
    setStage("edit");
  }, []);

  const removeSession = useCallback((id: string) => {
    deleteSession(id);
    setSessions(loadSessions());
  }, []);

  const reset = useCallback(() => {
    setStage("upload");
    setItems([]);
    setPeople([]);
    setCharges(EMPTY_CHARGES);
    setBillImage(undefined);
    setNotice(null);
    setSaved(false);
  }, []);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Bill Splitter</h1>
          <p className="text-gray-500 text-sm">Scan a receipt, split it fairly</p>
        </div>
        <div className="flex gap-2">
          {stage === "edit" && (
            <button
              onClick={reset}
              className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
              title="New"
              aria-label="New"
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
            aria-label="History"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </header>

      {stage === "upload" && (
        <div className="space-y-6">
          <BillUploader onImage={handleImage} />
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

      {stage === "scanning" && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">{status}</p>
          <p className="text-gray-600 text-xs">Runs on your device — nothing is uploaded.</p>
        </div>
      )}

      {stage === "edit" && (
        <div className="space-y-8">
          {billImage && (
            <div className="relative rounded-xl overflow-hidden max-h-36">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={billImage} alt="Receipt" className="w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent" />
            </div>
          )}

          {notice && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-sm text-amber-300">
              {notice}
            </div>
          )}

          {engine && (
            <p className="text-xs text-gray-600">
              Read via {engine === "paddle" ? "PaddleOCR" : "Tesseract"}
            </p>
          )}

          <BillEditor
            items={items}
            people={people}
            onChangeItems={setItems}
            onChangePeople={setPeople}
          />

          <SplitSummary
            items={items}
            people={people}
            charges={charges}
            onChangeCharges={setCharges}
            onSave={save}
            saved={saved}
          />
        </div>
      )}

      {showHistory && (
        <HistoryPanel
          sessions={sessions}
          onLoad={loadSession}
          onDelete={removeSession}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}
