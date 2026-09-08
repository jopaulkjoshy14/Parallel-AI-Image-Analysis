/*
 * Parallel Vision Lab
 * Experiment Runner
 *
 * Experimental protocol:
 *
 *   1 warmup
 *   3 measured SERIAL runs
 *   3 measured PARALLEL runs
 *
 * Warmup is excluded from all benchmark statistics.
 *
 * This module does not perform image processing.
 * It only controls the experiment and collects measurements.
 */

import {
  runSerial,
  runParallel
} from './benchmark.js';

const WARMUP_RUNS = 1;
const MEASURED_RUNS = 3;

function cloneBuffer(buffer) {
  if (!(buffer instanceof ArrayBuffer)) {
    throw new TypeError('Experiment requires an ArrayBuffer.');
  }

  return buffer.slice(0);
}

function validateExperimentInput({
  detectionWorker,
  analysisWorker,
  buffer,
  mimeType
}) {
  if (!detectionWorker) {
    throw new Error('Detection Worker is unavailable.');
  }

  if (!analysisWorker) {
    throw new Error('Deep Analysis Worker is unavailable.');
  }

  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength === 0) {
    throw new Error('Experiment received an empty image buffer.');
  }

  if (!mimeType) {
    throw new Error('Experiment requires an image MIME type.');
  }
}

/**
 * Run the complete experiment.
 *
 * Protocol:
 *
 *   Warmup
 *      ↓
 *   Serial × 3
 *      ↓
 *   Parallel × 3
 *
 * The caller can provide onProgress() to update the UI.
 */
export async function runExperiment({
  detectionWorker,
  analysisWorker,
  buffer,
  mimeType,
  threshold = 0.5,
  onProgress = () => {}
}) {
  validateExperimentInput({
    detectionWorker,
    analysisWorker,
    buffer,
    mimeType
  });

  const experimentStartedAt = performance.now();

  const report = {
    protocol: {
      warmupRuns: WARMUP_RUNS,
      measuredSerialRuns: MEASURED_RUNS,
      measuredParallelRuns: MEASURED_RUNS,
      workerCount: 2
    },

    warmup: null,

    serial: {
      runs: []
    },

    parallel: {
      runs: []
    },

    totalExperimentMs: 0
  };

  /*
   * ---------------------------------------------------------
   * WARMUP
   * ---------------------------------------------------------
   *
   * This run is intentionally not included in benchmark
   * statistics.
   *
   * It allows browser/WASM/runtime caches to settle before
   * measurements begin.
   */

  onProgress({
    phase: 'warmup',
    run: 1,
    total: WARMUP_RUNS,
    message: 'Running warmup...'
  });

  const warmupStartedAt = performance.now();

  const warmup = await runParallel({
    detectionWorker,
    analysisWorker,
    buffer: cloneBuffer(buffer),
    mimeType,
    threshold
  });

  const warmupCompletedAt = performance.now();

  report.warmup = {
    mode: 'parallel',
    wallMs: warmup.wallMs,
    controllerMs: warmupCompletedAt - warmupStartedAt
  };

  onProgress({
    phase: 'warmup-complete',
    run: 1,
    total: WARMUP_RUNS,
    wallMs: warmup.wallMs,
    message: `Warmup complete: ${warmup.wallMs.toFixed(2)} ms`
  });

  /*
   * ---------------------------------------------------------
   * SERIAL MEASUREMENTS
   * ---------------------------------------------------------
   */

  for (let run = 1; run <= MEASURED_RUNS; run += 1) {
    onProgress({
      phase: 'serial',
      run,
      total: MEASURED_RUNS,
      message: `Running serial experiment ${run}/${MEASURED_RUNS}...`
    });

    const result = await runSerial({
      detectionWorker,
      analysisWorker,
      buffer: cloneBuffer(buffer),
      mimeType,
      threshold
    });

    report.serial.runs.push({
      run,
      wallMs: result.wallMs,
      detection: result.detection,
      analysis: result.analysis
    });

    onProgress({
      phase: 'serial-complete',
      run,
      total: MEASURED_RUNS,
      wallMs: result.wallMs,
      message:
        `Serial run ${run} complete: ${result.wallMs.toFixed(2)} ms`
    });
  }

  /*
   * ---------------------------------------------------------
   * PARALLEL MEASUREMENTS
   * ---------------------------------------------------------
   */

  for (let run = 1; run <= MEASURED_RUNS; run += 1) {
    onProgress({
      phase: 'parallel',
      run,
      total: MEASURED_RUNS,
      message:
        `Running parallel experiment ${run}/${MEASURED_RUNS}...`
    });

    const result = await runParallel({
      detectionWorker,
      analysisWorker,
      buffer: cloneBuffer(buffer),
      mimeType,
      threshold
    });

    report.parallel.runs.push({
      run,
      wallMs: result.wallMs,
      detection: result.detection,
      analysis: result.analysis
    });

    onProgress({
      phase: 'parallel-complete',
      run,
      total: MEASURED_RUNS,
      wallMs: result.wallMs,
      message:
        `Parallel run ${run} complete: ${result.wallMs.toFixed(2)} ms`
    });
  }

  report.totalExperimentMs =
    performance.now() - experimentStartedAt;

  onProgress({
    phase: 'complete',
    message:
      `Experiment complete in ${report.totalExperimentMs.toFixed(2)} ms`
  });

  return report;
}

export {
  WARMUP_RUNS,
  MEASURED_RUNS
};
