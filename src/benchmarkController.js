/*
 * Parallel Vision Lab
 * Benchmark Controller
 *
 * Responsibilities:
 * - Run the complete benchmark protocol
 * - Validate serial vs parallel outputs
 * - Analyse measured timings
 * - Return one final benchmark report
 *
 * This module does NOT:
 * - perform image processing
 * - perform AI inference
 * - create additional workers
 * - manipulate the DOM
 * - fabricate or alter benchmark measurements
 */

import {
  runExperiment
} from './experimentRunner.js';

import {
  validateExperimentResults
} from './resultValidator.js';

import {
  analyseExperiment
} from './benchmarkAnalyzer.js';


/*
 * ---------------------------------------------------------
 * CONSTANTS
 * ---------------------------------------------------------
 */

const WORKER_COUNT = 2;


/*
 * ---------------------------------------------------------
 * MAIN BENCHMARK FUNCTION
 * ---------------------------------------------------------
 */

export async function runBenchmark({
  detectionWorker,
  analysisWorker,
  buffer,
  mimeType,
  threshold = 0.5,
  onProgress = () => {}
}) {
  /*
   * Basic input validation.
   */

  if (!detectionWorker) {
    throw new Error(
      'Benchmark cannot start: Detection Worker is unavailable.'
    );
  }

  if (!analysisWorker) {
    throw new Error(
      'Benchmark cannot start: Deep Analysis Worker is unavailable.'
    );
  }

  if (!(buffer instanceof ArrayBuffer)) {
    throw new Error(
      'Benchmark cannot start: image data is not a valid ArrayBuffer.'
    );
  }

  if (!mimeType) {
    throw new Error(
      'Benchmark cannot start: image MIME type is missing.'
    );
  }


  /*
   * -------------------------------------------------------
   * STEP 1 — RUN EXPERIMENT
   * -------------------------------------------------------
   *
   * Protocol:
   *
   *   1 warmup
   *   3 serial measurements
   *   3 parallel measurements
   *
   * The experiment runner performs the actual timing.
   */

  onProgress({
    stage: 'experiment',
    message: 'Starting benchmark experiment.'
  });

  const experiment = await runExperiment({
    detectionWorker,
    analysisWorker,
    buffer,
    mimeType,
    threshold,

    onProgress
  });


  /*
   * -------------------------------------------------------
   * STEP 2 — VALIDATE RESULTS
   * -------------------------------------------------------
   *
   * Corresponding serial and parallel runs are compared.
   *
   * The benchmark remains valid only if the computational
   * outputs agree within the configured tolerances.
   */

  onProgress({
    stage: 'validation',
    message: 'Validating serial and parallel results.'
  });

  const validation = validateExperimentResults(
    experiment.serial.runs,
    experiment.parallel.runs
  );


  /*
   * -------------------------------------------------------
   * STEP 3 — ANALYSE PERFORMANCE
   * -------------------------------------------------------
   *
   * The analyzer works only from measured timings.
   *
   * Speedup:
   *
   *   Serial Mean / Parallel Mean
   *
   * Efficiency:
   *
   *   Speedup / Worker Count × 100
   *
   * No result is forced to be positive.
   */

  onProgress({
    stage: 'analysis',
    message: 'Calculating benchmark performance metrics.'
  });

  const analysis = analyseExperiment(
    experiment,
    validation,
    WORKER_COUNT
  );


  /*
   * -------------------------------------------------------
   * STEP 4 — FINAL REPORT
   * -------------------------------------------------------
   */

  const report = {
    protocol: experiment.protocol,

    warmup: experiment.warmup,

    serial: experiment.serial,

    parallel: experiment.parallel,

    validation,

    analysis,

    totalExperimentMs:
      experiment.totalExperimentMs,

    completedAt:
      new Date().toISOString()
  };


  /*
   * Final progress event.
   */

  onProgress({
    stage: 'complete',
    message: 'Benchmark completed.',
    report
  });


  return report;
}


/*
 * ---------------------------------------------------------
 * BENCHMARK STATUS HELPER
 * ---------------------------------------------------------
 *
 * Useful for the UI when displaying the current benchmark
 * phase without duplicating phase names throughout app.js.
 */

export function getBenchmarkStageLabel(stage) {
  const labels = {
    experiment: 'Running Experiment',
    warmup: 'Running Warmup',
    serial: 'Running Serial Measurements',
    parallel: 'Running Parallel Measurements',
    validation: 'Validating Results',
    analysis: 'Analysing Performance',
    complete: 'Benchmark Complete'
  };

  return labels[stage] || 'Benchmark';
}


/*
 * ---------------------------------------------------------
 * BENCHMARK SUMMARY HELPER
 * ---------------------------------------------------------
 *
 * This does not calculate new metrics.
 * It simply exposes the already calculated values in a
 * compact structure for UI components.
 */

export function getBenchmarkSummary(report) {
  if (!report) {
    return null;
  }

  const performance =
    report.analysis?.performance || {};

  const validation =
    report.validation || {};

  return {
    serialMeanMs:
      performance.serialMeanMs ??
      report.analysis?.serial?.meanMs ??
      null,

    parallelMeanMs:
      performance.parallelMeanMs ??
      report.analysis?.parallel?.meanMs ??
      null,

    speedup:
      performance.speedup ?? null,

    timeSavedMs:
      performance.timeSavedMs ?? null,

    improvementPercent:
      performance.improvementPercent ?? null,

    efficiency:
      performance.efficiency ?? null,

    interpretation:
      performance.interpretation ??
      'No interpretation available.',

    validationPassed:
      validation.passed ?? null
  };
}


/*
 * ---------------------------------------------------------
 * ERROR NORMALIZATION
 * ---------------------------------------------------------
 *
 * Converts arbitrary errors into useful UI-safe information.
 */

export function normalizeBenchmarkError(error) {
  if (!error) {
    return {
      name: 'UnknownError',
      message: 'The benchmark failed for an unknown reason.'
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name || 'Error',
      message:
        error.message ||
        'The benchmark failed without an error message.'
    };
  }

  if (typeof error === 'object') {
    return {
      name:
        error.name ||
        'BenchmarkError',

      message:
        error.message ||
        error.error ||
        JSON.stringify(error)
    };
  }

  return {
    name: 'BenchmarkError',
    message: String(error)
  };
}
