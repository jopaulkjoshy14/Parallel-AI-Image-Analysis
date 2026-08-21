/* =========================================================
   BENCHMARK UTILITIES
   =========================================================

   Responsibility:
   - Timing
   - Run summaries
   - Benchmark averages

   Warm-up measurements are deliberately excluded from
   benchmark calculations.
   ========================================================= */


/**
 * Measure an asynchronous operation.
 */
export async function measureAsync(
  operation
) {

  const start =
    performance.now();

  const result =
    await operation();

  const duration =
    performance.now() -
    start;

  return {
    result,
    duration
  };

}


/**
 * Calculate the average of benchmark runs.
 *
 * Warm-up data must never be passed to this function.
 */
export function calculateAverage(
  values
) {

  const validValues =
    values.filter(
      (value) =>
        Number.isFinite(value)
    );

  if (
    validValues.length === 0
  ) {

    return null;

  }

  const total =
    validValues.reduce(
      (
        sum,
        value
      ) =>
        sum + value,
      0
    );

  return (
    total /
    validValues.length
  );

}


/**
 * Calculate speedup.
 */
export function calculateSpeedup(
  sequentialTime,
  parallelTime
) {

  if (
    !Number.isFinite(
      sequentialTime
    ) ||
    !Number.isFinite(
      parallelTime
    ) ||
    parallelTime <= 0
  ) {

    return null;

  }

  return (
    sequentialTime /
    parallelTime
  );

}


/**
 * Calculate parallel efficiency.
 */
export function calculateEfficiency(
  speedup,
  workerCount
) {

  if (
    !Number.isFinite(speedup) ||
    !Number.isFinite(workerCount) ||
    workerCount <= 0
  ) {

    return null;

  }

  return (
    speedup /
    workerCount
  ) * 100;

}


/**
 * Format milliseconds for the UI.
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
 * Calculate the final benchmark summary.
 *
 * Only Run 1, Run 2 and Run 3 are supplied.
 * Warm-up is intentionally not accepted here.
 */
export function calculateBenchmarkSummary(
  sequentialRuns,
  parallelRuns,
  workerCount
) {

  const sequentialAverage =
    calculateAverage(
      sequentialRuns
    );

  const parallelAverage =
    calculateAverage(
      parallelRuns
    );


  const speedup =
    calculateSpeedup(
      sequentialAverage,
      parallelAverage
    );


  const efficiency =
    calculateEfficiency(
      speedup,
      workerCount
    );


  return {

    sequentialAverage,

    parallelAverage,

    speedup,

    efficiency,

    runCount:
      Math.min(
        sequentialRuns.length,
        parallelRuns.length
      )

  };

}
