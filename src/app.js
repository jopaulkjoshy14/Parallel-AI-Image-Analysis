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
let latestAnalysisResult = null;
let latestDetections = null;
let latestDetectionMs = null;
let currentPage = 'home';
let imageObjectUrl = null;

function nextId() {
  requestId += 1;
  return String(requestId);
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i ? 2 : 0)} ${units[i]}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[c]));
}

function formatMs(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(2)} ms` : '—';
}

function formatPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(2)}%` : '—';
}

function formatSpeedup(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(2)}×` : '—';
}

function getPath() {
  const hash = window.location.hash.replace(/^#/, '').replace(/^\//, '');
  return hash || 'home';
}

export function initApp(root) {
  root.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <div class="topbar-inner">
          <a class="brand" href="#/home" aria-label="Parallel Vision Lab home">
            <span class="brand-mark">PV</span>
            <span>
              <span class="brand-name">Parallel Vision Lab</span>
              <span class="brand-subtitle">Browser-based parallel image analysis</span>
            </span>
          </a>

          <nav class="desktop-nav" aria-label="Primary navigation">
            <a href="#/home" data-nav="home">Home</a>
            <a href="#/analyze" data-nav="analyze">Analyze</a>
            <a href="#/benchmark" data-nav="benchmark">Benchmark</a>
            <a href="#/about" data-nav="about">About</a>
          </nav>

          <button id="menuToggle" class="menu-toggle" type="button" aria-label="Open navigation" aria-expanded="false">☰</button>
        </div>
        <div id="mobileNav" class="mobile-nav hidden">
          <a href="#/home" data-nav="home">Home</a>
          <a href="#/analyze" data-nav="analyze">Analyze</a>
          <a href="#/benchmark" data-nav="benchmark">Benchmark</a>
          <a href="#/about" data-nav="about">About</a>
        </div>
      </header>

      <section class="system-strip">
        <div class="system-strip-inner">
          <span class="system-label">SYSTEM</span>
          <span class="system-status"><i id="headerDetectionDot" class="status-dot"></i><span id="headerDetectionStatus">RF-DETR loading</span></span>
          <span class="system-status"><i id="headerAnalysisDot" class="status-dot"></i><span id="headerAnalysisStatus">Deep analysis ready</span></span>
          <span class="system-status"><i class="status-dot ready"></i>2 computational workers</span>
        </div>
      </section>

      <main id="view" class="view"></main>

      <footer class="footer">
        <div>Parallel Vision Lab</div>
        <div>RF-DETR Nano · Web Workers · Browser AI</div>
      </footer>
    </div>
  `;

  const view = root.querySelector('#view');
  const menuToggle = root.querySelector('#menuToggle');
  const mobileNav = root.querySelector('#mobileNav');
  const headerDetectionDot = root.querySelector('#headerDetectionDot');
  const headerAnalysisDot = root.querySelector('#headerAnalysisDot');
  const headerDetectionStatus = root.querySelector('#headerDetectionStatus');
  const headerAnalysisStatus = root.querySelector('#headerAnalysisStatus');

  function log(message) {
    const logEl = root.querySelector('#log');
    if (!logEl) return;
    logEl.textContent += `[${new Date().toLocaleTimeString()}] ${message}\n`;
    logEl.scrollTop = logEl.scrollHeight;
  }

  function setPage(page) {
    currentPage = page;
    if (window.location.hash !== `#/${page}`) window.location.hash = `/${page}`;
    renderPage();
  }

  function updateNav() {
    root.querySelectorAll('[data-nav]').forEach((link) => {
      link.classList.toggle('active', link.dataset.nav === currentPage);
    });
  }

  function closeMobileNav() {
    mobileNav.classList.add('hidden');
    menuToggle.setAttribute('aria-expanded', 'false');
  }

  menuToggle.addEventListener('click', () => {
    const open = mobileNav.classList.toggle('hidden') === false;
    menuToggle.setAttribute('aria-expanded', String(open));
  });

  root.querySelectorAll('.mobile-nav a').forEach((link) => link.addEventListener('click', closeMobileNav));

  function updateHeaderStatus() {
    const detectionReady = headerDetectionDot.classList.contains('ready');
    headerDetectionStatus.textContent = detectionReady ? 'RF-DETR Nano ready' : 'RF-DETR loading';
    headerDetectionDot.classList.toggle('ready', detectionReady);
    headerAnalysisStatus.textContent = analysisWorker ? 'Deep analysis ready' : 'Deep analysis loading';
    headerAnalysisDot.classList.toggle('ready', Boolean(analysisWorker));
  }

  function showError(message, name = 'Application Error') {
    const errorCard = root.querySelector('#errorCard');
    if (!errorCard) return;
    errorCard.classList.remove('hidden');
    errorCard.innerHTML = `<div class="error-icon">!</div><div><strong>${escapeHtml(name)}</strong><p>${escapeHtml(message)}</p></div>`;
  }

  function clearError() {
    const errorCard = root.querySelector('#errorCard');
    if (errorCard) {
      errorCard.classList.add('hidden');
      errorCard.innerHTML = '';
    }
  }

  function createWorkerStatusCard() {
    return `
      <div class="worker-grid">
        <div class="worker-card">
          <div class="worker-icon detection-icon">AI</div>
          <div class="worker-copy"><div class="worker-title">RF-DETR Nano</div><div id="detectionStage" class="worker-stage">Initializing model…</div></div>
          <span id="detectionDot" class="status-dot"></span>
        </div>
        <div class="worker-card">
          <div class="worker-icon analysis-icon">DA</div>
          <div class="worker-copy"><div class="worker-title">Deep Analysis Worker</div><div id="analysisStage" class="worker-stage">Waiting for image input.</div></div>
          <span id="analysisDot" class="status-dot ready"></span>
        </div>
      </div>`;
  }

  function renderHome() {
    view.innerHTML = `
      <section class="hero-section">
        <div class="hero-copy">
          <div class="eyebrow">PARALLEL COMPUTING · BROWSER AI</div>
          <h1>Parallel Vision<br><span>Lab</span></h1>
          <p class="hero-lead">Explore AI-powered image analysis and see how independent workloads behave when executed serially versus concurrently in the browser.</p>
          <div class="hero-actions">
            <a class="primary-btn" href="#/analyze">Analyze an Image <span>→</span></a>
            <a class="secondary-btn" href="#/benchmark">Run Benchmark <span>↗</span></a>
          </div>
          <div class="hero-meta"><span>Local browser processing</span><span>·</span><span>2 Web Workers</span><span>·</span><span>Actual measurements</span></div>
        </div>
        <div class="hero-visual">
          <div class="visual-glow"></div>
          <div class="architecture-card">
            <div class="arch-header"><span>LIVE ARCHITECTURE</span><span class="live-pill"><i class="status-dot ready"></i> READY</span></div>
            <div class="arch-flow">
              <div class="arch-node input-node"><span>IMG</span><small>Image</small></div>
              <div class="flow-line"></div>
              <div class="arch-workers">
                <div class="arch-node"><span>AI</span><small>RF-DETR</small></div>
                <div class="arch-node"><span>DA</span><small>Deep Analysis</small></div>
              </div>
              <div class="flow-line"></div>
              <div class="arch-node result-node"><span>✓</span><small>Validated</small></div>
            </div>
            <div class="arch-caption">Independent workloads can execute concurrently.</div>
          </div>
        </div>
      </section>

      <section class="home-section">
        <div class="section-heading"><div><span class="section-kicker">WORKSPACE</span><h2>Choose your experiment</h2></div><p>Start with an image or measure the execution model.</p></div>
        <div class="feature-grid">
          <a class="feature-card feature-card-accent" href="#/analyze"><div class="feature-number">01</div><div class="feature-icon">⌁</div><h3>Analyze Image</h3><p>Run RF-DETR Nano detection and deterministic deep image analysis in your browser.</p><span class="feature-link">Open analysis <b>→</b></span></a>
          <a class="feature-card" href="#/benchmark"><div class="feature-number">02</div><div class="feature-icon">↯</div><h3>Benchmark</h3><p>Compare one warmup, three serial runs and three parallel runs using measured wall-clock timings.</p><span class="feature-link">Start experiment <b>→</b></span></a>
          <a class="feature-card" href="#/about"><div class="feature-number">03</div><div class="feature-icon">◌</div><h3>How It Works</h3><p>Understand the two-worker architecture, validation process and performance methodology.</p><span class="feature-link">Explore architecture <b>→</b></span></a>
        </div>
      </section>

      <section class="home-section compact-section">
        <div class="section-heading"><div><span class="section-kicker">SYSTEM STATUS</span><h2>Built for real browser execution</h2></div></div>
        ${createWorkerStatusCard()}
      </section>
    `;
    bindPageLoglessStatus();
  }

  function renderAnalyze() {
    view.innerHTML = `
      <section class="page-heading"><div><span class="section-kicker">WORKSPACE / ANALYZE</span><h1>Analyze an image</h1><p>Choose an image and run the browser-based AI and deep analysis workloads.</p></div><span class="page-badge">LOCAL PROCESSING</span></section>
      <div class="workspace-grid">
        <section class="panel upload-panel">
          <div class="panel-heading"><div><span class="panel-kicker">INPUT</span><h2>Image source</h2></div></div>
          <label id="dropZone" class="drop-zone" for="file">
            <input id="file" type="file" accept="image/png,image/jpeg,image/webp" />
            <span class="upload-icon">↑</span><strong>Choose an image</strong><span>PNG, JPG or WebP</span><small>Click to browse your device</small>
          </label>
          <div id="fileInfo" class="file-info hidden"></div>
          <div class="button-stack">
            <button id="load" class="secondary-btn full" type="button" disabled>Load RF-DETR Nano</button>
            <div class="split-buttons"><button id="detect" class="primary-btn full" type="button" disabled>Run Detection</button><button id="analyse" class="secondary-btn full" type="button" disabled>Run Deep Analysis</button></div>
          </div>
          <div class="worker-mini-status">${createWorkerStatusCard()}</div>
        </section>

        <section class="panel preview-panel">
          <div class="panel-heading"><div><span class="panel-kicker">PREVIEW</span><h2>Selected image</h2></div><span id="previewMeta" class="panel-meta">No image selected</span></div>
          <div id="imageWrap" class="image-wrap empty-state"><div><span class="empty-icon">IMG</span><p>Your selected image will appear here.</p></div><img id="preview" alt="Selected image" /><canvas id="overlay"></canvas></div>
          <div id="details" class="preview-details">Select an image to begin.</div>
        </section>
      </div>
      <section id="errorCard" class="inline-error hidden"></section>
      <section class="panel integrity-panel"><div class="integrity-icon">✓</div><div><strong>Browser-first processing</strong><p>The image is processed by the application's browser workers. The benchmark excludes model initialization and uses the same computational workers for serial and parallel execution.</p></div></section>
    `;
    bindAnalyzePage();
  }

  function renderBenchmark() {
    view.innerHTML = `
      <section class="page-heading"><div><span class="section-kicker">EXPERIMENT / BENCHMARK</span><h1>Parallel benchmark</h1><p>Measure serial and concurrent execution using a fixed, reproducible protocol.</p></div><span class="page-badge">1 + 3 + 3 RUNS</span></section>
      <div class="benchmark-layout">
        <section class="panel benchmark-setup">
          <div class="panel-heading"><div><span class="panel-kicker">EXPERIMENT SETUP</span><h2>Before you run</h2></div></div>
          <div class="protocol-visual"><div><b>01</b><span>Warmup</span><small>excluded</small></div><i>→</i><div><b>03</b><span>Serial</span><small>measured</small></div><i>→</i><div><b>03</b><span>Parallel</span><small>measured</small></div></div>
          <div class="setup-list"><div><span>Computational workers</span><strong>2</strong></div><div><span>Model initialization</span><strong>Excluded</strong></div><div><span>Timing source</span><strong>performance.now()</strong></div><div><span>Validation</span><strong>Before metrics</strong></div></div>
          <label id="benchmarkDropZone" class="benchmark-file" for="benchmarkFile">
            <input id="benchmarkFile" type="file" accept="image/png,image/jpeg,image/webp" />
            <span class="benchmark-upload-icon" aria-hidden="true">↑</span>
            <span class="benchmark-upload-label">Benchmark image</span>
            <strong>Choose an image</strong>
            <small>PNG, JPG or WebP · click to browse</small>
            <span id="benchmarkFileName" class="benchmark-file-name">No image selected</span>
          </label>
          <button id="benchmark" class="primary-btn full benchmark-start" type="button" disabled>Run Full Benchmark <span>→</span></button>
        </section>
        <section class="panel benchmark-live">
          <div class="panel-heading"><div><span class="panel-kicker">LIVE EXPERIMENT</span><h2>Execution monitor</h2></div><span id="benchmarkStatePill" class="state-pill">IDLE</span></div>
          <div class="live-steps"><div id="stepWarmup" class="live-step"><span>01</span><div><strong>Warmup</strong><small>1 execution</small></div></div><div id="stepSerial" class="live-step"><span>02</span><div><strong>Serial</strong><small>3 measured runs</small></div></div><div id="stepParallel" class="live-step"><span>03</span><div><strong>Parallel</strong><small>3 measured runs</small></div></div><div id="stepValidation" class="live-step"><span>04</span><div><strong>Validation</strong><small>Compare outputs</small></div></div></div>
          <div class="benchmark-progress"><div class="progress-track"><div id="benchmarkProgressBar" class="progress-fill" style="width:0%"></div></div><div class="progress-caption"><span id="benchmarkStatus">Waiting for an image.</span><span id="benchmarkPercent">0%</span></div></div>
          <div id="benchmarkProgress" class="live-message">Select an image and start the experiment.</div>
          <div id="benchmarkLog" class="mini-log"></div>
        </section>
      </div>
      <section id="errorCard" class="inline-error hidden"></section>
    `;
    bindBenchmarkPage();
  }

  function renderAbout() {
    view.innerHTML = `
      <section class="about-hero"><span class="section-kicker">ABOUT THE PROJECT</span><h1>Understand the system<br><span>behind the result.</span></h1><p>Parallel Vision Lab is an experimental browser application built to demonstrate task parallelism using AI object detection and deterministic image analysis.</p></section>
      <section class="about-grid">
        <article class="about-card wide"><span class="panel-kicker">01 · PURPOSE</span><h2>A practical parallel-computing laboratory</h2><p>The application decomposes image processing into two independent workloads. RF-DETR Nano performs AI object detection while a dedicated worker performs deterministic deep image analysis. The same workloads are then compared under serial and concurrent execution.</p></article>
        <article class="about-card"><span class="panel-kicker">02 · AI WORKER</span><h2>RF-DETR Nano</h2><p>Object detection runs inside a dedicated Web Worker using Transformers.js and ONNX Runtime Web.</p></article>
        <article class="about-card"><span class="panel-kicker">03 · ANALYSIS WORKER</span><h2>Deep Analysis</h2><p>Dominant colours, image statistics, entropy, sharpness, exposure and spatial luminance are computed deterministically.</p></article>
      </section>
      <section class="architecture-section panel"><div class="panel-heading"><div><span class="panel-kicker">04 · ARCHITECTURE</span><h2>Two workers, one validated result</h2></div></div><div class="large-architecture"><div class="large-node source">IMAGE<br><small>Browser input</small></div><div class="large-branch"><div class="large-node">RF-DETR NANO<br><small>Detection Worker</small></div><div class="large-node">DEEP ANALYSIS<br><small>Analysis Worker</small></div></div><div class="large-node result">VALIDATION<br><small>Equivalent outputs</small></div></div></section>
      <section class="about-grid lower"><article class="about-card"><span class="panel-kicker">05 · BENCHMARK</span><h2>Measured, not simulated</h2><p>Every experiment uses one warmup followed by three measured serial and three measured parallel executions. Timing is taken with <code>performance.now()</code>.</p></article><article class="about-card"><span class="panel-kicker">06 · INTEGRITY</span><h2>Correctness before speed</h2><p>Serial and parallel outputs are validated before performance metrics are reported. The application does not fabricate delays or force a positive speedup.</p></article><article class="about-card wide stack-card"><span class="panel-kicker">07 · TECHNOLOGY</span><div class="tech-pills"><span>React</span><span>Vite</span><span>Web Workers</span><span>Transformers.js</span><span>RF-DETR Nano</span><span>ONNX Runtime Web</span><span>WebAssembly</span><span>Canvas</span></div></article></section>
      <section class="about-note"><strong>Project philosophy</strong><p>A parallel system should be measured honestly. If concurrency is faster, the benchmark reports the gain. If it is slower, the benchmark reports that too.</p></section>
    `;
  }

  function renderResults() {
    const hasBenchmark = Boolean(latestBenchmarkReport);
    const hasAnalysis = Boolean(latestAnalysisResult || latestDetections);
    if (!hasBenchmark && !hasAnalysis) {
      view.innerHTML = `<section class="result-empty"><div class="result-empty-icon">?</div><span class="section-kicker">NO RESULT YET</span><h1>Your results will appear here.</h1><p>Complete an image analysis or benchmark experiment and you will be brought back to this page automatically.</p><div class="hero-actions"><a class="primary-btn" href="#/analyze">Analyze Image →</a><a class="secondary-btn" href="#/benchmark">Run Benchmark →</a></div></section>`;
      return;
    }

    if (hasBenchmark) renderBenchmarkResults();
    else renderAnalysisResults();
  }

  function renderAnalysisResults() {
    const file = selectedFile;
    const result = latestAnalysisResult;
    const detections = latestDetections || [];
    const image = result?.image || {};
    const statistics = result?.statistics || {};
    const exposure = result?.exposure || {};
    const spatial = result?.spatial || {};
    const colours = Array.isArray(result?.colours) ? result.colours : [];
    const detectionBlock = latestDetections ? `<div class="result-section"><div class="result-section-title"><span>OBJECT DETECTION</span><small>${formatMs(latestDetectionMs)}</small></div><div class="detection-list">${detections.length ? detections.map((d) => `<div class="detection-item"><strong>${escapeHtml(d.label ?? 'object')}</strong><span>${(Number(d.score ?? 0) * 100).toFixed(1)}%</span></div>`).join('') : '<div class="muted-row">No detections above the configured threshold.</div>'}</div></div>` : '';

    view.innerHTML = `
      <section class="result-header"><div><span class="section-kicker">RESULT / IMAGE ANALYSIS</span><h1>Analysis results</h1><p>${escapeHtml(file?.name || 'Selected image')} · browser execution complete</p></div><div class="result-header-actions"><a class="secondary-btn" href="#/analyze">Analyze another</a><a class="ghost-btn" href="#/home">Home</a></div></section>
      <section class="result-hero-grid">
        <div class="result-image-card panel"><div class="result-image-wrap"><img id="resultPreview" alt="Analyzed image" /></div><div class="result-image-meta"><span>${image.originalWidth || '—'} × ${image.originalHeight || '—'}</span><span>${file ? formatBytes(file.size) : '—'}</span><span>${image.resized ? 'Resized for processing' : 'Original resolution processed'}</span></div></div>
        <div class="panel result-overview"><span class="panel-kicker">ANALYSIS OVERVIEW</span><h2>Image characteristics</h2><div class="metric-list"><div><span>Processing</span><strong>${formatMs(result?.timings?.totalMs)}</strong></div><div><span>Mean luminance</span><strong>${Number(statistics.meanLuminance ?? 0).toFixed(2)}</strong></div><div><span>Luminance std. dev.</span><strong>${Number(statistics.luminanceStdDev ?? 0).toFixed(2)}</strong></div><div><span>Entropy</span><strong>${Number(result?.entropy ?? 0).toFixed(4)}</strong></div><div><span>Sharpness</span><strong>${Number(result?.sharpness ?? 0).toFixed(2)}</strong></div><div><span>Exposure</span><strong class="capitalize">${escapeHtml(exposure.classification || 'unknown')}</strong></div></div></div>
      </section>
      ${detectionBlock}
      <section class="result-section"><div class="result-section-title"><span>DOMINANT COLOURS</span><small>Top ${colours.length || 0}</small></div><div class="palette-grid">${colours.map((c) => `<div class="palette-card"><div class="palette-swatch" style="background:${escapeHtml(c.hex)}"></div><div class="palette-info"><strong>${escapeHtml(c.hex)}</strong><span>${Number(c.percentage ?? 0).toFixed(1)}%</span></div></div>`).join('')}</div></section>
      <section class="result-detail-grid"><div class="panel detail-card"><span class="panel-kicker">SPATIAL LUMINANCE</span><h2>Center vs outer region</h2><div class="detail-pair"><span>Center</span><strong>${Number(spatial.centerMeanLuminance ?? 0).toFixed(2)}</strong></div><div class="detail-pair"><span>Outer</span><strong>${Number(spatial.outerMeanLuminance ?? 0).toFixed(2)}</strong></div><div class="detail-pair"><span>Difference</span><strong>${Number(spatial.centerOuterDifference ?? 0).toFixed(2)}</strong></div></div><div class="panel detail-card"><span class="panel-kicker">IMAGE PROCESSING</span><h2>Dimensions</h2><div class="detail-pair"><span>Original</span><strong>${image.originalWidth || 0} × ${image.originalHeight || 0}</strong></div><div class="detail-pair"><span>Processed</span><strong>${image.processedWidth || 0} × ${image.processedHeight || 0}</strong></div><div class="detail-pair"><span>Pixel count</span><strong>${Number(statistics.pixelCount ?? 0).toLocaleString()}</strong></div></div></section>
      <section id="errorCard" class="inline-error hidden"></section>
    `;
    const resultPreview = view.querySelector('#resultPreview');
    if (imageObjectUrl && resultPreview) resultPreview.src = imageObjectUrl;
  }

  function renderBenchmarkResults() {
    const report = latestBenchmarkReport;
    const analysis = report.analysis || {};
    const performance = analysis.performance || {};
    const validation = report.validation || {};
    const serialRuns = report.serial?.runs || [];
    const parallelRuns = report.parallel?.runs || [];
    const interpretation = performance.interpretation || 'No interpretation available.';
    const faster = Number(performance.speedup) >= 1;

    const rows = [...serialRuns.map((r) => ({ ...r, mode: 'Serial' })), ...parallelRuns.map((r) => ({ ...r, mode: 'Parallel' }))];

    view.innerHTML = `
      <section class="result-header"><div><span class="section-kicker">RESULT / BENCHMARK</span><h1>Benchmark results</h1><p>${escapeHtml(selectedFile?.name || 'Selected image')} · ${escapeHtml(report.protocol || '1 warmup + 3 serial + 3 parallel')}</p></div><div class="result-header-actions"><a class="secondary-btn" href="#/benchmark">Run another</a><button id="exportJson" class="ghost-btn" type="button">JSON</button><button id="exportCsv" class="ghost-btn" type="button">CSV</button></div></section>
      <section class="metric-grid"><div class="metric-card"><span>Serial mean</span><strong>${formatMs(analysis.serial?.meanMs)}</strong><small>3 measured runs</small></div><div class="metric-card"><span>Parallel mean</span><strong>${formatMs(analysis.parallel?.meanMs)}</strong><small>3 measured runs</small></div><div class="metric-card highlight"><span>Speedup</span><strong>${formatSpeedup(performance.speedup)}</strong><small>${formatPercent(performance.improvementPercent)} improvement</small></div><div class="metric-card"><span>Time saved</span><strong>${formatMs(performance.timeSavedMs)}</strong><small>mean wall time difference</small></div><div class="metric-card"><span>Efficiency</span><strong>${formatPercent(performance.efficiency)}</strong><small>2-worker efficiency</small></div><div class="metric-card validation-card ${validation.valid ? 'passed' : 'failed'}"><span>Validation</span><strong>${validation.valid ? '✓ PASSED' : '✗ FAILED'}</strong><small>${validation.failureCount || 0} validation failures</small></div></section>
      <section class="benchmark-result-grid"><div class="panel interpretation-card"><span class="panel-kicker">INTERPRETATION</span><h2>${faster ? 'Parallel execution was faster.' : 'Parallel execution was not faster.'}</h2><p>${escapeHtml(interpretation)}</p><div class="comparison-bars"><div><span>Serial</span><div class="bar"><i style="width:${relativeBar(analysis.serial?.meanMs, analysis.serial?.meanMs, analysis.parallel?.meanMs)}%"></i></div><strong>${formatMs(analysis.serial?.meanMs)}</strong></div><div><span>Parallel</span><div class="bar"><i style="width:${relativeBar(analysis.parallel?.meanMs, analysis.serial?.meanMs, analysis.parallel?.meanMs)}%"></i></div><strong>${formatMs(analysis.parallel?.meanMs)}</strong></div></div></div><div class="panel integrity-result"><span class="panel-kicker">BENCHMARK INTEGRITY</span><div class="big-check">${validation.valid ? '✓' : '!'}</div><h2>${validation.valid ? 'Outputs validated' : 'Validation failed'}</h2><p>${validation.valid ? 'Serial and parallel computational outputs were validated before performance metrics were reported.' : 'Review the validation failures before using this benchmark as a performance result.'}</p></div></section>
      <section class="panel runs-panel"><div class="panel-heading"><div><span class="panel-kicker">MEASURED RUNS</span><h2>Execution details</h2></div><span class="panel-meta">Warmup excluded</span></div><div class="table-wrap"><table><thead><tr><th>Mode</th><th>Run</th><th>Wall time</th><th>Detection</th><th>Analysis</th></tr></thead><tbody>${rows.map((r) => `<tr><td><span class="mode-pill ${r.mode.toLowerCase()}">${r.mode}</span></td><td>${r.run}</td><td><strong>${formatMs(r.wallMs)}</strong></td><td>${formatMs(r.detection?.inferenceMs)}</td><td>${formatMs(r.analysis?.timings?.totalMs ?? r.analysis?.processingMs)}</td></tr>`).join('')}</tbody></table></div></section>
      <section class="panel methodology-result"><div><span class="panel-kicker">METHODOLOGY</span><h2>How this result was produced</h2></div><div class="methodology-items"><span>01 Warmup excluded</span><span>03 Serial measured</span><span>03 Parallel measured</span><span>2 workers</span><span>Outputs validated</span></div></section>
      <section id="errorCard" class="inline-error hidden"></section>
    `;

    view.querySelector('#exportJson').addEventListener('click', () => downloadBenchmarkJSON({ experiment: extractExperiment(report), analysis: report.analysis, validation: report.validation, filename: createBenchmarkFilename('json') }));
    view.querySelector('#exportCsv').addEventListener('click', () => downloadBenchmarkCSV({ experiment: extractExperiment(report), analysis: report.analysis, filename: createBenchmarkFilename('csv') }));
  }

  function relativeBar(value, a, b) {
    const v = Number(value), aa = Number(a), bb = Number(b);
    if (![v, aa, bb].every(Number.isFinite) || Math.max(aa, bb) <= 0) return 0;
    return Math.max(18, Math.min(100, (v / Math.max(aa, bb)) * 100));
  }

  function extractExperiment(report) {
    return { protocol: report.protocol, warmup: report.warmup, serial: report.serial, parallel: report.parallel, totalExperimentMs: report.totalExperimentMs };
  }

  function createBenchmarkFilename(extension) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = selectedFile?.name ? selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '_') : 'image';
    return `parallel-vision-${baseName}-${timestamp}.${extension}`;
  }

  function bindPageLoglessStatus() {
    const dDot = root.querySelector('#detectionDot');
    const aDot = root.querySelector('#analysisDot');
    if (dDot) dDot.classList.toggle('ready', headerDetectionDot.classList.contains('ready'));
    if (aDot) aDot.classList.add('ready');
  }

  function bindAnalyzePage() {
    const fileEl = view.querySelector('#file');
    const loadBtn = view.querySelector('#load');
    const detectBtn = view.querySelector('#detect');
    const analyseBtn = view.querySelector('#analyse');
    const preview = view.querySelector('#preview');
    const overlay = view.querySelector('#overlay');
    const imageWrap = view.querySelector('#imageWrap');
    const details = view.querySelector('#details');
    const fileInfo = view.querySelector('#fileInfo');
    const previewMeta = view.querySelector('#previewMeta');
    const dropZone = view.querySelector('#dropZone');
    const detectionDot = view.querySelector('#detectionDot');
    const detectionStage = view.querySelector('#detectionStage');
    const analysisStage = view.querySelector('#analysisStage');

    const updateButtons = () => {
      const hasFile = Boolean(selectedFile);
      const detectionReady = headerDetectionDot.classList.contains('ready');
      loadBtn.disabled = detectionReady;
      detectBtn.disabled = !hasFile || !detectionReady || benchmarkRunning;
      analyseBtn.disabled = !hasFile || !analysisWorker || benchmarkRunning;
    };

    fileEl.addEventListener('change', () => {
      const file = fileEl.files?.[0];
      if (!file) return;
      selectedFile = file;
      latestBenchmarkReport = null;
      latestAnalysisResult = null;
      latestDetections = null;
      latestDetectionMs = null;
      clearError();
      if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
      imageObjectUrl = URL.createObjectURL(file);
      preview.src = imageObjectUrl;
      preview.onload = () => {
        imageWrap.classList.remove('empty-state');
        previewMeta.textContent = `${preview.naturalWidth} × ${preview.naturalHeight}`;
        drawExistingDetections();
      };
      fileInfo.classList.remove('hidden');
      fileInfo.innerHTML = `<strong>${escapeHtml(file.name)}</strong><span>${escapeHtml(file.type)} · ${formatBytes(file.size)}</span>`;
      details.textContent = 'Image ready. Choose a workload to continue.';
      dropZone.classList.add('has-file');
      log(`Selected ${file.name} (${formatBytes(file.size)})`);
      updateButtons();
    });

    ['dragenter', 'dragover'].forEach((eventName) => dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.add('dragging'); }));
    ['dragleave', 'drop'].forEach((eventName) => dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.remove('dragging'); }));
    dropZone.addEventListener('drop', (event) => {
      const file = event.dataTransfer.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;
      const dt = new DataTransfer(); dt.items.add(file); fileEl.files = dt.files; fileEl.dispatchEvent(new Event('change'));
    });

    loadBtn.addEventListener('click', async () => {
      loadBtn.disabled = true;
      detectionStage.textContent = 'Loading RF-DETR Nano…';
      try { await request(detectionWorker, 'load'); } catch { loadBtn.disabled = false; }
      updateButtons();
    });

    detectBtn.addEventListener('click', async () => {
      if (!selectedFile) return;
      detectBtn.disabled = true;
      detectionStage.textContent = 'Running RF-DETR Nano…';
      try { await request(detectionWorker, 'detect', { buffer: await selectedFile.arrayBuffer(), mimeType: selectedFile.type, threshold: 0.5 }); }
      catch { detectBtn.disabled = false; }
      updateButtons();
    });

    analyseBtn.addEventListener('click', async () => {
      if (!selectedFile) return;
      analyseBtn.disabled = true;
      analysisStage.textContent = 'Running deterministic analysis…';
      try { await request(analysisWorker, 'analyze', { buffer: await selectedFile.arrayBuffer(), mimeType: selectedFile.type }); }
      catch { analyseBtn.disabled = false; }
      updateButtons();
    });

    function drawExistingDetections() {
      if (!latestDetections || !preview.naturalWidth) return;
      renderDetectionOverlay(latestDetections, overlay, preview);
    }
    updateButtons();
    if (selectedFile && imageObjectUrl) {
      preview.src = imageObjectUrl;
      fileInfo.classList.remove('hidden');
      fileInfo.innerHTML = `<strong>${escapeHtml(selectedFile.name)}</strong><span>${escapeHtml(selectedFile.type)} · ${formatBytes(selectedFile.size)}</span>`;
    }
  }

  function bindBenchmarkPage() {
    const fileEl = view.querySelector('#benchmarkFile');
    const fileName = view.querySelector('#benchmarkFileName');
    const benchmarkDropZone = view.querySelector('#benchmarkDropZone');
    const button = view.querySelector('#benchmark');
    const status = view.querySelector('#benchmarkStatus');
    const statePill = view.querySelector('#benchmarkStatePill');
    const progressBar = view.querySelector('#benchmarkProgressBar');
    const progressPercent = view.querySelector('#benchmarkPercent');
    const liveMessage = view.querySelector('#benchmarkProgress');
    const logEl = view.querySelector('#benchmarkLog');

    fileEl.addEventListener('change', () => {
      const file = fileEl.files?.[0];
      if (!file) return;
      selectedFile = file;
      latestBenchmarkReport = null;
      fileName.textContent = `${file.name} · ${formatBytes(file.size)}`;
      benchmarkDropZone?.classList.add('has-file');
      button.disabled = !headerDetectionDot.classList.contains('ready') || benchmarkRunning;
      status.textContent = headerDetectionDot.classList.contains('ready') ? 'Ready to benchmark.' : 'Waiting for RF-DETR Nano.';
    });

    button.addEventListener('click', async () => {
      if (benchmarkRunning || !selectedFile) return;
      benchmarkRunning = true;
      button.disabled = true;
      statePill.textContent = 'RUNNING';
      statePill.className = 'state-pill running';
      clearError();
      latestBenchmarkReport = null;
      const localLog = (message) => { logEl.textContent += `${new Date().toLocaleTimeString()} · ${message}\n`; logEl.scrollTop = logEl.scrollHeight; };
      localLog('Benchmark started. Protocol: 1 warmup + 3 serial + 3 parallel.');
      try {
        const report = await runBenchmark({ detectionWorker, analysisWorker, buffer: await selectedFile.arrayBuffer(), mimeType: selectedFile.type, threshold: 0.5, onProgress: (progress) => handleBenchmarkProgress(progress, { status, statePill, progressBar, progressPercent, liveMessage, localLog }) });
        latestBenchmarkReport = report;
        localLog('Benchmark completed successfully.');
        setPage('results');
      } catch (error) {
        const normalized = normalizeBenchmarkError(error);
        status.textContent = `Benchmark failed: ${normalized.message}`;
        statePill.textContent = 'FAILED'; statePill.className = 'state-pill failed';
        showError(normalized.message, normalized.name);
        localLog(`ERROR — ${normalized.name}: ${normalized.message}`);
      } finally {
        benchmarkRunning = false;
        if (!latestBenchmarkReport) button.disabled = false;
      }
    });
  }

  function handleBenchmarkProgress(progress = {}, refs) {
    const stage = progress.stage || progress.phase || 'experiment';
    const message = progress.message || getBenchmarkStageLabel(stage);
    refs.status.textContent = message;
    refs.liveMessage.textContent = message;
    const progressMap = { experiment: 8, warmup: 18, serial: 50, parallel: 82, validation: 92, analysis: 97, complete: 100 };
    const percent = progressMap[stage] || 10;
    refs.progressBar.style.width = `${percent}%`;
    refs.progressPercent.textContent = `${percent}%`;
    refs.localLog(`BENCHMARK: ${message}`);
    ['stepWarmup', 'stepSerial', 'stepParallel', 'stepValidation'].forEach((id) => view.querySelector(`#${id}`)?.classList.remove('active', 'complete'));
    const stages = { warmup: 'stepWarmup', serial: 'stepSerial', parallel: 'stepParallel', validation: 'stepValidation' };
    const order = ['warmup', 'serial', 'parallel', 'validation'];
    const index = order.indexOf(stage);
    if (index >= 0) {
      order.forEach((s, i) => { const el = view.querySelector(`#${stages[s]}`); if (el && i < index) el.classList.add('complete'); });
      view.querySelector(`#${stages[stage]}`)?.classList.add('active');
    }
    if (stage === 'complete') order.forEach((s) => view.querySelector(`#${stages[s]}`)?.classList.add('complete'));
  }

  function renderDetectionOverlay(detections, overlay, preview) {
    const ctx = overlay.getContext('2d');
    if (!ctx || !preview.naturalWidth) return;
    overlay.width = preview.naturalWidth; overlay.height = preview.naturalHeight;
    overlay.style.width = `${preview.getBoundingClientRect().width}px`; overlay.style.height = `${preview.getBoundingClientRect().height}px`;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.lineWidth = Math.max(2, overlay.width / 300);
    ctx.font = `${Math.max(14, overlay.width / 50)}px system-ui`;
    for (const item of detections) {
      const b = item.box || {};
      const x1 = Number(b.xmin || 0), y1 = Number(b.ymin || 0), x2 = Number(b.xmax || 0), y2 = Number(b.ymax || 0);
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      ctx.fillText(`${item.label ?? 'object'} ${(Number(item.score ?? 0) * 100).toFixed(1)}%`, x1 + 4, Math.max(18, y1 + 18));
    }
  }

  function handleWorkerMessage(event, workerName) {
    const msg = event.data || {};
    if (msg.type === 'boot') { log(msg.payload?.message || `${workerName} booted.`); return; }
    if (msg.type === 'status') { log(`${workerName}: ${msg.payload?.message || 'status update'}`); return; }
    if (msg.type === 'progress') { log(`${workerName}: Model progress${msg.payload?.progress != null ? ` ${Number(msg.payload.progress).toFixed(1)}%` : ''}`); return; }
    if (msg.type === 'error') {
      const pendingRequest = pending.get(msg.id); pending.delete(msg.id);
      const error = msg.error || {};
      showError(error.message || 'Worker request failed.', workerName);
      pendingRequest?.reject(new Error(error.message || 'Worker request failed.'));
      return;
    }
    if (msg.type !== 'result') return;
    const pendingRequest = pending.get(msg.id); pending.delete(msg.id);
    const payload = msg.payload || {};

    if (workerName === 'Detection Worker' && payload.stage === 'ready') {
      headerDetectionDot.classList.add('ready');
      updateHeaderStatus();
      log(`RF-DETR Nano ready in ${Number(payload.loadMs || 0).toFixed(0)} ms`);
      root.querySelector('#detectionStage')?.replaceChildren(document.createTextNode('RF-DETR Nano ready.'));
      root.querySelector('#detectionDot')?.classList.add('ready');
      if (currentPage === 'benchmark') {
        const btn = view.querySelector('#benchmark'); const file = view.querySelector('#benchmarkFile');
        if (btn && file?.files?.[0]) btn.disabled = false;
      }
    }
    if (workerName === 'Detection Worker' && payload.stage === 'detection') {
      latestDetections = payload.detections || [];
      latestDetectionMs = Number(payload.inferenceMs || 0);
      log(`Detection complete: ${latestDetections.length} object(s) in ${latestDetectionMs.toFixed(0)} ms`);
      const overlay = view.querySelector('#overlay'), preview = view.querySelector('#preview');
      if (overlay && preview) renderDetectionOverlay(latestDetections, overlay, preview);
      if (currentPage === 'analyze') {
        view.querySelector('#detectionStage')?.replaceChildren(document.createTextNode(`Detection complete · ${formatMs(latestDetectionMs)}`));
      }
      pendingRequest?.resolve(payload);
      setPage('results');
      return;
    }
    if (workerName === 'Deep Analysis Worker' && payload.stage === 'analysis-complete') {
      latestAnalysisResult = payload.result;
      log(`Deep analysis complete in ${Number(payload.result?.timings?.totalMs || 0).toFixed(1)} ms`);
      if (currentPage === 'analyze') view.querySelector('#analysisStage')?.replaceChildren(document.createTextNode('Deep image analysis complete.'));
      pendingRequest?.resolve(payload);
      setPage('results');
      return;
    }
    pendingRequest?.resolve(payload);
  }

  function request(targetWorker, type, payload = {}) {
    const id = nextId();
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject, worker: targetWorker });
      const transfer = payload.buffer ? [payload.buffer] : [];
      targetWorker.postMessage({ type, id, payload }, transfer);
    });
  }

  detectionWorker = new Worker(new URL('./detection.worker.js', import.meta.url), { type: 'module' });
  analysisWorker = new Worker(new URL('./workers/analysis.worker.js', import.meta.url), { type: 'module' });
  detectionWorker.onmessage = (event) => handleWorkerMessage(event, 'Detection Worker');
  analysisWorker.onmessage = (event) => handleWorkerMessage(event, 'Deep Analysis Worker');
  detectionWorker.onerror = (event) => showError(event.message || 'The Detection Worker reported an unknown error.', 'Detection Worker');
  analysisWorker.onerror = (event) => showError(event.message || 'The Deep Analysis Worker reported an unknown error.', 'Deep Analysis Worker');

  request(analysisWorker, 'ping').catch(() => {});
  request(detectionWorker, 'ping').catch(() => {});

  function renderPage() {
    const page = getPath();
    currentPage = ['home', 'analyze', 'benchmark', 'about', 'results'].includes(page) ? page : 'home';
    clearError();
    if (currentPage === 'home') renderHome();
    if (currentPage === 'analyze') renderAnalyze();
    if (currentPage === 'benchmark') renderBenchmark();
    if (currentPage === 'about') renderAbout();
    if (currentPage === 'results') renderResults();
    updateNav();
    updateHeaderStatus();
    closeMobileNav();
  }

  window.addEventListener('hashchange', renderPage);
  renderPage();
}
