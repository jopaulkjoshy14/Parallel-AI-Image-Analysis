/* =========================================================
   PERFORMANCE FORMATTING
   =========================================================

   This file intentionally stays small.

   Benchmark calculations live in:
   benchmark/benchmarkUtils.js
   ========================================================= */


/**
 * Safely round a performance value.
 */
export function roundPerformance(
  value,
  decimals = 2
) {

  if (
    !Number.isFinite(value)
  ) {

    return null;

  }

  return Number(
    value.toFixed(
      decimals
    )
  );

}


/**
 * Format a time value.
 */
export function formatMilliseconds(
  value
) {

  if (
    !Number.isFinite(value)
  ) {

    return "—";

  }

  return `${value.toFixed(2)} ms`;

}


/**
 * Format speedup.
 */
export function formatSpeedup(
  value
) {

  if (
    !Number.isFinite(value)
  ) {

    return "—";

  }

  return `${value.toFixed(2)}×`;

}


/**
 * Format efficiency.
 */
export function formatEfficiency(
  value
) {

  if (
    !Number.isFinite(value)
  ) {

    return "—";

  }

  return `${value.toFixed(1)}%`;

}
