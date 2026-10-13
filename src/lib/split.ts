/**
 * Bill splitting engine.
 *
 * Model (item-first):
 * - Items are the source of truth; each item is split among its assignees
 *   (equal weights) or, if unassigned, across everyone.
 * - Service / tip are split EQUALLY among all participants.
 * - Tax is split PER ITEM (proportional to each person's taxable items), which
 *   equals "rate x what they bought" for a uniform rate.
 * - Everything is integer rupiah and every pool is allocated with `allocate`,
 *   so per-person totals sum EXACTLY to the bill total.
 */

import { allocate, allocateEven } from "./money";

export interface SplitPerson {
  id: string;
  name: string;
}

export interface SplitItem {
  id: string;
  name: string;
  price: number;
  taxable: boolean;
  assignedTo: string[];
}

export interface SplitInput {
  items: SplitItem[];
  people: SplitPerson[];
  /** service charge in integer rupiah — split equally */
  serviceAmount?: number;
  /** tax in integer rupiah — split per item. If omitted, derived from taxRatePct. */
  taxAmount?: number;
  taxRatePct?: number;
  /** tip in integer rupiah — split equally */
  tipAmount?: number;
  /** signed rounding adjustment — split per item */
  rounding?: number;
}

export interface PersonShare {
  personId: string;
  items: number;
  service: number;
  tax: number;
  tip: number;
  rounding: number;
  total: number;
}

export interface SplitOutput {
  perPerson: PersonShare[];
  subtotal: number;
  service: number;
  tax: number;
  tip: number;
  rounding: number;
  total: number;
  warnings: string[];
}

export function splitBill(input: SplitInput): SplitOutput {
  const { items, people } = input;
  const n = people.length;
  const warnings: string[] = [];

  const subtotal = items.reduce((s, i) => s + i.price, 0);

  const personItems = new Map<string, number>();
  for (const p of people) personItems.set(p.id, 0);

  for (const item of items) {
    const recipients = item.assignedTo.length
      ? item.assignedTo.filter((id) => personItems.has(id))
      : people.map((p) => p.id);
    if (recipients.length === 0) continue;
    const shares = allocate(item.price, new Array<number>(recipients.length).fill(1));
    recipients.forEach((id, idx) => {
      personItems.set(id, (personItems.get(id) ?? 0) + shares[idx]);
    });
  }

  const itemWeights = people.map((p) => Math.max(0, personItems.get(p.id) ?? 0));

  const service = input.serviceAmount ?? 0;
  const tax =
    input.taxAmount ?? (input.taxRatePct ? Math.round((subtotal * input.taxRatePct) / 100) : 0);
  const tip = input.tipAmount ?? 0;
  const rounding = input.rounding ?? 0;

  const serviceShares = allocateEven(service, n);
  const tipShares = allocateEven(tip, n);
  const taxShares = itemWeights.some((w) => w > 0)
    ? allocate(tax, itemWeights)
    : allocateEven(tax, n);
  const roundingShares = itemWeights.some((w) => w > 0)
    ? allocate(rounding, itemWeights)
    : allocateEven(rounding, n);

  const perPerson: PersonShare[] = people.map((p, idx) => {
    const itemsShare = personItems.get(p.id) ?? 0;
    const total =
      itemsShare + serviceShares[idx] + taxShares[idx] + tipShares[idx] + roundingShares[idx];
    return {
      personId: p.id,
      items: itemsShare,
      service: serviceShares[idx],
      tax: taxShares[idx],
      tip: tipShares[idx],
      rounding: roundingShares[idx],
      total,
    };
  });

  const total = subtotal + service + tax + tip + rounding;
  const summed = perPerson.reduce((s, p) => s + p.total, 0);
  if (summed !== total) {
    warnings.push(`per-person totals (${summed}) do not match bill total (${total})`);
  }

  return { perPerson, subtotal, service, tax, tip, rounding, total, warnings };
}
