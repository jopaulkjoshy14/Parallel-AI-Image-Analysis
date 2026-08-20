import {
  pipeline,
  env
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

  const start = performance.now();

  try {
    const model =
      await loadClassifier();

    const output =
      await model(imageData, {
        top_k: 5
      });

    const duration =
      performance.now() - start;

    self.postMessage({
      type: "complete",
      result: output,
      duration
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      error: error.message
    });
  }
};
