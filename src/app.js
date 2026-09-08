let worker;
let requestId = 0;
const pending = new Map();

function nextId() {
  requestId += 1;
  return String(requestId);
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(i ? 2 : 0)} ${units[i]}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[c]));
}

export function initApp(root) {
  root.innerHTML = `
    <main class="page">
      <header>
        <p class="eyebrow">RF-DETR NANO · MOBILE RUNTIME TEST</p>
        <h1>RF-DETR Nano</h1>
        <p class="lead">Minimal browser test for RF-DETR Nano running inside a Web Worker with Transformers.js and WASM.</p>
      </header>

      <section class="card">
        <div class="status-row">
          <span id="workerDot" class="dot"></span>
          <strong id="workerStatus">Starting worker…</strong>
        </div>
        <p id="stage" class="muted">Waiting for the Detection Worker.</p>

        <input id="file" type="file" accept="image/png,image/jpeg,image/webp" />
        <button id="load" disabled>Load RF-DETR Nano</button>
        <button id="detect" disabled>Run Detection</button>

        <div id="imageWrap" class="image-wrap hidden">
          <img id="preview" alt="Selected image" />
          <canvas id="overlay"></canvas>
        </div>

        <div id="details" class="details"></div>
      </section>

      <section class="card">
        <h2>Runtime log</h2>
        <pre id="log"></pre>
      </section>

      <section class="card note">
        <strong>Mobile test</strong>
        <p>First model load can take time because the ONNX model is downloaded and initialized in the browser. Keep the page open and the screen awake during the test.</p>
      </section>
    </main>
  `;

  const logEl = root.querySelector('#log');
  const stageEl = root.querySelector('#stage');
  const workerStatusEl = root.querySelector('#workerStatus');
  const dotEl = root.querySelector('#workerDot');
  const fileEl = root.querySelector('#file');
  const loadBtn = root.querySelector('#load');
  const detectBtn = root.querySelector('#detect');
  const preview = root.querySelector('#preview');
  const overlay = root.querySelector('#overlay');
  const imageWrap = root.querySelector('#imageWrap');
  const details = root.querySelector('#details');

  function log(message) {
    const time = new Date().toLocaleTimeString();
    logEl.textContent += `[${time}] ${message}\n`;
    logEl.scrollTop = logEl.scrollHeight;
  }

  function status(message, good = false) {
    stageEl.textContent = message;
    if (good) {
      workerStatusEl.textContent = 'RF-DETR Nano ready';
      dotEl.classList.add('ready');
    }
  }

  function request(type, payload = {}) {
    const id = nextId();
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker.postMessage({ type, id, payload }, payload.buffer ? [payload.buffer] : []);
    });
  }

  worker = new Worker(
    new URL('./detection.worker.js', import.meta.url),
    { type: 'module' }
  );

  worker.onmessage = (event) => {
    const msg = event.data;

    if (msg.type === 'boot') {
      log(msg.payload.message);
      return;
    }

    if (msg.type === 'status') {
      log(msg.payload.message);
      status(msg.payload.message);
      return;
    }

    if (msg.type === 'progress') {
      const p = msg.payload;
      const progress = p?.progress != null
        ? ` ${Number(p.progress).toFixed(1)}%`
        : '';
      log(`Model progress${progress}`);
      return;
    }

    if (msg.type === 'error') {
      const pendingRequest = pending.get(msg.id);
      pending.delete(msg.id);

      const error = msg.error || {};
      const text = `${error.name || 'Error'}: ${error.message || 'Unknown error'}`;
      log(`ERROR — ${text}`);
      status(text);
      workerStatusEl.textContent = 'Worker error';
      dotEl.classList.remove('ready');

      pendingRequest?.reject(new Error(text));
      return;
    }

    if (msg.type === 'result') {
      const pendingRequest = pending.get(msg.id);
      pending.delete(msg.id);

      if (msg.payload.stage === 'ready') {
        log(`RF-DETR Nano ready in ${msg.payload.loadMs.toFixed(0)} ms`);
        status('RF-DETR Nano ready.', true);
        loadBtn.disabled = true;
        detectBtn.disabled = !fileEl.files?.[0];
      }

      if (msg.payload.stage === 'detection') {
        renderDetections(msg.payload.detections || [], msg.payload.inferenceMs);
      }

      pendingRequest?.resolve(msg.payload);
    }
  };

  worker.onerror = (event) => {
    const text = [
      'BROWSER WORKER ERROR',
      `message=${event.message || '(empty)'}`,
      `file=${event.filename || '(unknown)'}`,
      `line=${event.lineno ?? '(unknown)'}`,
      `column=${event.colno ?? '(unknown)'}`
    ].join('\n');

    log(text);
    status('The browser terminated the Detection Worker.');
    workerStatusEl.textContent = 'Worker crashed';
    dotEl.classList.remove('ready');
  };

  fileEl.addEventListener('change', () => {
    const file = fileEl.files?.[0];
    if (!file) return;

    preview.src = URL.createObjectURL(file);
    imageWrap.classList.remove('hidden');
    details.textContent = `${file.name} · ${file.type} · ${formatBytes(file.size)}`;
    detectBtn.disabled = true;
    log(`Selected ${file.name} (${formatBytes(file.size)})`);
  });

  loadBtn.addEventListener('click', async () => {
    loadBtn.disabled = true;
    try {
      await request('load');
    } catch {}
  });

  detectBtn.addEventListener('click', async () => {
    const file = fileEl.files?.[0];
    if (!file) return;

    detectBtn.disabled = true;

    try {
      const buffer = await file.arrayBuffer();
      await request('detect', {
        buffer,
        mimeType: file.type,
        threshold: 0.5
      });
    } catch {
      detectBtn.disabled = false;
    }
  });

  request('ping').catch(() => {});
  loadBtn.disabled = false;

  function renderDetections(detections, inferenceMs) {
    const ctx = overlay.getContext('2d');
    const rect = preview.getBoundingClientRect();

    overlay.width = preview.naturalWidth;
    overlay.height = preview.naturalHeight;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;

    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.lineWidth = Math.max(2, overlay.width / 300);
    ctx.font = `${Math.max(14, overlay.width / 50)}px system-ui`;

    for (const item of detections) {
      const [x1, y1, x2, y2] = item.box
        ? [item.box.xmin, item.box.ymin, item.box.xmax, item.box.ymax]
        : [0, 0, 0, 0];

      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

      const label = `${item.label ?? 'object'} ${(Number(item.score ?? 0) * 100).toFixed(1)}%`;
      ctx.fillText(label, x1 + 4, Math.max(18, y1 + 18));
    }

    details.innerHTML =
      `<strong>${detections.length} detection(s)</strong> · ${inferenceMs.toFixed(0)} ms<br>` +
      detections.map((d) =>
        `${escapeHtml(d.label ?? 'object')} — ${(Number(d.score ?? 0) * 100).toFixed(1)}%`
      ).join('<br>');

    log(`Detection complete: ${detections.length} object(s) in ${inferenceMs.toFixed(0)} ms`);
    detectBtn.disabled = false;
  }
}
