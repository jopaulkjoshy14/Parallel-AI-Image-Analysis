export function calculateSpeedup(
  sequentialTime,
  parallelTime
) {
  if (!parallelTime || parallelTime <= 0) {
    return 0;
  }

  return sequentialTime / parallelTime;
}

export function calculateEfficiency(
  speedup,
  workerCount
) {
  if (!workerCount) {
    return 0;
  }

  return (
    (speedup / workerCount)
  );
}

export function formatMilliseconds(value) {
  if (value === null || value === undefined) {
    return "—";
  }

  return `${value.toFixed(2)} ms`;
}
