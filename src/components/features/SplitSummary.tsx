"use client";

import type { BillCharges, BillItem, Person } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { splitBill } from "@/lib/split";

interface Props {
  items: BillItem[];
  people: Person[];
  charges: BillCharges;
  onChangeCharges: (charges: BillCharges) => void;
  onSave: () => void;
  saved: boolean;
}

const COLORS = [
  "bg-emerald-500",
  "bg-blue-500",
  "bg-purple-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-lime-500",
];

function ChargeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="bg-gray-900 rounded-xl p-3">
      <label className="text-gray-500 text-xs">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        value={value || ""}
        placeholder="0"
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/[^\d]/g, ""), 10);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className="w-full text-center bg-transparent text-gray-100 font-mono font-medium text-sm focus:outline-none"
      />
    </div>
  );
}

export default function SplitSummary({
  items,
  people,
  charges,
  onChangeCharges,
  onSave,
  saved,
}: Props) {
  const result = splitBill({
    items,
    people,
    serviceAmount: charges.service,
    taxAmount: charges.tax,
    tipAmount: charges.tip,
    rounding: charges.rounding,
  });

  const nameById = new Map(people.map((p) => [p.id, p.name]));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3 text-center">
        <ChargeField
          label="Service"
          value={charges.service}
          onChange={(v) => onChangeCharges({ ...charges, service: v })}
        />
        <ChargeField
          label="Tax"
          value={charges.tax}
          onChange={(v) => onChangeCharges({ ...charges, tax: v })}
        />
        <ChargeField
          label="Tip"
          value={charges.tip}
          onChange={(v) => onChangeCharges({ ...charges, tip: v })}
        />
      </div>

      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
        <p className="text-emerald-300 text-xs uppercase tracking-wide">Bill total</p>
        <p className="text-emerald-400 text-3xl font-bold font-mono">
          {formatCurrency(result.total)}
        </p>
        <p className="text-gray-500 text-xs mt-1">
          Items {formatCurrency(result.subtotal)} · Tax {formatCurrency(result.tax)} · Service{" "}
          {formatCurrency(result.service)}
          {charges.tip ? ` · Tip ${formatCurrency(charges.tip)}` : ""}
        </p>
      </div>

      {people.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">Each person owes</p>
          {result.perPerson.map((pp, i) => (
            <div
              key={pp.personId}
              className="bg-gray-900 border border-gray-800 rounded-xl p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${COLORS[i % COLORS.length]}`} />
                  <span className="text-gray-100 font-medium">
                    {nameById.get(pp.personId) ?? "?"}
                  </span>
                </div>
                <span className="text-emerald-400 font-mono font-bold text-lg">
                  {formatCurrency(pp.total)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                <span>Items {formatCurrency(pp.items)}</span>
                {pp.tax !== 0 && <span>Tax {formatCurrency(pp.tax)}</span>}
                {pp.service !== 0 && <span>Service {formatCurrency(pp.service)}</span>}
                {pp.tip !== 0 && <span>Tip {formatCurrency(pp.tip)}</span>}
                {pp.rounding !== 0 && <span>Rounding {formatCurrency(pp.rounding)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onSave}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors"
      >
        {saved ? "Saved ✓" : "Save"}
      </button>
    </div>
  );
}
