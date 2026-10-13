/**
 * Integer money allocation.
 *
 * All money is INTEGER rupiah. Never floats. `allocate` is the ONLY rounding
 * site in the app: it distributes a pool across weighted recipients so the
 * parts always sum EXACTLY to the pool (largest-remainder / Hamilton method).
 */

/**
 * Largest-remainder allocation.
 * @param pool      integer amount to distribute
 * @param weights   non-negative integer weights (same length as recipients)
 * @returns         integer shares that sum exactly to `pool`
 *
 * Properties: zero-weight recipients never receive a remainder; works for
 * negative pools (refunds/adjustments) because floor keeps the leftover >= 0.
 */
export function allocate(pool: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return new Array<number>(n).fill(0);

  const base = new Array<number>(n).fill(0);
  const remainders: { index: number; rem: number }[] = [];
  let assigned = 0;

  for (let i = 0; i < n; i++) {
    const numerator = pool * weights[i];
    const q = Math.floor(numerator / total);
    base[i] = q;
    assigned += q;
    remainders.push({ index: i, rem: numerator - q * total });
  }

  const leftover = pool - assigned;
  // deterministic tie-break: larger remainder first, then lower index
  remainders.sort((a, b) => b.rem - a.rem || a.index - b.index);
  for (let k = 0; k < leftover && k < remainders.length; k++) {
    base[remainders[k].index] += 1;
  }
  return base;
}

/** Even split of `pool` across `n` recipients. */
export function allocateEven(pool: number, n: number): number[] {
  return allocate(pool, new Array<number>(Math.max(0, n)).fill(1));
}
