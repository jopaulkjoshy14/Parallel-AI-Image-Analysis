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

let classifier = null;

async function loadClassifier() {
  if (classifier) {
    return classifier;
  }

  classifier = await pipeline(
    "image-classification",
    "Xenova/mobilevit-x-small",
    {
      device: "wasm",
      dtype: "q8"
    }
  );

  return classifier;
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
      await loadClassifier();

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
        top_k: 5
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
