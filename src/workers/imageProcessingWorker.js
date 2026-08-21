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

  try {
    /*
     * ---------------------------------------------
     * STEP 1 — K-Means colour extraction
     * ---------------------------------------------
     */

    const colourStart = performance.now();

    const palette = kMeans(
      pixels,
      5,
      15
    );

    const colourTime =
      performance.now() - colourStart;

    self.postMessage({
      type: "step",
      step: "colour",
      result: palette,
      duration: colourTime
    });

    /*
     * ---------------------------------------------
     * STEP 2 — RGB histogram
     * ---------------------------------------------
     */

    const histogramStart = performance.now();

    const histogram =
      calculateHistogram(rgba);

    const histogramTime =
      performance.now() - histogramStart;

    self.postMessage({
      type: "step",
      step: "histogram",
      result: histogram,
      duration: histogramTime
    });

    /*
     * ---------------------------------------------
     * STEP 3 — Image statistics
     * ---------------------------------------------
     */

    const statisticsStart = performance.now();

    const statistics =
      calculateStatistics(
        rgba,
        width,
        height,
        fileSize
      );

    const statisticsTime =
      performance.now() - statisticsStart;

    self.postMessage({
      type: "step",
      step: "statistics",
      result: statistics,
      duration: statisticsTime
    });

    /*
     * ---------------------------------------------
     * Worker complete
     * ---------------------------------------------
     */

    self.postMessage({
      type: "complete",
      totalTime:
        colourTime +
        histogramTime +
        statisticsTime
    });

  } catch (error) {
    console.error(
      "Image processing worker error:",
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
