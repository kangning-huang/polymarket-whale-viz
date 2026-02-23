import type { PricePoint } from './types';

/**
 * Simple moving average over `windowSec` seconds.
 * Returns array aligned with prices[] — null for entries where
 * insufficient history exists for a full window.
 */
export function computeRollingAvg(prices: PricePoint[], windowSec: number): (number | null)[] {
  const result: (number | null)[] = new Array(prices.length).fill(null);
  if (prices.length === 0) return result;

  let sum = 0;
  let count = 0;
  let left = 0;

  for (let right = 0; right < prices.length; right++) {
    sum += prices[right].p;
    count++;

    // Shrink window from left if it exceeds windowSec
    while (prices[right].sec - prices[left].sec > windowSec) {
      sum -= prices[left].p;
      count--;
      left++;
    }

    // Only emit once we have at least windowSec elapsed
    if (prices[right].sec - prices[0].sec >= windowSec) {
      result[right] = sum / count;
    }
  }

  return result;
}
