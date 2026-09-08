/*
 * Parallel Vision Lab
 * Benchmark Controller
 *
 * Responsibilities:
 * - Run one SERIAL experiment
 * - Run one PARALLEL experiment
 * - Measure wall-clock execution time with performance.now()
 * - Keep model initialization outside benchmark timing
 * - Preserve independent copies of the image buffer for each worker
 * - Return raw worker results plus timing information
 *
 * Computational work remains inside the two Web Workers.
 * This module only orchestrates and measures them.
 */

function now() {
  return performance.now();
}

function cloneBuffer(buffer) {
  if (!(buffer instanceof ArrayBuffer)) {
    throw new TypeError('Benchmark requires an ArrayBuffer.');
  }

  return buffer.slice(0);
}

function validateInput(buffer, mimeType) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength === 0) {
    throw new Error('Benchmark received an empty image buffer.');
  }

  if (!mimeType) {
    throw new Error('Benchmark requires the image MIME type.');
  }
}

/**
 * Run detection followed by analysis.
 *
 * This is intentionally sequential:
 *
 * Detection
 *     ↓
 * Analysis
 *
 * The analysis starts only after detection has completed.
 */
export async function runSerial({
  detectionWorker,
  analysisWorker,
  buffer,
  mimeType,
  threshold = 0.5
}) {
  validateInput(buffer, mimeType);

  const startedAt = now();

  const detectionBuffer = cloneBuffer(buffer);

  const detection = await requestWorker(
    detectionWorker,
    'detect',
    {
      buffer: detectionBuffer,
      mimeType,
      threshold
    },
    [detectionBuffer]
  );

  const analysisBuffer = cloneBuffer(buffer);

  const analysis = await requestWorker(
    analysisWorker,
    'analyze',
    {
      buffer: analysisBuffer,
      mimeType
    },
    [analysisBuffer]
  );

  const completedAt = now();

  return {
    mode: 'serial',
    wallMs: completedAt - startedAt,
    detection,
    analysis
  };
}

/**
 * Run detection and analysis concurrently.
 *
 * Both workers receive independent copies of the original
 * image buffer so transferring one buffer does not detach
 * the buffer required by the other worker.
 *
 * Detection ─────────┐
 *                    ├──→ completed
 * Analysis ──────────┘
 */
export async function runParallel({
  detectionWorker,
  analysisWorker,
  buffer,
  mimeType,
  threshold = 0.5
}) {
  validateInput(buffer, mimeType);

  const startedAt = now();

  const detectionBuffer = cloneBuffer(buffer);
  const analysisBuffer = cloneBuffer(buffer);

  const detectionPromise = requestWorker(
    detectionWorker,
    'detect',
    {
      buffer: detectionBuffer,
      mimeType,
      threshold
    },
    [detectionBuffer]
  );

  const analysisPromise = requestWorker(
    analysisWorker,
    'analyze',
    {
      buffer: analysisBuffer,
      mimeType
    },
    [analysisBuffer]
  );

  const [detection, analysis] = await Promise.all([
    detectionPromise,
    analysisPromise
  ]);

  const completedAt = now();

  return {
    mode: 'parallel',
    wallMs: completedAt - startedAt,
    detection,
    analysis
  };
}

/**
 * Send a request to a worker and wait for its response.
 *
 * The workers already use request IDs, so this helper creates
 * a temporary listener for the requested operation.
 *
 * Errors from the worker are converted into normal Error objects
 * with as much diagnostic information as possible.
 */
function requestWorker(worker, type, payload = {}, transfer = []) {
  return new Promise((resolve, reject) => {
    if (!worker) {
      reject(new Error(`Cannot send "${type}": worker is unavailable.`));
      return;
    }

    const requestId =
      `benchmark-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    function cleanup() {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      worker.removeEventListener('messageerror', handleMessageError);
    }

    function handleMessage(event) {
      const message = event.data;

      if (!message || message.id !== requestId) {
        return;
      }

      if (message.type === 'result') {
        cleanup();
        resolve(message.payload || {});
        return;
      }

      if (message.type === 'error') {
        cleanup();

        const error = message.error || {};

        const diagnostic = [
          error.name || 'WorkerError',
          error.message || 'Worker returned an unknown error.',
          error.stage ? `stage=${error.stage}` : null,
          error.requestType ? `request=${error.requestType}` : null
        ]
          .filter(Boolean)
          .join(' | ');

        reject(new Error(diagnostic));
      }
    }

    function handleError(event) {
      cleanup();

      reject(
        new Error(
          [
            'Worker execution failed',
            event?.message ? `message=${event.message}` : null,
            event?.filename ? `file=${event.filename}` : null,
            Number.isFinite(event?.lineno)
              ? `line=${event.lineno}`
              : null,
            Number.isFinite(event?.colno)
              ? `column=${event.colno}`
              : null
          ]
            .filter(Boolean)
            .join(' | ')
        )
      );
    }

    function handleMessageError() {
      cleanup();
      reject(
        new Error(
          `Worker message could not be deserialized for request "${type}".`
        )
      );
    }

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    worker.addEventListener('messageerror', handleMessageError);

    try {
      worker.postMessage(
        {
          type,
          id: requestId,
          payload
        },
        transfer
      );
    } catch (error) {
      cleanup();

      reject(
        new Error(
          `Failed to send "${type}" to worker: ${
            error?.message || String(error)
          }`
        )
      );
    }
  });
}

/**
 * Calculate basic benchmark statistics.
 *
 * This function does not decide whether parallel execution
 * is better. It only reports the measured values.
 */
export function calculateStatistics(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('Cannot calculate statistics from an empty result set.');
  }

  const numbers = values.map(Number).filter(Number.isFinite);

  if (numbers.length !== values.length) {
    throw new Error('Benchmark contains a non-numeric timing value.');
  }

  const mean =
    numbers.reduce((sum, value) => sum + value, 0) / numbers.length;

  const variance =
    numbers.reduce(
      (sum, value) => sum + (value - mean) ** 2,
      0
    ) / numbers.length;

  const standardDeviation = Math.sqrt(variance);

  return {
    count: numbers.length,
    mean,
    min: Math.min(...numbers),
    max: Math.max(...numbers),
    standardDeviation
  };
}

/**
 * Compare serial and parallel measurements.
 *
 * Worker count is exactly 2:
 *   1. RF-DETR Detection Worker
 *   2. Deep Analysis Worker
 */
export function calculateBenchmarkMetrics(
  serialTimes,
  parallelTimes,
  workerCount = 2
) {
  const serial = calculateStatistics(serialTimes);
  const parallel = calculateStatistics(parallelTimes);

  if (!Number.isFinite(serial.mean) || serial.mean <= 0) {
    throw new Error('Invalid serial benchmark mean.');
  }

  if (!Number.isFinite(parallel.mean) || parallel.mean <= 0) {
    throw new Error('Invalid parallel benchmark mean.');
  }

  const speedup = serial.mean / parallel.mean;

  const timeSavedMs = serial.mean - parallel.mean;

  const improvementPercent =
    (timeSavedMs / serial.mean) * 100;

  const efficiency =
    (speedup / workerCount) * 100;

  let interpretation;

  if (speedup > 1.02) {
    interpretation = 'Parallel execution was faster.';
  } else if (speedup < 0.98) {
    interpretation = 'Parallel execution was slower.';
  } else {
    interpretation = 'Serial and parallel execution were similar.';
  }

  return {
    serial,
    parallel,
    workerCount,
    speedup,
    timeSavedMs,
    improvementPercent,
    efficiency,
    interpretation
  };
}
