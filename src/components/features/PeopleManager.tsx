"use client";

import { useState } from "react";
import type { Person } from "@/lib/types";
import { generateId } from "@/lib/utils";

interface Props {
  people: Person[];
  onChange: (people: Person[]) => void;
}

export default function PeopleManager({ people, onChange }: Props) {
  const [name, setName] = useState("");

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (people.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setName("");
      return;
    }
    onChange([...people, { id: generateId(), name: trimmed }]);
    setName("");
  };

  const remove = (id: string) => {
    onChange(people.filter((p) => p.id !== id));
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
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
        People
      </h3>

      <div className="flex flex-wrap gap-2">
        {people.map((person, i) => (
          <span
            key={person.id}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white ${colors[i % colors.length]}`}
          >
            {person.name}
            <button
              onClick={() => remove(person.id)}
              className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add a person..."
          className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          Add
        </button>
      </form>
    </div>
  );
}
