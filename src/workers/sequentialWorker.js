import {
  kMeans
} from "../utils/kmeans";

import {
  calculateHistogram,
  calculateStatistics
} from "../utils/imageProcessing";

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

async function getClassifier() {
  if (!classifier) {
    classifier = await pipeline(
      "image-classification",
      "Xenova/mobilevit-x-small",
      {
        device: "wasm",
        dtype: "q8"
      }
    );
  }

  return classifier;
}

self.onmessage = async (event) => {
  const {
    rgba,
    pixels,
    width,
    height,
    fileSize,
    imageData
  } = event.data;

  const totalStart =
    performance.now();

  try {
    // 1. K-Means
    const colourStart =
      performance.now();

    const palette = kMeans(
      pixels,
      5,
      15
    );

    const colourTime =
      performance.now() -
      colourStart;

    self.postMessage({
      type: "step",
      step: "colour",
      duration: colourTime,
      result: palette
    });

    // 2. AI
    const aiStart =
      performance.now();

    const model =
      await getClassifier();

    const aiResult =
      await model(imageData, {
        top_k: 5
      });

    const aiTime =
      performance.now() -
      aiStart;

    self.postMessage({
      type: "step",
      step: "ai",
      duration: aiTime,
      result: aiResult
    });

    // 3. Histogram
    const histogramStart =
      performance.now();

    const histogram =
      calculateHistogram(rgba);

    const histogramTime =
      performance.now() -
      histogramStart;

    self.postMessage({
      type: "step",
      step: "histogram",
      duration: histogramTime,
      result: histogram
    });

    // 4. Statistics
    const statisticsStart =
      performance.now();

    const statistics =
      calculateStatistics(
        rgba,
        width,
        height,
        fileSize
      );

    const statisticsTime =
      performance.now() -
      statisticsStart;

    self.postMessage({
      type: "step",
      step: "statistics",
      duration: statisticsTime,
      result: statistics
    });

    const totalTime =
      performance.now() -
      totalStart;

    self.postMessage({
      type: "complete",
      totalTime
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      error: error.message
    });
  }
};
