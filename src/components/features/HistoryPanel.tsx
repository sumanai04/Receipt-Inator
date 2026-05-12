"use client";

import type { BillSession } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface Props {
  sessions: BillSession[];
  onLoad: (session: BillSession) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function HistoryPanel({
  sessions,
  onLoad,
  onDelete,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="relative ml-auto w-full max-w-md bg-gray-950 border-l border-gray-800 h-full overflow-y-auto">
        <div className="sticky top-0 bg-gray-950 border-b border-gray-800 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-100">History</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No saved sessions yet.</p>
            <p className="text-sm mt-1">
              Split a bill and save it to see it here.
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-300 text-sm">
                      {new Date(session.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-lg font-bold text-emerald-400 font-mono">
                      {formatCurrency(session.total)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {session.items.length} items &middot; {session.people.length}{" "}
                      {session.people.length === 1 ? "person" : "people"}
                    </p>
                  </div>
                  {session.billImage && (
                    <img
                      src={session.billImage}
                      alt="Receipt"
                      className="w-16 h-16 rounded-lg object-cover opacity-60"
                    />
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onLoad(session)}
                    className="flex-1 py-1.5 text-sm bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg transition-colors"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => onDelete(session.id)}
                    className="flex-1 py-1.5 text-sm bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
