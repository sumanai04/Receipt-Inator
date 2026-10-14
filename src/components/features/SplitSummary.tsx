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
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="block cursor-text rounded-xl border border-outline bg-surface-1 px-3 py-2 text-left transition-colors hover:border-outline-strong focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30"
    >
      <span className="block text-xs text-text-muted">{label}</span>
      <span className="mt-0.5 flex items-baseline gap-1">
        <span className="font-mono text-xs text-text-muted">Rp</span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={value || ""}
          placeholder="0"
          onChange={(e) => {
            const n = parseInt(e.target.value.replace(/[^\d]/g, ""), 10);
            onChange(Number.isFinite(n) ? n : 0);
          }}
          className="w-full min-w-0 bg-transparent font-mono text-sm font-medium text-text placeholder:text-text-faint focus:outline-none"
        />
      </span>
    </label>
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
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
            Charges
          </h3>
          <span className="text-xs text-text-muted">Tap a field to edit</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <ChargeField
            id="charge-service"
            label="Service"
            value={charges.service}
            onChange={(v) => onChangeCharges({ ...charges, service: v })}
          />
          <ChargeField
            id="charge-tax"
            label="Tax"
            value={charges.tax}
            onChange={(v) => onChangeCharges({ ...charges, tax: v })}
          />
          <ChargeField
            id="charge-tip"
            label="Tip"
            value={charges.tip}
            onChange={(v) => onChangeCharges({ ...charges, tip: v })}
          />
        </div>
      </div>

      <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 text-center">
        <p className="text-accent-text text-xs uppercase tracking-wide">Bill total</p>
        <p className="text-accent-text text-3xl font-bold font-mono">
          {formatCurrency(result.total)}
        </p>
        <p className="text-text-muted text-xs mt-1">
          Items {formatCurrency(result.subtotal)} · Tax {formatCurrency(result.tax)} · Service{" "}
          {formatCurrency(result.service)}
          {charges.tip ? ` · Tip ${formatCurrency(charges.tip)}` : ""}
        </p>
      </div>

      {people.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-text-muted">Each person owes</p>
          {result.perPerson.map((pp, i) => (
            <div
              key={pp.personId}
              className="bg-surface-1 border border-outline-subtle rounded-xl p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${COLORS[i % COLORS.length]}`} />
                  <span className="text-text font-medium">
                    {nameById.get(pp.personId) ?? "?"}
                  </span>
                </div>
                <span className="text-accent-text font-mono font-bold text-lg">
                  {formatCurrency(pp.total)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-text-muted">
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
        className="w-full py-3 bg-accent hover:bg-accent-text text-on-accent font-semibold rounded-xl transition-colors"
      >
        {saved ? "Saved ✓" : "Save"}
      </button>
    </div>
  );
}
