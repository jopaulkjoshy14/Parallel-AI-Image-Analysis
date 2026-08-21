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

  const start =
    performance.now();

  try {

    /*
     * -------------------------------------------------
     * 01. K-MEANS COLOUR EXTRACTION
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


    /*
     * -------------------------------------------------
     * 02. RGB HISTOGRAM
     * -------------------------------------------------
     */

    const histogramStart =
      performance.now();

    const histogram =
      calculateHistogram(rgba);

    const histogramTime =
      performance.now() -
      histogramStart;


    /*
     * -------------------------------------------------
     * 03. IMAGE STATISTICS
     * -------------------------------------------------
     */

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


    /*
     * -------------------------------------------------
     * TOTAL ANALYSIS TIME
     * -------------------------------------------------
     */

    const totalTime =
      performance.now() -
      start;


    /*
     * -------------------------------------------------
     * SEND RESULT
     * -------------------------------------------------
     */

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


    /*
     * -------------------------------------------------
     * ONE-SHOT WORKER
     * -------------------------------------------------
     */

    self.close();

  } catch (error) {

    console.error(
      "Analysis worker error:",
      error
    );

    self.postMessage({

      type: "error",

      error:
        error?.message ||
        String(error)

    });

    /*
     * Always destroy the worker
     * after failure as well.
     */

    self.close();
  }
};
