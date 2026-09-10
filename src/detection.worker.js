import { env, pipeline } from '@huggingface/transformers';

const MODEL_ID = 'onnx-community/rfdetr_nano-ONNX';

let detector = null;

function send(type, id, payload = {}) {
  self.postMessage({ type, id, payload });
}

async function getDetector(id) {
  if (detector) return detector;

  send('status', id, {
    stage: 'transformers-loaded',
    message: 'Transformers.js loaded successfully.'
  });

  env.allowRemoteModels = true;
  env.allowLocalModels = false;

  send('status', id, {
    stage: 'model-loading',
    message: `Loading ${MODEL_ID}...`
  });

  detector = await pipeline('object-detection', MODEL_ID, {
    device: 'wasm',
    dtype: 'q8',
    progress_callback: (progress) => {
      send('progress', id, progress);
    }
  });

  send('status', id, {
    stage: 'model-ready',
    message: 'RF-DETR Nano is ready.'
  });

  return detector;
}

self.onmessage = async (event) => {
  const { type, id, payload = {} } = event.data;

  try {
    if (type === 'ping') {
      send('result', id, {
        stage: 'worker-alive',
        message: 'Detection Worker is running.'
      });
      return;
    }

    if (type === 'load') {
      const start = performance.now();
      await getDetector(id);

      send('result', id, {
        stage: 'ready',
        model: MODEL_ID,
        loadMs: performance.now() - start
      });
      return;
    }

    if (type === 'detect') {
      if (!payload.buffer) {
        throw new Error('No image buffer was provided.');
      }

      const detectorInstance = await getDetector(id);

      send('status', id, {
        stage: 'inference',
        message: 'Running RF-DETR Nano inference...'
      });

      const blob = new Blob(
        [payload.buffer],
        { type: payload.mimeType || 'image/jpeg' }
      );

      const url = URL.createObjectURL(blob);

      try {
        const start = performance.now();

        const output = await detectorInstance(url, {
          threshold: Number(payload.threshold ?? 0.5)
        });

        send('result', id, {
          stage: 'detection',
          model: MODEL_ID,
          inferenceMs: performance.now() - start,
          detections: output
        });
      } finally {
        URL.revokeObjectURL(url);
      }

      return;
    }

    throw new Error(`Unknown worker request: ${type}`);
  } catch (error) {
    self.postMessage({
      type: 'error',
      id,
      error: {
        name: error?.name || 'Error',
        message: error?.message || String(error),
        stack: error?.stack || null
      }
    });
  }
};

self.postMessage({
  type: 'boot',
  payload: {
    model: MODEL_ID,
    message: 'RF-DETR Detection Worker booted.'
  }
});
