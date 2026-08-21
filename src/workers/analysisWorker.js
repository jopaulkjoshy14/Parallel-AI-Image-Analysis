import { kMeans } from "../utils/kmeans";
import {
  calculateHistogram,
  calculateStatistics
} from "../utils/imageProcessing";

self.onmessage = (event) => {
  const {
    pixels,
    rgba,
    width,
    height,
    fileSize
  } = event.data;

  const start = performance.now();

  try {
    // -----------------------------
    // 01. K-Means colour extraction
    // -----------------------------

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


    // -----------------------------
    // 02. RGB Histogram
    // -----------------------------

    const histogramStart =
      performance.now();

    const histogram =
      calculateHistogram(rgba);

    const histogramTime =
      performance.now() -
      histogramStart;


    // -----------------------------
    // 03. Image Statistics
    // -----------------------------

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


    // -----------------------------
    // Total analysis-worker time
    // -----------------------------

    const totalTime =
      performance.now() -
      start;


    self.postMessage({
      type: "complete",

      palette,
      histogram,
      statistics,

      colourTime,
      histogramTime,
      statisticsTime,

      totalTime
    });

  } catch (error) {

    self.postMessage({
      type: "error",
      error:
        error?.message ||
        "Image analysis worker failed"
    });

  }
};
