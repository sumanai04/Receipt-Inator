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
    const price = parseFloat(newPrice);
    if (!name || isNaN(price) || price <= 0) return;
    onChangeItems([
      ...items,
      { id: generateId(), name, price, assignedTo: [] },
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

  return (
    <div className="space-y-8">
      <PeopleManager people={people} onChange={onChangePeople} />

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Items
        </h3>

        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-gray-100 font-medium">{item.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-mono text-sm">
                    {formatCurrency(item.price)}
                  </span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
                            ? `${colors[i % colors.length]} text-white`
                            : "bg-gray-800 text-gray-500 hover:bg-gray-700"
                        }`}
                      >
                        {person.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addItem();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Item name"
            className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="Price"
              step="0.01"
              min="0"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-colors whitespace-nowrap"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
