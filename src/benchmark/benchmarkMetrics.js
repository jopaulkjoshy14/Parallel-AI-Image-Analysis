/* =========================================================
   BENCHMARK METRICS
   =========================================================

   Responsible ONLY for benchmark calculations.

   Warm-up data is deliberately excluded.

   ========================================================= */

import {
  calculateSpeedup,
  calculateEfficiency
} from "../utils/performance";


function validNumber(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}


function average(values) {

  const validValues =
    values.filter(validNumber);

  if (
    validValues.length === 0
  ) {
    return null;
  }

  return (
    validValues.reduce(
      (sum, value) =>
        sum + value,
      0
    ) /
    validValues.length
  );
}


export function calculateRunMetrics(
  sequentialTime,
  parallelTime,
  workerCount
) {

  if (
    !validNumber(sequentialTime) ||
    !validNumber(parallelTime) ||
    parallelTime <= 0
  ) {

    return {
      speedup: null,
      efficiency: null
    };

  }

  const speedup =
    calculateSpeedup(
      sequentialTime,
      parallelTime
    );

  const efficiency =
    calculateEfficiency(
      speedup,
      workerCount
    );

  return {
    speedup,
    efficiency
  };
}


export function calculateBenchmarkSummary(
  runs,
  workerCount
) {

  const completedRuns =
    runs.filter(
      (run) =>
        run.status === "complete" &&
        validNumber(
          run.sequential?.totalTime
        ) &&
        validNumber(
          run.parallel?.totalTime
        )
    );


  if (
    completedRuns.length === 0
  ) {

    return {
      sequentialAverage: null,
      parallelAverage: null,
      speedup: null,
      efficiency: null
    };

  }


  const sequentialAverage =
    average(
      completedRuns.map(
        (run) =>
          run.sequential.totalTime
      )
    );


  const parallelAverage =
    average(
      completedRuns.map(
        (run) =>
          run.parallel.totalTime
      )
    );


  const metrics =
    calculateRunMetrics(
      sequentialAverage,
      parallelAverage,
      workerCount
    );


  return {
    sequentialAverage,
    parallelAverage,

    speedup:
      metrics.speedup,

    efficiency:
      metrics.efficiency
  };
}


export function calculateOperationAverages(
  runs
) {

  const operations = [
    "colourTime",
    "aiTime",
    "histogramTime",
    "statisticsTime",
    "totalTime"
  ];


  const result = {};


  for (
    const operation of operations
  ) {

    result[operation] = {
      sequential:
        average(
          runs.map(
            (run) =>
              run.sequential?.[
                operation
              ]
          )
        ),

      parallel:
        average(
          runs.map(
            (run) =>
              run.parallel?.[
                operation
              ]
          )
        )
    };

  }


  return result;
}
