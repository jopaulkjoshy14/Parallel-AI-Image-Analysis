let detectionWorker;
let analysisWorker;

let requestId = 0;
const pending = new Map();

function nextId() {
  requestId += 1;
  return String(requestId);
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );

  return `${(bytes / 1024 ** i).toFixed(i ? 2 : 0)} ${units[i]}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[c]));
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

        <h1>Parallel Vision Lab</h1>

        <p class="lead">
          Browser-based image analysis using RF-DETR Nano
          and a deterministic Deep Analysis Worker.
        </p>
      </header>

      <!-- Worker status -->

      <section class="card">

        <h2>Workers</h2>

        <div class="status-row">
          <span id="detectionDot" class="dot"></span>
          <strong id="detectionStatus">
            Detection Worker starting…
          </strong>
        </div>

        <p id="detectionStage" class="muted">
          Waiting for RF-DETR Nano.
        </p>

        <div class="status-row">
          <span id="analysisDot" class="dot"></span>
          <strong id="analysisStatus">
            Analysis Worker starting…
          </strong>
        </div>

        <p id="analysisStage" class="muted">
          Waiting for Deep Analysis Worker.
        </p>

      </section>

      <!-- Input -->

      <section class="card">

        <h2>Image</h2>

        <input
          id="file"
          type="file"
          accept="image/png,image/jpeg,image/webp"
        />

        <div class="button-row">

          <button id="load" disabled>
            Load RF-DETR Nano
          </button>

          <button id="detect" disabled>
            Run Detection
          </button>

          <button id="analyse" disabled>
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

          <canvas id="overlay"></canvas>
        </div>

        <div
          id="details"
          class="details"
        ></div>

      </section>

      <!-- Analysis result -->

      <section
        id="analysisResults"
        class="card hidden"
      >

        <h2>Deep Analysis</h2>

        <div id="analysisSummary"></div>

        <div id="palette"></div>

      </section>

      <!-- Runtime log -->

      <section class="card">

        <h2>Runtime log</h2>

        <pre id="log"></pre>

      </section>

      <!-- Errors -->

      <section
        id="errorCard"
        class="card error-card hidden"
      >

        <h2>Worker Error</h2>

        <pre id="errorDetails"></pre>

      </section>

      <!-- Note -->

      <section class="card note">

        <strong>Development test</strong>

        <p>
          RF-DETR model initialization is excluded from
          future benchmark timings. The model must be
          initialized before measured inference begins.
        </p>

      </section>

    </main>
  `;

  /*
   * ---------------------------------------------------------
   * DOM references
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
   * Logging
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
   * Status helpers
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
   * Error display
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
      `Message: ${error?.message || 'Unknown error'}`,
      `Stage: ${error?.stage || 'Unknown'}`,
      `Request: ${error?.requestType || 'Unknown'}`,
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
   * Generic worker request
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
        pending.set(id, {
          resolve,
          reject,
          worker: targetWorker
        });

        /*
         * IMPORTANT:
         *
         * If an ArrayBuffer is transferred, ownership moves
         * to the worker.
         *
         * The caller therefore needs to provide a separate
         * buffer when the same image is sent to both workers.
         */

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
   * Shared worker message handler
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
        (value != null
          ? ` ${value}%`
          : '')
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

        detectBtn.disabled =
          !fileEl.files?.[0];

        analyseBtn.disabled =
          !fileEl.files?.[0];
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
       * Analysis worker result
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

      /*
       * Resolve request
       */

      pendingRequest?.resolve(
        payload
      );
    }
  }

  /*
   * ---------------------------------------------------------
   * Create Detection Worker
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

  /*
   * ---------------------------------------------------------
   * Create Analysis Worker
   * ---------------------------------------------------------
   */

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
   * Detection Worker messages
   * ---------------------------------------------------------
   */

  detectionWorker.onmessage =
    (event) => {
      handleWorkerMessage(
        event,
        'Detection Worker'
      );
    };

  /*
   * ---------------------------------------------------------
   * Analysis Worker messages
   * ---------------------------------------------------------
   */

  analysisWorker.onmessage =
    (event) => {
      handleWorkerMessage(
        event,
        'Deep Analysis Worker'
      );
    };

  /*
   * ---------------------------------------------------------
   * Detection Worker browser errors
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

  /*
   * ---------------------------------------------------------
   * Analysis Worker browser errors
   * ---------------------------------------------------------
   */

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
   * File selection
   * ---------------------------------------------------------
   */

  fileEl.addEventListener(
    'change',
    () => {
      const file =
        fileEl.files?.[0];

      if (!file) {
        return;
      }

      /*
       * Clear previous error.
       */

      errorCard.classList.add(
        'hidden'
      );

      errorDetails.textContent =
        '';

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
       * Preview
       */

      preview.src =
        URL.createObjectURL(
          file
        );

      imageWrap.classList.remove(
        'hidden'
      );

      details.textContent =
        `${file.name} · ${file.type} · ${formatBytes(file.size)}`;

      /*
       * Detection and analysis
       * require a selected image.
       */

      detectBtn.disabled =
        !detectionDot.classList.contains(
          'ready'
        );

      analyseBtn.disabled =
        !analysisWorker;

      log(
        `Selected ${file.name} (${formatBytes(file.size)})`
      );
    }
  );

  /*
   * ---------------------------------------------------------
   * Load RF-DETR
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
    }
  );

  /*
   * ---------------------------------------------------------
   * Run detection
   * ---------------------------------------------------------
   */

  detectBtn.addEventListener(
    'click',
    async () => {
      const file =
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
    }
  );

  /*
   * ---------------------------------------------------------
   * Run deep analysis
   * ---------------------------------------------------------
   */

  analyseBtn.addEventListener(
    'click',
    async () => {
      const file =
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
        /*
         * Analysis gets its own ArrayBuffer.
         */

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
        analyseBtn.disabled =
          false;
      }

      analyseBtn.disabled =
        false;
    }
  );

  /*
   * ---------------------------------------------------------
   * Initial worker ping
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
   * RF-DETR can be loaded manually.
   */

  loadBtn.disabled =
    false;

  /*
   * ---------------------------------------------------------
   * Render detections
   * ---------------------------------------------------------
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

    /*
     * The preview may not have finished loading yet.
     */

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
          : [0, 0, 0, 0];

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

    detectBtn.disabled =
      false;
  }

  /*
   * ---------------------------------------------------------
   * Render analysis
   * ---------------------------------------------------------
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

    /*
     * Summary
     */

    analysisSummary.innerHTML = `
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
     * Colour palette
     */

    const colours =
      Array.isArray(
        result.colours
      )
        ? result.colours
        : [];

    palette.innerHTML = `
      <h3>Dominant Colours</h3>

      <div
        style="
          display:flex;
          flex-wrap:wrap;
          gap:12px;
        "
      >

        ${colours
          .map(
            (colour) => `
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
}
