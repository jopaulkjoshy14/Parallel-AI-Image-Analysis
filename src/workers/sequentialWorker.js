import {
  pipeline,
  env,
  RawImage
} from "@huggingface/transformers";

import { kMeans } from "../utils/kmeans";

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
    pixels,
    width,
    height,
    fileSize
  } = event.data;

  const totalStart =
    performance.now();

  try {
    /*
     * -------------------------------------------------
     * STEP 1
     * K-Means colour extraction
     * -------------------------------------------------
     */

    const colourStart =
      performance.now();

    const palette =
      kMeans(
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
      result: palette,
      duration: colourTime
    });

    /*
     * -------------------------------------------------
     * STEP 2
     * AI object detection
     * -------------------------------------------------
     */

    const aiStart =
      performance.now();

    const model =
      await loadDetector();

    /*
     * Transformers.js expects an image input.
     *
     * Convert the RGBA pixel data into
     * a RawImage object.
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

    /*
     * DETR returns detected objects with:
     *
     * - label
     * - score
     * - bounding box
     *
     * A low threshold is intentionally used
     * during this experiment so that we can
     * inspect the model's actual predictions.
     */

    const aiResult =
      await model(image, {
        threshold: 0.01
      });

    const aiTime =
      performance.now() -
      aiStart;

    self.postMessage({
      type: "step",
      step: "ai",
      result: aiResult,
      duration: aiTime
    });

    /*
     * -------------------------------------------------
     * STEP 3
     * RGB histogram
     * -------------------------------------------------
     */

    const histogramStart =
      performance.now();

    const histogram = {
      red: new Array(256).fill(0),
      green: new Array(256).fill(0),
      blue: new Array(256).fill(0)
    };

    for (
      let i = 0;
      i < rgba.length;
      i += 4
    ) {
      histogram.red[rgba[i]]++;
      histogram.green[rgba[i + 1]]++;
      histogram.blue[rgba[i + 2]]++;
    }

    const histogramTime =
      performance.now() -
      histogramStart;

    self.postMessage({
      type: "step",
      step: "histogram",
      result: histogram,
      duration: histogramTime
    });

    /*
     * -------------------------------------------------
     * STEP 4
     * Image statistics
     * -------------------------------------------------
     */

    const statisticsStart =
      performance.now();

    let redSum = 0;
    let greenSum = 0;
    let blueSum = 0;

    let minRed = 255;
    let minGreen = 255;
    let minBlue = 255;

    let maxRed = 0;
    let maxGreen = 0;
    let maxBlue = 0;

    const pixelCount =
      rgba.length / 4;

    for (
      let i = 0;
      i < rgba.length;
      i += 4
    ) {
      const r = rgba[i];
      const g = rgba[i + 1];
      const b = rgba[i + 2];

      redSum += r;
      greenSum += g;
      blueSum += b;

      if (r < minRed) minRed = r;
      if (g < minGreen) minGreen = g;
      if (b < minBlue) minBlue = b;

      if (r > maxRed) maxRed = r;
      if (g > maxGreen) maxGreen = g;
      if (b > maxBlue) maxBlue = b;
    }

    const statistics = {
      width,
      height,
      pixelCount,
      fileSize,

      averageRGB: {
        red:
          pixelCount
            ? redSum / pixelCount
            : 0,

        green:
          pixelCount
            ? greenSum / pixelCount
            : 0,

        blue:
          pixelCount
            ? blueSum / pixelCount
            : 0
      },

      minRGB: {
        red: minRed,
        green: minGreen,
        blue: minBlue
      },

      maxRGB: {
        red: maxRed,
        green: maxGreen,
        blue: maxBlue
      }
    };

    const statisticsTime =
      performance.now() -
      statisticsStart;

    self.postMessage({
      type: "step",
      step: "statistics",
      result: statistics,
      duration: statisticsTime
    });

    /*
     * -------------------------------------------------
     * Sequential experiment complete
     * -------------------------------------------------
     */

    const totalTime =
      performance.now() -
      totalStart;

    self.postMessage({
      type: "complete",
      totalTime
    });

  } catch (error) {
    console.error(
      "Sequential worker error:",
      error
    );

    self.postMessage({
      type: "error",
      error:
        error?.message ||
        String(error)
    });
  }
};
