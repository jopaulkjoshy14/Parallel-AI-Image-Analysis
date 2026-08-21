/* =========================================================
   BENCHMARK STATE
   =========================================================

   Responsible ONLY for benchmark data structures.

   No workers.
   No React.
   No calculations.
   No UI.

   ========================================================= */

export const RUN_COUNT = 3;

export function createEmptyRun(runNumber) {
  return {
    runNumber,

    status: "pending",

    sequential: {
      colourTime: null,
      aiTime: null,
      histogramTime: null,
      statisticsTime: null,
      totalTime: null
    },

    parallel: {
      colourTime: null,
      aiTime: null,
      histogramTime: null,
      statisticsTime: null,
      totalTime: null
    },

    speedup: null,
    efficiency: null
  };
}


export function createInitialBenchmarkState() {
  return {
    status: "idle",

    warmup: {
      status: "pending",

      sequential: {
        colourTime: null,
        aiTime: null,
        histogramTime: null,
        statisticsTime: null,
        totalTime: null
      },

      parallel: {
        colourTime: null,
        aiTime: null,
        histogramTime: null,
        statisticsTime: null,
        totalTime: null
      }
    },

    runs: Array.from(
      { length: RUN_COUNT },
      (_, index) =>
        createEmptyRun(index + 1)
    ),

    currentRun: null,

    completedRuns: 0,

    summary: {
      sequentialAverage: null,
      parallelAverage: null,
      speedup: null,
      efficiency: null
    },

    error: null
  };
}


export function resetBenchmarkState() {
  return createInitialBenchmarkState();
}
