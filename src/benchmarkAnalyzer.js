/*
 * Parallel Vision Lab
 * Benchmark Analyzer
 *
 * Converts measured benchmark runs into performance metrics.
 *
 * Important:
 * - Warmup is never included here.
 * - No performance result is hardcoded.
 * - Parallel execution is allowed to be slower.
 * - All conclusions come from measured wall-clock times.
 */

import { calculateStatistics } from './benchmark.js';

const DEFAULT_WORKER_COUNT = 2;

/*
 * ---------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------
 */

function ensureTimingArray(values, name) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(
      `${name} timing data is missing or empty.`
    );
  }

  const timings = values.map(Number);

  if (timings.some((value) => !Number.isFinite(value))) {
    throw new Error(
      `${name} contains an invalid timing value.`
    );
  }

  if (timings.some((value) => value < 0)) {
    throw new Error(
      `${name} contains a negative timing value.`
    );
  }

  return timings;
}

function round(value, decimals = 2) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

/*
 * ---------------------------------------------------------
 * Worker timing analysis
 * ---------------------------------------------------------
 *
 * Each measured run contains:
 *
 * detection.inferenceMs
 * analysis.timings.totalMs
 *
 * These values are useful for understanding the parallel
 * critical path.
 */

function extractDetectionTime(run) {
  const value = Number(
    run?.detection?.inferenceMs
  );

  return Number.isFinite(value) ? value : null;
}

function extractAnalysisTime(run) {
  /*
   * The analysis worker returns:
   *
   * analysis.timings.totalMs
   *
   * Keep a fallback for compatibility if the worker ever
   * exposes processingMs instead.
   */
  const totalMs = Number(
    run?.analysis?.timings?.totalMs
  );

  if (Number.isFinite(totalMs)) {
    return totalMs;
  }

  const processingMs = Number(
    run?.analysis?.processingMs
  );

  return Number.isFinite(processingMs)
    ? processingMs
    : null;
}

function analyseWorkerTimes(runs) {
  const detectionTimes = [];
  const analysisTimes = [];

  for (const run of runs) {
    const detectionMs = extractDetectionTime(run);
    const analysisMs = extractAnalysisTime(run);

    if (detectionMs !== null) {
      detectionTimes.push(detectionMs);
    }

    if (analysisMs !== null) {
      analysisTimes.push(analysisMs);
    }
  }

  const detection =
    detectionTimes.length > 0
      ? calculateStatistics(detectionTimes)
      : null;

  const analysis =
    analysisTimes.length > 0
      ? calculateStatistics(analysisTimes)
      : null;

  return {
    detection,
    analysis,
    detectionTimes,
    analysisTimes
  };
}

/*
 * ---------------------------------------------------------
 * Critical path
 * ---------------------------------------------------------
 *
 * For two independent tasks running simultaneously:
 *
 *     Detection ───────────────┐
 *                              │
 *                              ▼
 *                           PARALLEL
 *                              ▲
 *                              │
 *     Analysis ────────────────┘
 *
 * The longer task approximately determines the
 * computational critical path.
 *
 * NOTE:
 * Actual parallel wall time is still measured separately.
 * We do NOT replace measured wall time with this estimate.
 */

function calculateCriticalPath(workerTimes) {
  const detectionMean =
    workerTimes.detection?.mean ?? null;

  const analysisMean =
    workerTimes.analysis?.mean ?? null;

  if (
    detectionMean === null &&
    analysisMean === null
  ) {
    return {
      worker: 'unknown',
      estimatedMs: null
    };
  }

  if (
    analysisMean === null ||
    (
      detectionMean !== null &&
      detectionMean >= analysisMean
    )
  ) {
    return {
      worker: 'RF-DETR Detection Worker',
      estimatedMs: detectionMean
    };
  }

  return {
    worker: 'Deep Analysis Worker',
    estimatedMs: analysisMean
  };
}

/*
 * ---------------------------------------------------------
 * Main benchmark analysis
 * ---------------------------------------------------------
 */

export function analyseBenchmark({
  serialRuns,
  parallelRuns,
  workerCount = DEFAULT_WORKER_COUNT,
  validation = null
}) {
  if (!Array.isArray(serialRuns)) {
    throw new Error(
      'Serial benchmark runs are missing.'
    );
  }

  if (!Array.isArray(parallelRuns)) {
    throw new Error(
      'Parallel benchmark runs are missing.'
    );
  }

  if (serialRuns.length === 0) {
    throw new Error(
      'No serial benchmark measurements were recorded.'
    );
  }

  if (parallelRuns.length === 0) {
    throw new Error(
      'No parallel benchmark measurements were recorded.'
    );
  }

  if (!Number.isInteger(workerCount) || workerCount < 1) {
    throw new Error(
      'Worker count must be a positive integer.'
    );
  }

  /*
   * Only measured wall-clock times are used.
   *
   * Warmup is intentionally absent from these arrays.
   */
  const serialTimes = ensureTimingArray(
    serialRuns.map((run) => run?.wallMs),
    'Serial'
  );

  const parallelTimes = ensureTimingArray(
    parallelRuns.map((run) => run?.wallMs),
    'Parallel'
  );

  const serial = calculateStatistics(
    serialTimes
  );

  const parallel = calculateStatistics(
    parallelTimes
  );

  /*
   * -------------------------------------------------------
   * Core performance metrics
   * -------------------------------------------------------
   */

  const speedup =
    serial.mean / parallel.mean;

  const timeSavedMs =
    serial.mean - parallel.mean;

  const improvementPercent =
    (timeSavedMs / serial.mean) * 100;

  const efficiency =
    (speedup / workerCount) * 100;

  /*
   * -------------------------------------------------------
   * Interpretation
   * -------------------------------------------------------
   *
   * Small variations around 1.0x should not be described
   * as a meaningful performance difference.
   */

  let interpretation;
  let resultClass;

  if (speedup > 1.02) {
    interpretation =
      'Parallel execution was faster than serial execution.';
    resultClass = 'faster';
  } else if (speedup < 0.98) {
    interpretation =
      'Parallel execution was slower than serial execution.';
    resultClass = 'slower';
  } else {
    interpretation =
      'Serial and parallel execution had similar performance.';
    resultClass = 'similar';
  }

  /*
   * -------------------------------------------------------
   * Worker-level analysis
   * -------------------------------------------------------
   */

  const serialWorkers =
    analyseWorkerTimes(serialRuns);

  const parallelWorkers =
    analyseWorkerTimes(parallelRuns);

  const criticalPath =
    calculateCriticalPath(parallelWorkers);

  /*
   * -------------------------------------------------------
   * Validation state
   * -------------------------------------------------------
   */

  const validationPassed =
    validation === null
      ? null
      : Boolean(validation.valid);

  /*
   * -------------------------------------------------------
   * Return complete analysis
   * -------------------------------------------------------
   */

  return {
    measuredRuns: {
      serial: serialTimes.length,
      parallel: parallelTimes.length,
      total:
        serialTimes.length +
        parallelTimes.length
    },

    serial: {
      count: serial.count,
      meanMs: serial.mean,
      minMs: serial.min,
      maxMs: serial.max,
      standardDeviationMs:
        serial.standardDeviation,
      timingsMs: serialTimes
    },

    parallel: {
      count: parallel.count,
      meanMs: parallel.mean,
      minMs: parallel.min,
      maxMs: parallel.max,
      standardDeviationMs:
        parallel.standardDeviation,
      timingsMs: parallelTimes
    },

    performance: {
      speedup,
      speedupRounded: round(speedup, 3),

      timeSavedMs,
      timeSavedMsRounded:
        round(timeSavedMs, 2),

      improvementPercent,
      improvementPercentRounded:
        round(improvementPercent, 2),

      efficiency,
      efficiencyRounded:
        round(efficiency, 2),

      workerCount,

      interpretation,
      resultClass
    },

    workers: {
      serial: serialWorkers,
      parallel: parallelWorkers
    },

    criticalPath,

    validation: {
      available: validation !== null,
      passed: validationPassed,
      failureCount:
        validation?.failureCount ?? 0,
      categories:
        validation?.categories ?? []
    }
  };
}

/*
 * ---------------------------------------------------------
 * Convenience function
 * ---------------------------------------------------------
 *
 * Accepts the complete object returned by experimentRunner.
 */

export function analyseExperiment(
  experiment,
  validation = null,
  workerCount = DEFAULT_WORKER_COUNT
) {
  if (!experiment) {
    throw new Error(
      'Cannot analyse an empty experiment.'
    );
  }

  return analyseBenchmark({
    serialRuns: experiment.serial?.runs,
    parallelRuns: experiment.parallel?.runs,
    workerCount,
    validation
  });
}

/*
 * ---------------------------------------------------------
 * Human-readable summary
 * ---------------------------------------------------------
 *
 * Useful for the activity log or final benchmark card.
 */

export function createBenchmarkSummary(
  analysis
) {
  if (!analysis?.performance) {
    throw new Error(
      'Invalid benchmark analysis.'
    );
  }

  const {
    serial,
    parallel,
    performance
  } = analysis;

  return [
    `Serial mean: ${serial.meanMs.toFixed(2)} ms`,
    `Parallel mean: ${parallel.meanMs.toFixed(2)} ms`,
    `Speedup: ${performance.speedup.toFixed(3)}×`,
    `Time saved: ${performance.timeSavedMs.toFixed(2)} ms`,
    `Improvement: ${performance.improvementPercent.toFixed(2)}%`,
    `Efficiency: ${performance.efficiency.toFixed(2)}%`,
    performance.interpretation
  ].join('\n');
}
