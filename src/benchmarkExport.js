/*
 * Parallel Vision Lab
 * Benchmark Export
 *
 * Responsibilities:
 * - Export complete benchmark data as JSON
 * - Export measured timing data as CSV
 * - Keep exports based entirely on measured results
 *
 * This module does NOT:
 * - run workers
 * - run experiments
 * - calculate speedup
 * - modify benchmark results
 */

/*
 * ---------------------------------------------------------
 * JSON EXPORT
 * ---------------------------------------------------------
 */

export function createBenchmarkJSON({
  experiment,
  analysis,
  validation = null
}) {
  if (!experiment) {
    throw new Error(
      'Cannot export JSON: experiment data is missing.'
    );
  }

  if (!analysis) {
    throw new Error(
      'Cannot export JSON: benchmark analysis is missing.'
    );
  }

  const exportData = {
    exportVersion: '1.0',
    exportedAt: new Date().toISOString(),

    project: {
      name: 'Parallel Vision Lab',
      model: 'onnx-community/rfdetr_nano-ONNX',
      workerCount: 2,
      workers: [
        'RF-DETR Detection Worker',
        'Deep Analysis Worker'
      ]
    },

    protocol: experiment.protocol,

    warmup: experiment.warmup,

    measurements: {
      serial: experiment.serial,
      parallel: experiment.parallel
    },

    analysis,

    validation,

    totalExperimentMs:
      experiment.totalExperimentMs
  };

  return JSON.stringify(
    exportData,
    null,
    2
  );
}

/*
 * ---------------------------------------------------------
 * CSV HELPERS
 * ---------------------------------------------------------
 */

function escapeCsv(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value);

  /*
   * CSV values containing commas, quotes or newlines
   * must be surrounded by quotes.
   */
  if (
    text.includes(',') ||
    text.includes('"') ||
    text.includes('\n') ||
    text.includes('\r')
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function createCsvRow(values) {
  return values
    .map(escapeCsv)
    .join(',');
}

/*
 * ---------------------------------------------------------
 * TIMING CSV
 * ---------------------------------------------------------
 *
 * Produces a compact table suitable for:
 * - Excel
 * - Google Sheets
 * - statistical analysis
 * - project reports
 */

export function createTimingCSV({
  experiment,
  analysis
}) {
  if (!experiment) {
    throw new Error(
      'Cannot export CSV: experiment data is missing.'
    );
  }

  if (!analysis) {
    throw new Error(
      'Cannot export CSV: benchmark analysis is missing.'
    );
  }

  const rows = [];

  /*
   * Header
   */
  rows.push(
    createCsvRow([
      'Mode',
      'Run',
      'Wall Time (ms)',
      'Detection Time (ms)',
      'Analysis Time (ms)'
    ])
  );

  /*
   * Serial runs
   */
  for (const run of experiment.serial?.runs || []) {
    rows.push(
      createCsvRow([
        'Serial',
        run.run,
        run.wallMs,
        run.detection?.inferenceMs ?? '',
        run.analysis?.timings?.totalMs ??
          run.analysis?.processingMs ??
          ''
      ])
    );
  }

  /*
   * Parallel runs
   */
  for (const run of experiment.parallel?.runs || []) {
    rows.push(
      createCsvRow([
        'Parallel',
        run.run,
        run.wallMs,
        run.detection?.inferenceMs ?? '',
        run.analysis?.timings?.totalMs ??
          run.analysis?.processingMs ??
          ''
      ])
    );
  }

  /*
   * Blank line separates raw measurements from summary.
   */
  rows.push('');

  rows.push(
    createCsvRow([
      'Metric',
      'Value'
    ])
  );

  rows.push(
    createCsvRow([
      'Serial Mean (ms)',
      analysis.serial?.meanMs ?? ''
    ])
  );

  rows.push(
    createCsvRow([
      'Serial Minimum (ms)',
      analysis.serial?.minMs ?? ''
    ])
  );

  rows.push(
    createCsvRow([
      'Serial Maximum (ms)',
      analysis.serial?.maxMs ?? ''
    ])
  );

  rows.push(
    createCsvRow([
      'Serial Standard Deviation (ms)',
      analysis.serial?.standardDeviationMs ?? ''
    ])
  );

  rows.push(
    createCsvRow([
      'Parallel Mean (ms)',
      analysis.parallel?.meanMs ?? ''
    ])
  );

  rows.push(
    createCsvRow([
      'Parallel Minimum (ms)',
      analysis.parallel?.minMs ?? ''
    ])
  );

  rows.push(
    createCsvRow([
      'Parallel Maximum (ms)',
      analysis.parallel?.maxMs ?? ''
    ])
  );

  rows.push(
    createCsvRow([
      'Parallel Standard Deviation (ms)',
      analysis.parallel?.standardDeviationMs ?? ''
    ])
  );

  rows.push(
    createCsvRow([
      'Speedup',
      analysis.performance?.speedup ?? ''
    ])
  );

  rows.push(
    createCsvRow([
      'Time Saved (ms)',
      analysis.performance?.timeSavedMs ?? ''
    ])
  );

  rows.push(
    createCsvRow([
      'Improvement (%)',
      analysis.performance?.improvementPercent ?? ''
    ])
  );

  rows.push(
    createCsvRow([
      'Efficiency (%)',
      analysis.performance?.efficiency ?? ''
    ])
  );

  rows.push(
    createCsvRow([
      'Worker Count',
      analysis.performance?.workerCount ?? 2
    ])
  );

  rows.push(
    createCsvRow([
      'Interpretation',
      analysis.performance?.interpretation ?? ''
    ])
  );

  rows.push(
    createCsvRow([
      'Validation',
      analysis.validation?.passed === null
        ? 'Not available'
        : analysis.validation?.passed
          ? 'PASSED'
          : 'FAILED'
    ])
  );

  return rows.join('\n');
}

/*
 * ---------------------------------------------------------
 * COMPLETE EXPERIMENT CSV
 * ---------------------------------------------------------
 *
 * A second CSV format focused on the experimental protocol.
 *
 * This is useful for showing exactly what happened during
 * each run.
 */

export function createExperimentCSV(experiment) {
  if (!experiment) {
    throw new Error(
      'Cannot export experiment CSV: data is missing.'
    );
  }

  const rows = [];

  rows.push(
    createCsvRow([
      'Phase',
      'Run',
      'Wall Time (ms)'
    ])
  );

  /*
   * Warmup
   */
  if (experiment.warmup) {
    rows.push(
      createCsvRow([
        'Warmup',
        1,
        experiment.warmup.wallMs
      ])
    );
  }

  /*
   * Serial measurements
   */
  for (const run of experiment.serial?.runs || []) {
    rows.push(
      createCsvRow([
        'Serial',
        run.run,
        run.wallMs
      ])
    );
  }

  /*
   * Parallel measurements
   */
  for (const run of experiment.parallel?.runs || []) {
    rows.push(
      createCsvRow([
        'Parallel',
        run.run,
        run.wallMs
      ])
    );
  }

  return rows.join('\n');
}

/*
 * ---------------------------------------------------------
 * DOWNLOAD HELPER
 * ---------------------------------------------------------
 */

export function downloadTextFile(
  content,
  filename,
  mimeType = 'text/plain;charset=utf-8'
) {
  if (typeof content !== 'string') {
    throw new TypeError(
      'Download content must be a string.'
    );
  }

  if (!filename) {
    throw new Error(
      'A filename is required.'
    );
  }

  const blob = new Blob(
    [content],
    { type: mimeType }
  );

  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;

  /*
   * The anchor is temporarily attached to the document
   * for compatibility with mobile browsers.
   */
  document.body.appendChild(anchor);

  anchor.click();

  anchor.remove();

  /*
   * Give the browser a moment to start the download before
   * releasing the object URL.
   */
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/*
 * ---------------------------------------------------------
 * CONVENIENCE EXPORT FUNCTIONS
 * ---------------------------------------------------------
 */

export function downloadBenchmarkJSON({
  experiment,
  analysis,
  validation = null,
  filename = 'parallel-vision-benchmark.json'
}) {
  const json = createBenchmarkJSON({
    experiment,
    analysis,
    validation
  });

  downloadTextFile(
    json,
    filename,
    'application/json;charset=utf-8'
  );
}

export function downloadBenchmarkCSV({
  experiment,
  analysis,
  filename = 'parallel-vision-benchmark.csv'
}) {
  const csv = createTimingCSV({
    experiment,
    analysis
  });

  downloadTextFile(
    csv,
    filename,
    'text/csv;charset=utf-8'
  );
}

export function downloadExperimentCSV({
  experiment,
  filename = 'parallel-vision-experiment.csv'
}) {
  const csv = createExperimentCSV(
    experiment
  );

  downloadTextFile(
    csv,
    filename,
    'text/csv;charset=utf-8'
  );
}
