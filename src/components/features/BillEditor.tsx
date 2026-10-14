"use client";

import { useState } from "react";
import type { BillItem, Person } from "@/lib/types";
import { generateId, formatCurrency } from "@/lib/utils";
import PeopleManager from "./PeopleManager";

interface Props {
  items: BillItem[];
  people: Person[];
  onChangeItems: (items: BillItem[]) => void;
  onChangePeople: (people: Person[]) => void;
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

export default function BillEditor({
  items,
  people,
  onChangeItems,
  onChangePeople,
}: Props) {
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");

  const addItem = () => {
    const name = newName.trim();
    const price = Math.round(parseFloat(newPrice.replace(/[^\d.-]/g, "")));
    if (!name || isNaN(price) || price === 0) return;
    onChangeItems([
      ...items,
      { id: generateId(), name, price, taxable: true, assignedTo: [] },
    ]);
    setNewName("");
    setNewPrice("");
  };

  const removeItem = (id: string) => {
    onChangeItems(items.filter((i) => i.id !== id));
  };

  const toggleAssignee = (itemId: string, personId: string) => {
    onChangeItems(
      items.map((item) => {
        if (item.id !== itemId) return item;
        const already = item.assignedTo.includes(personId);
        return {
          ...item,
          assignedTo: already
            ? item.assignedTo.filter((pid) => pid !== personId)
            : [...item.assignedTo, personId],
        };
      })
    );
  };

  return (
    <div className="space-y-8">
      <PeopleManager people={people} onChange={onChangePeople} />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
            Items
          </h3>
          {items.length > 0 && (
            <span className="text-xs text-text-muted">
              Tap a name to assign an item
            </span>
          )}
        </div>

        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-surface-1 border border-outline-subtle rounded-xl p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-text font-medium">{item.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-accent-text font-mono text-sm">
                    {formatCurrency(item.price)}
                  </span>
                  <button
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.name}`}
                    className="text-text-faint hover:text-danger transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {people.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {people.map((person, i) => {
                    const isAssigned = item.assignedTo.includes(person.id);
                    return (
                      <button
                        key={person.id}
                        onClick={() => toggleAssignee(item.id, person.id)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          isAssigned
                            ? `${COLORS[i % COLORS.length]} text-white`
                            : "bg-surface-2 text-text-muted hover:bg-surface-3"
                        }`}
                      >
                        {person.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {people.length === 0 && (
                <p className="text-xs text-text-faint">
                  Add people below, then tap their name to split this item.
                </p>
              )}
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addItem();
          }}
          className="flex flex-col sm:flex-row gap-2 pt-1"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Item name"
            className="flex-1 bg-surface-2 border border-outline rounded-xl px-3 py-2 text-sm text-text placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
          />
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="Price"
              className="flex-1 bg-surface-2 border border-outline rounded-xl px-3 py-2 text-sm text-text placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-accent hover:bg-accent-text text-on-accent text-sm font-medium rounded-xl transition-colors whitespace-nowrap"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
