import {
  runBenchmark,
  getBenchmarkStageLabel,
  normalizeBenchmarkError
} from './benchmarkController.js';

import {
  downloadBenchmarkJSON,
  downloadBenchmarkCSV
} from './benchmarkExport.js';


let detectionWorker;
let analysisWorker;

let requestId = 0;
const pending = new Map();

let benchmarkRunning = false;
let selectedFile = null;
let latestBenchmarkReport = null;


function nextId() {
  requestId += 1;
  return String(requestId);
}


function formatBytes(bytes) {
  if (!bytes) {
    return '0 B';
  }

  const units = [
    'B',
    'KB',
    'MB',
    'GB',
    'TB'
  ];

  const i = Math.min(
    Math.floor(
      Math.log(bytes) / Math.log(1024)
    ),
    units.length - 1
  );

  return `${(
    bytes /
    1024 ** i
  ).toFixed(i ? 2 : 0)} ${units[i]}`;
}


function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[c])
  );
}


function formatMs(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '—';
  }

  return `${number.toFixed(2)} ms`;
}


function formatPercent(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '—';
  }

  return `${number.toFixed(2)}%`;
}


function formatSpeedup(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '—';
  }

  return `${number.toFixed(2)}×`;
}


export function initApp(root) {

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

  root.innerHTML = `
    <main class="page">

      <header>

        <p class="eyebrow">
          PARALLEL VISION LAB · RF-DETR NANO
        </p>

        <h1>
          Parallel Vision Lab
        </h1>

        <p class="lead">
          Browser-based image analysis using RF-DETR Nano
          and a deterministic Deep Analysis Worker.
        </p>

      </header>


      <!-- ===================================================
           WORKER STATUS
           =================================================== -->

      <section class="card">

        <h2>Workers</h2>

        <div class="status-row">

          <span
            id="detectionDot"
            class="dot"
          ></span>

          <strong id="detectionStatus">
            Detection Worker starting…
          </strong>

        </div>

        <p
          id="detectionStage"
          class="muted"
        >
          Waiting for RF-DETR Nano.
        </p>


        <div class="status-row">

          <span
            id="analysisDot"
            class="dot"
          ></span>

          <strong id="analysisStatus">
            Analysis Worker starting…
          </strong>

        </div>

        <p
          id="analysisStage"
          class="muted"
        >
          Waiting for Deep Analysis Worker.
        </p>

      </section>


      <!-- ===================================================
           IMAGE INPUT
           =================================================== -->

      <section class="card">

        <h2>Image</h2>

        <input
          id="file"
          type="file"
          accept="image/png,image/jpeg,image/webp"
        />

        <div class="button-row">

          <button
            id="load"
            disabled
          >
            Load RF-DETR Nano
          </button>

          <button
            id="detect"
            disabled
          >
            Run Detection
          </button>

          <button
            id="analyse"
            disabled
          >
            Run Analysis
          </button>

        </div>


        <div
          id="imageWrap"
          class="image-wrap hidden"
        >

          <img
            id="preview"
            alt="Selected image"
          />

          <canvas
            id="overlay"
          ></canvas>

        </div>


        <div
          id="details"
          class="details"
        ></div>

      </section>


      <!-- ===================================================
           BENCHMARK
           =================================================== -->

      <section class="card">

        <h2>
          Parallel Benchmark
        </h2>

        <p class="muted">

          The benchmark performs exactly:

          <strong>
            1 warmup
          </strong>

          followed by

          <strong>
            3 serial
          </strong>

          and

          <strong>
            3 parallel
          </strong>

          measured runs.

          Model initialization is excluded.

        </p>


        <div class="button-row">

          <button
            id="benchmark"
            disabled
          >
            Run Full Benchmark
          </button>

          <button
            id="exportJson"
            disabled
          >
            Export JSON
          </button>

          <button
            id="exportCsv"
            disabled
          >
            Export CSV
          </button>

        </div>


        <div
          id="benchmarkStatus"
          class="details"
        >
          Benchmark not started.
        </div>


        <div
          id="benchmarkProgress"
          class="details hidden"
        ></div>

      </section>


      <!-- ===================================================
           BENCHMARK RESULTS
           =================================================== -->

      <section
        id="benchmarkResults"
        class="card hidden"
      >

        <h2>
          Benchmark Results
        </h2>


        <div
          id="benchmarkSummary"
        ></div>


        <div
          id="benchmarkValidation"
        ></div>


        <h3>
          Measured Runs
        </h3>


        <div
          id="benchmarkTable"
        ></div>

      </section>


      <!-- ===================================================
           ANALYSIS RESULT
           =================================================== -->

      <section
        id="analysisResults"
        class="card hidden"
      >

        <h2>
          Deep Analysis
        </h2>

        <div
          id="analysisSummary"
        ></div>

        <div
          id="palette"
        ></div>

      </section>


      <!-- ===================================================
           RUNTIME LOG
           =================================================== -->

      <section class="card">

        <h2>
          Runtime log
        </h2>

        <pre id="log"></pre>

      </section>


      <!-- ===================================================
           ERRORS
           =================================================== -->

      <section
        id="errorCard"
        class="card error-card hidden"
      >

        <h2>
          Runtime Error
        </h2>

        <pre id="errorDetails"></pre>

      </section>


      <!-- ===================================================
           NOTE
           =================================================== -->

      <section class="card note">

        <strong>
          Benchmark integrity
        </strong>

        <p>

          Model initialization is excluded from benchmark
          timings. Serial and parallel executions use the
          same image and the same computational workers.
          Results are validated before performance metrics
          are reported.

        </p>

      </section>

    </main>
  `;


  /*
   * ---------------------------------------------------------
   * DOM REFERENCES
   * ---------------------------------------------------------
   */

  const logEl =
    root.querySelector('#log');

  const fileEl =
    root.querySelector('#file');

  const loadBtn =
    root.querySelector('#load');

  const detectBtn =
    root.querySelector('#detect');

  const analyseBtn =
    root.querySelector('#analyse');

  const benchmarkBtn =
    root.querySelector('#benchmark');

  const exportJsonBtn =
    root.querySelector('#exportJson');

  const exportCsvBtn =
    root.querySelector('#exportCsv');

  const preview =
    root.querySelector('#preview');

  const overlay =
    root.querySelector('#overlay');

  const imageWrap =
    root.querySelector('#imageWrap');

  const details =
    root.querySelector('#details');

  const analysisResults =
    root.querySelector('#analysisResults');

  const analysisSummary =
    root.querySelector('#analysisSummary');

  const palette =
    root.querySelector('#palette');

  const benchmarkResults =
    root.querySelector('#benchmarkResults');

  const benchmarkSummary =
    root.querySelector('#benchmarkSummary');

  const benchmarkValidation =
    root.querySelector('#benchmarkValidation');

  const benchmarkTable =
    root.querySelector('#benchmarkTable');

  const benchmarkStatus =
    root.querySelector('#benchmarkStatus');

  const benchmarkProgress =
    root.querySelector('#benchmarkProgress');

  const errorCard =
    root.querySelector('#errorCard');

  const errorDetails =
    root.querySelector('#errorDetails');

  const detectionStatus =
    root.querySelector('#detectionStatus');

  const detectionStage =
    root.querySelector('#detectionStage');

  const detectionDot =
    root.querySelector('#detectionDot');

  const analysisStatus =
    root.querySelector('#analysisStatus');

  const analysisStage =
    root.querySelector('#analysisStage');

  const analysisDot =
    root.querySelector('#analysisDot');


  /*
   * ---------------------------------------------------------
   * LOGGING
   * ---------------------------------------------------------
   */

  function log(message) {
    const time =
      new Date().toLocaleTimeString();

    logEl.textContent +=
      `[${time}] ${message}\n`;

    logEl.scrollTop =
      logEl.scrollHeight;
  }


  /*
   * ---------------------------------------------------------
   * STATUS HELPERS
   * ---------------------------------------------------------
   */

  function setDetectionStatus(
    message,
    ready = false
  ) {
    detectionStage.textContent =
      message;

    if (ready) {
      detectionStatus.textContent =
        'RF-DETR Nano ready';

      detectionDot.classList.add(
        'ready'
      );
    }
  }


  function setAnalysisStatus(
    message,
    ready = false
  ) {
    analysisStage.textContent =
      message;

    if (ready) {
      analysisStatus.textContent =
        'Deep Analysis Worker ready';

      analysisDot.classList.add(
        'ready'
      );
    }
  }


  /*
   * ---------------------------------------------------------
   * ERROR DISPLAY
   * ---------------------------------------------------------
   */

  function showWorkerError(
    error,
    workerName
  ) {
    const text = [
      `${workerName} ERROR`,
      '',
      `Name: ${error?.name || 'Error'}`,
      `Message: ${
        error?.message ||
        'Unknown error'
      }`,
      `Stage: ${
        error?.stage ||
        'Unknown'
      }`,
      `Request: ${
        error?.requestType ||
        'Unknown'
      }`,
      '',
      error?.stack
        ? `Stack:\n${error.stack}`
        : 'Stack: unavailable'
    ].join('\n');


    errorCard.classList.remove(
      'hidden'
    );

    errorDetails.textContent =
      text;

    log(text);


    if (
      workerName ===
      'Detection Worker'
    ) {
      detectionStatus.textContent =
        'Detection Worker error';

      detectionDot.classList.remove(
        'ready'
      );
    }


    if (
      workerName ===
      'Deep Analysis Worker'
    ) {
      analysisStatus.textContent =
        'Analysis Worker error';

      analysisDot.classList.remove(
        'ready'
      );
    }
  }


  /*
   * ---------------------------------------------------------
   * GENERIC WORKER REQUEST
   * ---------------------------------------------------------
   */

  function request(
    targetWorker,
    type,
    payload = {}
  ) {
    const id =
      nextId();


    return new Promise(
      (resolve, reject) => {

        pending.set(
          id,
          {
            resolve,
            reject,
            worker: targetWorker
          }
        );


        const transfer =
          payload.buffer
            ? [payload.buffer]
            : [];


        targetWorker.postMessage(
          {
            type,
            id,
            payload
          },
          transfer
        );

      }
    );
  }


  /*
   * ---------------------------------------------------------
   * SHARED WORKER MESSAGE HANDLER
   * ---------------------------------------------------------
   */

  function handleWorkerMessage(
    event,
    workerName
  ) {
    const msg =
      event.data || {};


    /*
     * Worker boot
     */

    if (
      msg.type ===
      'boot'
    ) {
      const message =
        msg.payload?.message ||
        `${workerName} booted.`;

      log(message);


      if (
        workerName ===
        'Detection Worker'
      ) {
        detectionStatus.textContent =
          'Detection Worker online';
      }


      if (
        workerName ===
        'Deep Analysis Worker'
      ) {
        analysisStatus.textContent =
          'Analysis Worker online';
      }


      return;
    }


    /*
     * Status
     */

    if (
      msg.type ===
      'status'
    ) {
      const message =
        msg.payload?.message ||
        'Worker status update.';


      log(
        `${workerName}: ${message}`
      );


      if (
        workerName ===
        'Detection Worker'
      ) {
        setDetectionStatus(
          message
        );
      }


      if (
        workerName ===
        'Deep Analysis Worker'
      ) {
        setAnalysisStatus(
          message
        );
      }


      return;
    }


    /*
     * Model progress
     */

    if (
      msg.type ===
      'progress'
    ) {
      const progress =
        msg.payload;


      const value =
        progress?.progress != null
          ? Number(
              progress.progress
            ).toFixed(1)
          : null;


      log(
        `${workerName}: Model progress` +
        (
          value != null
            ? ` ${value}%`
            : ''
        )
      );


      return;
    }


    /*
     * Worker error
     */

    if (
      msg.type ===
      'error'
    ) {
      const pendingRequest =
        pending.get(
          msg.id
        );


      pending.delete(
        msg.id
      );


      const error =
        msg.error || {};


      showWorkerError(
        error,
        workerName
      );


      pendingRequest?.reject(
        new Error(
          error.message ||
          'Worker request failed.'
        )
      );


      return;
    }


    /*
     * Worker result
     */

    if (
      msg.type ===
      'result'
    ) {
      const pendingRequest =
        pending.get(
          msg.id
        );


      pending.delete(
        msg.id
      );


      const payload =
        msg.payload || {};


      /*
       * Detection worker ready
       */

      if (
        workerName ===
          'Detection Worker' &&
        payload.stage ===
          'ready'
      ) {
        const loadMs =
          Number(
            payload.loadMs || 0
          );


        log(
          `RF-DETR Nano ready in ${loadMs.toFixed(0)} ms`
        );


        setDetectionStatus(
          'RF-DETR Nano ready.',
          true
        );


        loadBtn.disabled =
          true;


        updateButtonState();
      }


      /*
       * Detection result
       */

      if (
        workerName ===
          'Detection Worker' &&
        payload.stage ===
          'detection'
      ) {
        renderDetections(
          payload.detections || [],
          Number(
            payload.inferenceMs || 0
          )
        );
      }


      /*
       * Analysis result
       */

      if (
        workerName ===
          'Deep Analysis Worker' &&
        payload.stage ===
          'analysis-complete'
      ) {
        renderAnalysis(
          payload.result
        );


        setAnalysisStatus(
          'Deep image analysis complete.',
          true
        );
      }


      pendingRequest?.resolve(
        payload
      );
    }
  }


  /*
   * ---------------------------------------------------------
   * CREATE WORKERS
   * ---------------------------------------------------------
   */

  detectionWorker =
    new Worker(
      new URL(
        './detection.worker.js',
        import.meta.url
      ),
      {
        type: 'module'
      }
    );


  analysisWorker =
    new Worker(
      new URL(
        './workers/analysis.worker.js',
        import.meta.url
      ),
      {
        type: 'module'
      }
    );


  /*
   * ---------------------------------------------------------
   * WORKER MESSAGE HANDLERS
   * ---------------------------------------------------------
   */

  detectionWorker.onmessage =
    (event) => {
      handleWorkerMessage(
        event,
        'Detection Worker'
      );
    };


  analysisWorker.onmessage =
    (event) => {
      handleWorkerMessage(
        event,
        'Deep Analysis Worker'
      );
    };


  /*
   * ---------------------------------------------------------
   * BROWSER WORKER ERRORS
   * ---------------------------------------------------------
   */

  detectionWorker.onerror =
    (event) => {

      const error = {
        name:
          'BrowserWorkerError',

        message:
          event.message ||
          'The browser reported an unknown Detection Worker error.',

        stage:
          'Browser Worker runtime',

        requestType:
          'unknown',

        stack:
          null,

        file:
          event.filename ||
          '(unknown)',

        line:
          event.lineno ??
          '(unknown)',

        column:
          event.colno ??
          '(unknown)'
      };


      showWorkerError(
        error,
        'Detection Worker'
      );


      log(
        [
          'Detection Worker browser error:',
          `file=${error.file}`,
          `line=${error.line}`,
          `column=${error.column}`
        ].join('\n')
      );
    };


  analysisWorker.onerror =
    (event) => {

      const error = {
        name:
          'BrowserWorkerError',

        message:
          event.message ||
          'The browser reported an unknown Deep Analysis Worker error.',

        stage:
          'Browser Worker runtime',

        requestType:
          'unknown',

        stack:
          null,

        file:
          event.filename ||
          '(unknown)',

        line:
          event.lineno ??
          '(unknown)',

        column:
          event.colno ??
          '(unknown)'
      };


      showWorkerError(
        error,
        'Deep Analysis Worker'
      );


      log(
        [
          'Deep Analysis Worker browser error:',
          `file=${error.file}`,
          `line=${error.line}`,
          `column=${error.column}`
        ].join('\n')
      );
    };


  /*
   * ---------------------------------------------------------
   * FILE SELECTION
   * ---------------------------------------------------------
   */

  fileEl.addEventListener(
    'change',
    () => {

      const file =
        fileEl.files?.[0];


      if (!file) {
        selectedFile = null;
        updateButtonState();
        return;
      }


      selectedFile =
        file;


      /*
       * Clear previous errors.
       */

      errorCard.classList.add(
        'hidden'
      );

      errorDetails.textContent =
        '';


      /*
       * Clear previous benchmark.
       */

      latestBenchmarkReport =
        null;


      benchmarkResults.classList.add(
        'hidden'
      );

      benchmarkSummary.innerHTML =
        '';

      benchmarkValidation.innerHTML =
        '';

      benchmarkTable.innerHTML =
        '';

      benchmarkStatus.textContent =
        'Benchmark not started.';


      benchmarkProgress.classList.add(
        'hidden'
      );

      exportJsonBtn.disabled =
        true;

      exportCsvBtn.disabled =
        true;


      /*
       * Clear previous analysis.
       */

      analysisResults.classList.add(
        'hidden'
      );

      analysisSummary.innerHTML =
        '';

      palette.innerHTML =
        '';


      /*
       * Image preview.
       */

      preview.src =
        URL.createObjectURL(
          file
        );


      imageWrap.classList.remove(
        'hidden'
      );


      details.textContent =
        `${file.name} · ` +
        `${file.type} · ` +
        `${formatBytes(file.size)}`;


      log(
        `Selected ${file.name} (${formatBytes(file.size)})`
      );


      updateButtonState();

    }
  );


  /*
   * ---------------------------------------------------------
   * LOAD RF-DETR
   * ---------------------------------------------------------
   */

  loadBtn.addEventListener(
    'click',
    async () => {

      loadBtn.disabled =
        true;


      try {

        await request(
          detectionWorker,
          'load'
        );

      } catch {

        loadBtn.disabled =
          false;

      }


      updateButtonState();

    }
  );


  /*
   * ---------------------------------------------------------
   * MANUAL DETECTION
   * ---------------------------------------------------------
   */

  detectBtn.addEventListener(
    'click',
    async () => {

      const file =
        selectedFile ||
        fileEl.files?.[0];


      if (!file) {
        return;
      }


      detectBtn.disabled =
        true;


      try {

        const buffer =
          await file.arrayBuffer();


        await request(
          detectionWorker,
          'detect',
          {
            buffer,

            mimeType:
              file.type,

            threshold:
              0.5
          }
        );

      } catch {

        detectBtn.disabled =
          false;

      }


      updateButtonState();

    }
  );


  /*
   * ---------------------------------------------------------
   * MANUAL ANALYSIS
   * ---------------------------------------------------------
   */

  analyseBtn.addEventListener(
    'click',
    async () => {

      const file =
        selectedFile ||
        fileEl.files?.[0];


      if (!file) {
        return;
      }


      analyseBtn.disabled =
        true;


      errorCard.classList.add(
        'hidden'
      );


      try {

        const buffer =
          await file.arrayBuffer();


        await request(
          analysisWorker,
          'analyze',
          {
            buffer,

            mimeType:
              file.type
          }
        );

      } catch {

        /*
         * Error is already displayed by
         * the worker message handler.
         */

      }


      updateButtonState();

    }
  );


  /*
   * =========================================================
   * FULL BENCHMARK
   * =========================================================
   */

  benchmarkBtn.addEventListener(
    'click',
    async () => {

      if (
        benchmarkRunning
      ) {
        return;
      }


      const file =
        selectedFile ||
        fileEl.files?.[0];


      if (!file) {
        log(
          'Benchmark cancelled: no image selected.'
        );

        return;
      }


      if (
        !detectionDot.classList.contains(
          'ready'
        )
      ) {
        log(
          'Benchmark cancelled: RF-DETR Nano is not ready.'
        );

        benchmarkStatus.textContent =
          'Load RF-DETR Nano before starting the benchmark.';

        return;
      }


      /*
       * Start benchmark state.
       */

      benchmarkRunning =
        true;

      latestBenchmarkReport =
        null;


      benchmarkBtn.disabled =
        true;

      detectBtn.disabled =
        true;

      analyseBtn.disabled =
        true;

      loadBtn.disabled =
        true;


      exportJsonBtn.disabled =
        true;

      exportCsvBtn.disabled =
        true;


      benchmarkResults.classList.add(
        'hidden'
      );


      benchmarkStatus.textContent =
        'Preparing benchmark…';


      benchmarkProgress.classList.remove(
        'hidden'
      );


      benchmarkProgress.innerHTML =
        `
          <strong>
            Benchmark starting
          </strong>
          <br>
          Warmup → 3 Serial → 3 Parallel
        `;


      errorCard.classList.add(
        'hidden'
      );


      log(
        '========================================'
      );

      log(
        'FULL BENCHMARK STARTED'
      );

      log(
        'Protocol: 1 warmup + 3 serial + 3 parallel'
      );

      log(
        'Worker count: 2'
      );

      log(
        'Model initialization excluded from measurements.'
      );

      log(
        '========================================'
      );


      try {

        /*
         * A fresh ArrayBuffer is created here.
         *
         * experimentRunner will create independent
         * copies for the workers as required.
         */

        const buffer =
          await file.arrayBuffer();


        const report =
          await runBenchmark({
            detectionWorker,
            analysisWorker,
            buffer,

            mimeType:
              file.type,

            threshold:
              0.5,

            onProgress:
              handleBenchmarkProgress
          });


        latestBenchmarkReport =
          report;


        renderBenchmarkReport(
          report
        );


        exportJsonBtn.disabled =
          false;

        exportCsvBtn.disabled =
          false;


        log(
          'FULL BENCHMARK COMPLETED'
        );

      } catch (error) {

        const normalized =
          normalizeBenchmarkError(
            error
          );


        benchmarkStatus.textContent =
          `Benchmark failed: ${normalized.message}`;


        benchmarkProgress.classList.remove(
          'hidden'
        );


        benchmarkProgress.innerHTML =
          `
            <strong>
              Benchmark failed
            </strong>

            <br>

            ${escapeHtml(
              normalized.name
            )}:

            ${escapeHtml(
              normalized.message
            )}
          `;


        log(
          `BENCHMARK ERROR — ${normalized.name}: ${normalized.message}`
        );


        showWorkerError(
          normalized,
          'Benchmark Controller'
        );

      } finally {

        benchmarkRunning =
          false;


        updateButtonState();

      }

    }
  );


  /*
   * =========================================================
   * BENCHMARK PROGRESS
   * =========================================================
   */

  function handleBenchmarkProgress(
    progress = {}
  ) {

    const stage =
      progress.stage ||
      'experiment';


    const message =
      progress.message ||
      getBenchmarkStageLabel(
        stage
      );


    benchmarkStatus.textContent =
      message;


    benchmarkProgress.classList.remove(
      'hidden'
    );


    benchmarkProgress.innerHTML =
      `
        <strong>
          ${escapeHtml(
            getBenchmarkStageLabel(
              stage
            )
          )}
        </strong>

        <br>

        ${escapeHtml(
          message
        )}
      `;


    log(
      `BENCHMARK: ${message}`
    );


    /*
     * Show more precise phase information
     * when supplied by experimentRunner.
     */

    if (
      stage ===
      'warmup'
    ) {
      benchmarkProgress.innerHTML +=
        `
          <br>
          Warmup result is excluded from
          measured statistics.
        `;
    }


    if (
      stage ===
      'serial'
    ) {
      benchmarkProgress.innerHTML +=
        `
          <br>
          Running measured serial executions.
        `;
    }


    if (
      stage ===
      'parallel'
    ) {
      benchmarkProgress.innerHTML +=
        `
          <br>
          Running concurrent worker executions.
        `;
    }


    if (
      stage ===
      'validation'
    ) {
      benchmarkProgress.innerHTML +=
        `
          <br>
          Comparing computational outputs.
        `;
    }


    if (
      stage ===
      'analysis'
    ) {
      benchmarkProgress.innerHTML +=
        `
          <br>
          Calculating measured speedup
          and efficiency.
        `;
    }


    if (
      stage ===
      'complete'
    ) {
      benchmarkProgress.innerHTML +=
        `
          <br>
          Benchmark protocol complete.
        `;
    }

  }


  /*
   * =========================================================
   * RENDER BENCHMARK REPORT
   * =========================================================
   */

  function renderBenchmarkReport(
    report
  ) {

    if (!report) {
      throw new Error(
        'Benchmark returned an empty report.'
      );
    }


    const analysis =
      report.analysis || {};


    const performance =
      analysis.performance || {};


    const validation =
      report.validation || {};


    /*
     * -------------------------------------------------------
     * Summary
     * -------------------------------------------------------
     */

    const serialMean =
      performance.serialMeanMs ??
      analysis.serial?.meanMs ??
      null;


    const parallelMean =
      performance.parallelMeanMs ??
      analysis.parallel?.meanMs ??
      null;


    const speedup =
      performance.speedup ??
      null;


    const timeSaved =
      performance.timeSavedMs ??
      null;


    const improvement =
      performance.improvementPercent ??
      null;


    const efficiency =
      performance.efficiency ??
      null;


    const interpretation =
      performance.interpretation ||
      'No interpretation available.';


    benchmarkSummary.innerHTML =
      `
        <div
          style="
            display:grid;
            grid-template-columns:
              repeat(
                auto-fit,
                minmax(150px, 1fr)
              );
            gap:12px;
            margin-bottom:20px;
          "
        >

          <div class="details">
            <strong>
              Serial Mean
            </strong>

            <br>

            ${formatMs(
              serialMean
            )}
          </div>


          <div class="details">
            <strong>
              Parallel Mean
            </strong>

            <br>

            ${formatMs(
              parallelMean
            )}
          </div>


          <div class="details">
            <strong>
              Speedup
            </strong>

            <br>

            ${formatSpeedup(
              speedup
            )}
          </div>


          <div class="details">
            <strong>
              Time Saved
            </strong>

            <br>

            ${formatMs(
              timeSaved
            )}
          </div>


          <div class="details">
            <strong>
              Improvement
            </strong>

            <br>

            ${formatPercent(
              improvement
            )}
          </div>


          <div class="details">
            <strong>
              Efficiency
            </strong>

            <br>

            ${formatPercent(
              efficiency
            )}
          </div>

        </div>


        <div class="details">

          <strong>
            Interpretation:
          </strong>

          ${escapeHtml(
            interpretation
          )}

        </div>
      `;


    /*
     * -------------------------------------------------------
     * Validation
     * -------------------------------------------------------
     */

    const validationPassed =
      validation.passed === true;


    const validationFailed =
      validation.passed === false;


    let validationTitle =
      'Validation status unavailable.';


    if (
      validationPassed
    ) {
      validationTitle =
        '✓ Serial and parallel outputs validated.';
    }


    if (
      validationFailed
    ) {
      validationTitle =
        '✗ Serial and parallel outputs did not validate.';
    }


    const validationDetails =
      Array.isArray(
        validation.errors
      )
        ? validation.errors
        : [];


    benchmarkValidation.innerHTML =
      `
        <div class="details">

          <strong>
            ${escapeHtml(
              validationTitle
            )}
          </strong>

          ${
            validationDetails.length
              ? `
                <ul>
                  ${validationDetails
                    .map(
                      (error) =>
                        `
                          <li>
                            ${escapeHtml(
                              error
                            )}
                          </li>
                        `
                    )
                    .join('')}
                </ul>
              `
              : ''
          }

        </div>
      `;


    /*
     * -------------------------------------------------------
     * Run table
     * -------------------------------------------------------
     */

    const serialRuns =
      report.serial?.runs ||
      [];


    const parallelRuns =
      report.parallel?.runs ||
      [];


    const rows = [];


    for (
      const run of serialRuns
    ) {
      rows.push({
        mode:
          'Serial',

        run:
          run.run,

        wallMs:
          run.wallMs,

        detectionMs:
          run.detection?.inferenceMs,

        analysisMs:
          run.analysis?.timings?.totalMs ??
          run.analysis?.processingMs
      });
    }


    for (
      const run of parallelRuns
    ) {
      rows.push({
        mode:
          'Parallel',

        run:
          run.run,

        wallMs:
          run.wallMs,

        detectionMs:
          run.detection?.inferenceMs,

        analysisMs:
          run.analysis?.timings?.totalMs ??
          run.analysis?.processingMs
      });
    }


    benchmarkTable.innerHTML =
      `
        <div
          style="
            overflow-x:auto;
          "
        >

          <table
            style="
              width:100%;
              border-collapse:collapse;
            "
          >

            <thead>

              <tr>

                <th
                  style="
                    text-align:left;
                    padding:8px;
                  "
                >
                  Mode
                </th>

                <th
                  style="
                    text-align:left;
                    padding:8px;
                  "
                >
                  Run
                </th>

                <th
                  style="
                    text-align:left;
                    padding:8px;
                  "
                >
                  Wall Time
                </th>

                <th
                  style="
                    text-align:left;
                    padding:8px;
                  "
                >
                  Detection
                </th>

                <th
                  style="
                    text-align:left;
                    padding:8px;
                  "
                >
                  Analysis
                </th>

              </tr>

            </thead>

            <tbody>

              ${rows
                .map(
                  (row) => `
                    <tr>

                      <td
                        style="
                          padding:8px;
                        "
                      >
                        ${escapeHtml(
                          row.mode
                        )}
                      </td>

                      <td
                        style="
                          padding:8px;
                        "
                      >
                        ${row.run}
                      </td>

                      <td
                        style="
                          padding:8px;
                        "
                      >
                        ${formatMs(
                          row.wallMs
                        )}
                      </td>

                      <td
                        style="
                          padding:8px;
                        "
                      >
                        ${formatMs(
                          row.detectionMs
                        )}
                      </td>

                      <td
                        style="
                          padding:8px;
                        "
                      >
                        ${formatMs(
                          row.analysisMs
                        )}
                      </td>

                    </tr>
                  `
                )
                .join('')}

            </tbody>

          </table>

        </div>
      `;


    /*
     * -------------------------------------------------------
     * Final state
     * -------------------------------------------------------
     */

    benchmarkStatus.textContent =
      'Benchmark completed successfully.';


    benchmarkProgress.classList.remove(
      'hidden'
    );


    benchmarkProgress.innerHTML =
      `
        <strong>
          Benchmark Complete
        </strong>

        <br>

        1 warmup + 3 serial + 3 parallel runs
        completed.

        <br>

        Validation:
        ${
          validationPassed
            ? 'PASSED'
            : validationFailed
              ? 'FAILED'
              : 'UNAVAILABLE'
        }
      `;


    benchmarkResults.classList.remove(
      'hidden'
    );

  }


  /*
   * =========================================================
   * EXPORT JSON
   * =========================================================
   */

  exportJsonBtn.addEventListener(
    'click',
    () => {

      if (
        !latestBenchmarkReport
      ) {
        return;
      }


      try {

        downloadBenchmarkJSON({
          experiment:
            extractExperiment(
              latestBenchmarkReport
            ),

          analysis:
            latestBenchmarkReport.analysis,

          validation:
            latestBenchmarkReport.validation,

          filename:
            createBenchmarkFilename(
              'json'
            )
        });


        log(
          'Benchmark JSON export started.'
        );

      } catch (error) {

        log(
          `JSON export failed: ${
            error.message
          }`
        );

      }

    }
  );


  /*
   * =========================================================
   * EXPORT CSV
   * =========================================================
   */

  exportCsvBtn.addEventListener(
    'click',
    () => {

      if (
        !latestBenchmarkReport
      ) {
        return;
      }


      try {

        downloadBenchmarkCSV({
          experiment:
            extractExperiment(
              latestBenchmarkReport
            ),

          analysis:
            latestBenchmarkReport.analysis,

          filename:
            createBenchmarkFilename(
              'csv'
            )
        });


        log(
          'Benchmark CSV export started.'
        );

      } catch (error) {

        log(
          `CSV export failed: ${
            error.message
          }`
        );

      }

    }
  );


  /*
   * =========================================================
   * BENCHMARK REPORT ADAPTER
   * =========================================================
   *
   * benchmarkExport expects the experiment structure,
   * while benchmarkController returns the flattened report.
   *
   * This function reconstructs only the required structure.
   *
   * No measurements are changed.
   */

  function extractExperiment(
    report
  ) {

    return {
      protocol:
        report.protocol,

      warmup:
        report.warmup,

      serial:
        report.serial,

      parallel:
        report.parallel,

      totalExperimentMs:
        report.totalExperimentMs
    };

  }


  /*
   * =========================================================
   * EXPORT FILENAME
   * =========================================================
   */

  function createBenchmarkFilename(
    extension
  ) {

    const timestamp =
      new Date()
        .toISOString()
        .replace(
          /[:.]/g,
          '-'
        );


    const baseName =
      selectedFile?.name
        ? selectedFile.name
            .replace(
              /\.[^/.]+$/,
              ''
            )
            .replace(
              /[^a-zA-Z0-9_-]+/g,
              '_'
            )
        : 'image';


    return `parallel-vision-${baseName}-${timestamp}.${extension}`;

  }


  /*
   * =========================================================
   * BUTTON STATE
   * =========================================================
   */

  function updateButtonState() {

    const hasFile =
      Boolean(
        selectedFile ||
        fileEl.files?.[0]
      );


    const detectionReady =
      detectionDot.classList.contains(
        'ready'
      );


    const analysisReady =
      analysisDot.classList.contains(
        'ready'
      );


    /*
     * During the benchmark every manual operation
     * is disabled.
     */

    if (
      benchmarkRunning
    ) {
      loadBtn.disabled =
        true;

      detectBtn.disabled =
        true;

      analyseBtn.disabled =
        true;

      benchmarkBtn.disabled =
        true;

      return;
    }


    /*
     * RF-DETR loading.
     */

    loadBtn.disabled =
      detectionReady;


    /*
     * Manual detection.
     */

    detectBtn.disabled =
      !hasFile ||
      !detectionReady;


    /*
     * Manual analysis.
     *
     * The analysis worker exists immediately after
     * initialization, so this is enabled when an image
     * is selected.
     */

    analyseBtn.disabled =
      !hasFile ||
      !analysisWorker ||
      benchmarkRunning;


    /*
     * Full benchmark requires:
     *
     * - selected image
     * - RF-DETR initialized
     * - both workers
     * - no existing benchmark
     */

    benchmarkBtn.disabled =
      !hasFile ||
      !detectionReady ||
      !analysisWorker ||
      benchmarkRunning;

  }


  /*
   * =========================================================
   * RENDER DETECTIONS
   * =========================================================
   */

  function renderDetections(
    detections,
    inferenceMs
  ) {

    const ctx =
      overlay.getContext(
        '2d'
      );


    if (!ctx) {

      log(
        'Unable to create detection overlay context.'
      );

      return;
    }


    if (
      !preview.naturalWidth ||
      !preview.naturalHeight
    ) {

      log(
        'Detection result received before image dimensions were available.'
      );

      return;
    }


    const rect =
      preview.getBoundingClientRect();


    overlay.width =
      preview.naturalWidth;

    overlay.height =
      preview.naturalHeight;


    overlay.style.width =
      `${rect.width}px`;

    overlay.style.height =
      `${rect.height}px`;


    ctx.clearRect(
      0,
      0,
      overlay.width,
      overlay.height
    );


    ctx.lineWidth =
      Math.max(
        2,
        overlay.width / 300
      );


    ctx.font =
      `${Math.max(
        14,
        overlay.width / 50
      )}px system-ui`;


    for (
      const item of detections
    ) {

      const [
        x1,
        y1,
        x2,
        y2
      ] =
        item.box
          ? [
              item.box.xmin,
              item.box.ymin,
              item.box.xmax,
              item.box.ymax
            ]
          : [
              0,
              0,
              0,
              0
            ];


      ctx.strokeRect(
        x1,
        y1,
        x2 - x1,
        y2 - y1
      );


      const label =
        `${item.label ?? 'object'} ` +
        `${(
          Number(
            item.score ?? 0
          ) * 100
        ).toFixed(1)}%`;


      ctx.fillText(
        label,
        x1 + 4,
        Math.max(
          18,
          y1 + 18
        )
      );

    }


    details.innerHTML =
      `<strong>${detections.length} detection(s)</strong>` +
      ` · ${inferenceMs.toFixed(0)} ms<br>` +

      detections
        .map(
          (d) =>
            `${escapeHtml(
              d.label ??
              'object'
            )} — ` +
            `${(
              Number(
                d.score ?? 0
              ) * 100
            ).toFixed(1)}%`
        )
        .join('<br>');


    log(
      `Detection complete: ${detections.length} object(s) in ${inferenceMs.toFixed(0)} ms`
    );


    updateButtonState();

  }


  /*
   * =========================================================
   * RENDER ANALYSIS
   * =========================================================
   */

  function renderAnalysis(
    result
  ) {

    if (!result) {

      throw new Error(
        'Analysis Worker returned an empty result.'
      );

    }


    const statistics =
      result.statistics || {};


    const exposure =
      result.exposure || {};


    const spatial =
      result.spatial || {};


    const image =
      result.image || {};


    const timings =
      result.timings || {};


    analysisSummary.innerHTML =
      `
        <div class="details">

          <strong>
            Processing:
          </strong>

          ${Number(
            timings.totalMs || 0
          ).toFixed(1)} ms

          <br>

          <strong>
            Image:
          </strong>

          ${image.originalWidth || 0}
          ×
          ${image.originalHeight || 0}

          <br>

          <strong>
            Processed:
          </strong>

          ${image.processedWidth || 0}
          ×
          ${image.processedHeight || 0}

          <br>

          <strong>
            Mean luminance:
          </strong>

          ${Number(
            statistics.meanLuminance || 0
          ).toFixed(2)}

          <br>

          <strong>
            Luminance standard deviation:
          </strong>

          ${Number(
            statistics.luminanceStdDev || 0
          ).toFixed(2)}

          <br>

          <strong>
            Entropy:
          </strong>

          ${Number(
            result.entropy || 0
          ).toFixed(4)}

          <br>

          <strong>
            Sharpness:
          </strong>

          ${Number(
            result.sharpness || 0
          ).toFixed(2)}

          <br>

          <strong>
            Exposure:
          </strong>

          ${escapeHtml(
            exposure.classification ||
            'unknown'
          )}

          <br>

          <strong>
            Center luminance:
          </strong>

          ${Number(
            spatial.centerMeanLuminance ||
            0
          ).toFixed(2)}

          <br>

          <strong>
            Outer luminance:
          </strong>

          ${Number(
            spatial.outerMeanLuminance ||
            0
          ).toFixed(2)}

        </div>
      `;


    /*
     * Palette
     */

    const colours =
      Array.isArray(
        result.colours
      )
        ? result.colours
        : [];


    palette.innerHTML =
      `
        <h3>
          Dominant Colours
        </h3>

        <div
          style="
            display:flex;
            flex-wrap:wrap;
            gap:12px;
          "
        >

          ${colours
            .map(
              (colour) =>
                `
                  <div
                    style="
                      min-width:110px;
                      border:1px solid currentColor;
                      border-radius:8px;
                      overflow:hidden;
                    "
                  >

                    <div
                      style="
                        height:60px;
                        background:${escapeHtml(
                          colour.hex
                        )};
                      "
                    ></div>

                    <div
                      style="
                        padding:8px;
                      "
                    >

                      <strong>
                        ${escapeHtml(
                          colour.hex
                        )}
                      </strong>

                      <br>

                      ${Number(
                        colour.percentage ||
                        0
                      ).toFixed(1)}%

                    </div>

                  </div>
                `
            )
            .join('')}

        </div>
      `;


    analysisResults.classList.remove(
      'hidden'
    );


    log(
      `Deep analysis complete in ${Number(
        timings.totalMs || 0
      ).toFixed(1)} ms`
    );

  }


  /*
   * ---------------------------------------------------------
   * INITIAL WORKER PINGS
   * ---------------------------------------------------------
   */

  request(
    detectionWorker,
    'ping'
  ).catch(() => {});


  request(
    analysisWorker,
    'ping'
  ).catch(() => {});


  /*
   * Allow RF-DETR to be loaded manually.
   */

  loadBtn.disabled =
    false;


  updateButtonState();

}
