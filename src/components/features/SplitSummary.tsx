"use client";

import { useState } from "react";
import type { BillItem, Person } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface Props {
  items: BillItem[];
  people: Person[];
  billImage?: string;
  initialTax?: number;
  initialTip?: number;
  onSave: (tax: number, tip: number) => void;
}

export default function SplitSummary({
  items,
  people,
  billImage,
  initialTax = 0,
  initialTip = 0,
  onSave,
}: Props) {
  const [tax, setTax] = useState(initialTax);
  const [tip, setTip] = useState(initialTip);

  const subtotal = items.reduce((sum, i) => sum + i.price, 0);
  const total = subtotal + tax + tip;

  const perPersonTotals = people.map((person) => {
    const directItems = items
      .filter((i) => i.assignedTo.includes(person.id))
      .reduce((sum, i) => sum + i.price, 0);

    const unassignedItems = items
      .filter((i) => i.assignedTo.length === 0)
      .reduce((sum, i) => sum + i.price, 0);
    const splitUnassigned =
      people.length > 0 ? unassignedItems / people.length : 0;
    const splitTax = people.length > 0 ? tax / people.length : 0;
    const splitTip = people.length > 0 ? tip / people.length : 0;

    const assignedItemsShare = items
      .filter((i) => i.assignedTo.length > 0 && i.assignedTo.includes(person.id))
      .reduce((sum, i) => sum + i.price / i.assignedTo.length, 0);

    return {
      person,
      assignedItems: assignedItemsShare,
      unassignedShare: splitUnassigned,
      taxShare: splitTax,
      tipShare: splitTip,
      total: assignedItemsShare + splitUnassigned + splitTax + splitTip,
    };
  });

  const colors = [
    "bg-emerald-500",
    "bg-blue-500",
    "bg-purple-500",
    "bg-amber-500",
    "bg-pink-500",
    "bg-cyan-500",
    "bg-orange-500",
    "bg-lime-500",
  ];

  if (items.length === 0) return null;

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
        Split Summary
      </h3>

      {billImage && (
        <div className="rounded-xl overflow-hidden max-h-48">
          <img
            src={billImage}
            alt="Receipt"
            className="w-full object-cover opacity-50"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
        <div className="bg-gray-900 rounded-xl p-3">
          <p className="text-gray-500 text-xs">Subtotal</p>
          <p className="text-gray-100 font-mono font-medium text-sm truncate">
            {formatCurrency(subtotal)}
          </p>
        </div>
        <div className="bg-gray-900 rounded-xl p-3">
          <label className="text-gray-500 text-xs">Tax</label>
          <input
            type="number"
            value={tax || ""}
            onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
            placeholder="0"
            step="0.01"
            min="0"
            className="w-full text-center bg-transparent text-gray-100 font-mono font-medium text-sm focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        <div className="bg-gray-900 rounded-xl p-3">
          <label className="text-gray-500 text-xs">Tip</label>
          <input
            type="number"
            value={tip || ""}
            onChange={(e) => setTip(parseFloat(e.target.value) || 0)}
            placeholder="0"
            step="0.01"
            min="0"
            className="w-full text-center bg-transparent text-gray-100 font-mono font-medium text-sm focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>

      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
        <p className="text-emerald-300 text-xs uppercase tracking-wide">
          Total
        </p>
        <p className="text-emerald-400 text-2xl font-bold font-mono">
          {formatCurrency(total)}
        </p>
      </div>

      {people.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">Per person breakdown</p>
          {perPersonTotals.map((ppt, i) => (
            <div
              key={ppt.person.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${colors[i % colors.length]}`}
                  />
                  <span className="text-gray-100 font-medium">
                    {ppt.person.name}
                  </span>
                </div>
                <span className="text-emerald-400 font-mono font-bold">
                  {formatCurrency(ppt.total)}
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-500 space-x-2">
                {ppt.assignedItems > 0 && (
                  <span>Items: {formatCurrency(ppt.assignedItems)}</span>
                )}
                {ppt.unassignedShare > 0 && (
                  <span>Split: {formatCurrency(ppt.unassignedShare)}</span>
                )}
                {ppt.taxShare > 0 && (
                  <span>Tax: {formatCurrency(ppt.taxShare)}</span>
                )}
                {ppt.tipShare > 0 && (
                  <span>Tip: {formatCurrency(ppt.tipShare)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => onSave(tax, tip)}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors"
      >
        Save to History
      </button>
    </div>
  );
}
