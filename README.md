# RF-DETR Nano Mobile Test

A deliberately tiny browser application whose only computational purpose is to test:

**Mobile browser → Web Worker → Transformers.js → ONNX Runtime Web/WASM → RF-DETR Nano**

It does not contain the benchmark system, React, Worker 2, 13-module analysis, or other project layers.

## Model

`onnx-community/rfdetr_nano-ONNX`

The model's Hugging Face model card documents direct use with Transformers.js as an object-detection pipeline.

## Run locally

```bash
npm install
npm run dev
```

## Deploy to Render

Use the included `render.yaml`, or configure:

- Build command: `npm install && npm run build`
- Publish directory: `dist`

## Mobile test

1. Open the deployed HTTPS URL on an Android phone.
2. Tap **Load RF-DETR Nano**.
3. Wait for model loading to finish.
4. Choose a small JPG/PNG/WebP.
5. Tap **Run Detection**.
6. If it fails, the Runtime Log is the important diagnostic output.

The first model load can be slow because model assets are downloaded and initialized in the browser.
