/* =========================================================
   PERFORMANCE UTILITIES
   =========================================================
   Purpose:
   - Calculate speedup
   - Calculate parallel efficiency
   - Calculate averages across benchmark runs
   - Calculate min/max values
   - Keep benchmark mathematics outside App.js

   IMPORTANT:
   Warm-up measurements must NOT be passed into the
   benchmark calculations.
   ========================================================= */


/* =========================================================
   SAFE NUMBER
   ========================================================= */

function toFiniteNumber(value) {

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : null;

}


/* =========================================================
   ROUNDING
   ========================================================= */

export function roundNumber(
  value,
  decimals = 2
) {

  const number =
    toFiniteNumber(value);

  if (number === null) {
    return null;
  }

  const factor =
    10 ** decimals;

  return (
    Math.round(
      number * factor
    ) / factor
  );

}


/* =========================================================
   SPEEDUP
   =========================================================
   
   Speedup =
   
       Sequential Time
   ---------------------
       Parallel Time
   ========================================================= */

export function calculateSpeedup(
  sequentialTime,
  parallelTime
) {

  const sequential =
    toFiniteNumber(
      sequentialTime
    );

  const parallel =
    toFiniteNumber(
      parallelTime
    );


  if (
    sequential === null ||
    parallel === null ||
    parallel <= 0
  ) {

    return null;

  }


  return roundNumber(
    sequential / parallel,
    3
  );

}


/* =========================================================
   EFFICIENCY
   =========================================================
   
   Efficiency =
   
        Speedup
   ---------------- × 100
      Worker Count
   ========================================================= */

export function calculateEfficiency(
  speedup,
  workerCount
) {

  const speed =
    toFiniteNumber(
      speedup
    );

  const workers =
    toFiniteNumber(
      workerCount
    );


  if (
    speed === null ||
    workers === null ||
    workers <= 0
  ) {

    return null;

  }


  return roundNumber(
    (
      speed /
      workers
    ) * 100,
    2
  );

}


/* =========================================================
   PERFORMANCE IMPROVEMENT
   =========================================================
   
   Improvement =
   
   (Sequential - Parallel)
   ----------------------- × 100
        Sequential
   ========================================================= */

export function calculateImprovement(
  sequentialTime,
  parallelTime
) {

  const sequential =
    toFiniteNumber(
      sequentialTime
    );

  const parallel =
    toFiniteNumber(
      parallelTime
    );


  if (
    sequential === null ||
    parallel === null ||
    sequential <= 0
  ) {

    return null;

  }


  return roundNumber(
    (
      (
        sequential -
        parallel
      ) /
      sequential
    ) * 100,
    2
  );

}


/* =========================================================
   TIME DIFFERENCE
   ========================================================= */

export function calculateTimeDifference(
  sequentialTime,
  parallelTime
) {

  const sequential =
    toFiniteNumber(
      sequentialTime
    );

  const parallel =
    toFiniteNumber(
      parallelTime
    );


  if (
    sequential === null ||
    parallel === null
  ) {

    return null;

  }


  return roundNumber(
    sequential - parallel,
    3
  );

}


/* =========================================================
   AVERAGE
   =========================================================
   
   Used ONLY with actual benchmark runs.
   
   Warm-up data should never be included in the
   array passed to this function.
   ========================================================= */

export function calculateAverage(
  values
) {

  if (
    !Array.isArray(values) ||
    values.length === 0
  ) {

    return null;

  }


  const validValues =
    values
      .map(toFiniteNumber)
      .filter(
        (value) =>
          value !== null
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


  return roundNumber(
    total /
    validValues.length,
    3
  );

}


/* =========================================================
   MINIMUM
   ========================================================= */

export function calculateMinimum(
  values
) {

  if (
    !Array.isArray(values) ||
    values.length === 0
  ) {

    return null;

  }


  const validValues =
    values
      .map(toFiniteNumber)
      .filter(
        (value) =>
          value !== null
      );


  if (
    validValues.length === 0
  ) {

    return null;

  }


  return roundNumber(
    Math.min(
      ...validValues
    ),
    3
  );

}


/* =========================================================
   MAXIMUM
   ========================================================= */

export function calculateMaximum(
  values
) {

  if (
    !Array.isArray(values) ||
    values.length === 0
  ) {

    return null;

  }


  const validValues =
    values
      .map(toFiniteNumber)
      .filter(
        (value) =>
          value !== null
      );


  if (
    validValues.length === 0
  ) {

    return null;

  }


  return roundNumber(
    Math.max(
      ...validValues
    ),
    3
  );

}


/* =========================================================
   BENCHMARK SUMMARY
   =========================================================
   
   Takes RUN 1, RUN 2 and RUN 3 only.
   
   The caller should pass only real benchmark runs.
   Warm-up is intentionally excluded.
   ========================================================= */

export function calculateBenchmarkSummary(
  runs
) {

  if (
    !Array.isArray(runs) ||
    runs.length === 0
  ) {

    return {

      count: 0,

      average: null,

      minimum: null,

      maximum: null

    };

  }


  const times =
    runs
      .map(
        (run) =>
          typeof run === "object"
            ? run?.totalTime
            : run
      )
      .map(toFiniteNumber)
      .filter(
        (value) =>
          value !== null
      );


  return {

    count:
      times.length,

    average:
      calculateAverage(
        times
      ),

    minimum:
      calculateMinimum(
        times
      ),

    maximum:
      calculateMaximum(
        times
      )

  };

}


/* =========================================================
   RUN COMPARISON
   =========================================================
   
   Compares the corresponding sequential and parallel
   benchmark results for a single run.
   ========================================================= */

export function calculateRunComparison(
  sequentialTime,
  parallelTime,
  workerCount
) {

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


  const improvement =
    calculateImprovement(
      sequentialTime,
      parallelTime
    );


  const timeDifference =
    calculateTimeDifference(
      sequentialTime,
      parallelTime
    );


  return {

    sequentialTime:
      toFiniteNumber(
        sequentialTime
      ),

    parallelTime:
      toFiniteNumber(
        parallelTime
      ),

    timeDifference,

    speedup,

    efficiency,

    improvement

  };

}


/* =========================================================
   COMPLETE BENCHMARK ANALYSIS
   =========================================================
   
   Expected input:
   
   {
     sequentialRuns: [
       { totalTime: ... },
       { totalTime: ... },
       { totalTime: ... }
     ],

     parallelRuns: [
       { totalTime: ... },
       { totalTime: ... },
       { totalTime: ... }
     ],

     workerCount: 2
   }
   
   Warm-up is deliberately absent from this structure.
   ========================================================= */

export function calculateBenchmarkAnalysis({
  sequentialRuns = [],
  parallelRuns = [],
  workerCount = 2
} = {}) {

  const runCount =
    Math.min(
      sequentialRuns.length,
      parallelRuns.length
    );


  const comparisons = [];


  for (
    let index = 0;
    index < runCount;
    index++
  ) {

    const sequentialTime =
      typeof sequentialRuns[index] ===
      "object"
        ? sequentialRuns[index]?.totalTime
        : sequentialRuns[index];


    const parallelTime =
      typeof parallelRuns[index] ===
      "object"
        ? parallelRuns[index]?.totalTime
        : parallelRuns[index];


    comparisons.push({

      run:
        index + 1,

      ...calculateRunComparison(
        sequentialTime,
        parallelTime,
        workerCount
      )

    });

  }


  const sequentialSummary =
    calculateBenchmarkSummary(
      sequentialRuns
    );


  const parallelSummary =
    calculateBenchmarkSummary(
      parallelRuns
    );


  const averageSpeedup =
    calculateAverage(
      comparisons.map(
        (comparison) =>
          comparison.speedup
      )
    );


  const averageEfficiency =
    calculateAverage(
      comparisons.map(
        (comparison) =>
          comparison.efficiency
      )
    );


  const averageImprovement =
    calculateAverage(
      comparisons.map(
        (comparison) =>
          comparison.improvement
      )
    );


  return {

    runCount,

    comparisons,

    sequential:
      sequentialSummary,

    parallel:
      parallelSummary,

    averageSpeedup,

    averageEfficiency,

    averageImprovement

  };

}


/* =========================================================
   FORMAT TIME
   =========================================================
   
   Used by UI components when displaying benchmark values.
   ========================================================= */

export function formatTime(
  value
) {

  const number =
    toFiniteNumber(
      value
    );


  if (number === null) {

    return "—";

  }


  if (number < 1) {

    return `${number.toFixed(3)} ms`;

  }


  if (number < 1000) {

    return `${number.toFixed(2)} ms`;

  }


  return `${(
    number / 1000
  ).toFixed(2)} s`;

}


/* =========================================================
   FORMAT SPEEDUP
   ========================================================= */

export function formatSpeedup(
  value
) {

  const number =
    toFiniteNumber(
      value
    );


  if (number === null) {

    return "—";

  }


  return `${number.toFixed(2)}×`;

}


/* =========================================================
   FORMAT PERCENTAGE
   ========================================================= */

export function formatPercentage(
  value
) {

  const number =
    toFiniteNumber(
      value
    );


  if (number === null) {

    return "—";

  }


  return `${number.toFixed(2)}%`;

}
