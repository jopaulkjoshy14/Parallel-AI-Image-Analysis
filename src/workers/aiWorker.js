import {
  pipeline,
  env,
  RawImage
} from "@huggingface/transformers";

env.allowRemoteModels = false;
env.allowLocalModels = true;

env.localModelPath =
  "/models/";

env.backends.onnx.wasm.wasmPaths =
  "/wasm/";

let detector = null;

async function loadDetector() {
  if (detector) {
    return detector;
  }

  detector = await pipeline(
    "object-detection",
    "Xenova/detr-resnet-50",
    {
      device: "wasm",
      dtype: "q8"
    }
  );

  return detector;
}

self.onmessage = async (event) => {
  const {
    rgba,
    width,
    height
  } = event.data;

  const start =
    performance.now();

  try {
    const model =
      await loadDetector();

    /*
     * Convert the RGBA pixel buffer
     * into a Transformers.js RawImage.
     *
     * 4 = RGBA channels.
     */
    const image =
      new RawImage(
        new Uint8ClampedArray(rgba),
        width,
        height,
        4
      );

    const output =
      await model(image, {
        threshold: 0.01
      });

    const duration =
      performance.now() -
      start;

    self.postMessage({
      type: "complete",
      result: output,
      duration
    });
  } catch (error) {
    console.error(
      "AI worker error:",
      error
    );

    self.postMessage({
      type: "error",
      error:
        error.message ||
        String(error)
    });
  }
};
