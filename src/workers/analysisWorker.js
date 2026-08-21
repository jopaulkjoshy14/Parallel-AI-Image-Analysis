/* =========================================================
   ANALYSIS WORKER
   =========================================================

   RESPONSIBILITY:
   Execute lightweight image-analysis operations in a
   dedicated Web Worker.

   This worker handles:
   - Dominant colour palette
   - RGB histogram
   - Brightness
   - Image statistics
   - Colour distribution
   - Image complexity
   - Human-readable image description

   It does NOT handle:
   - AI inference
   - React state
   - DOM operations
   - UI rendering
   - Sequential benchmarking
   - Parallel benchmarking

   ========================================================= */

import {
  analyseImage,
  describeImage
} from "../utils/imageAnalysis";


/* =========================================================
   WORKER MESSAGE HANDLER
   ========================================================= */

self.onmessage = (event) => {

  const startTime =
    performance.now();


  try {

    const {
      rgba,
      width,
      height,
      paletteOptions
    } = event.data;


    /* -----------------------------------------------------
       VALIDATE INPUT
       ----------------------------------------------------- */

    if (
      !rgba ||
      typeof width !== "number" ||
      typeof height !== "number"
    ) {

      throw new Error(
        "Invalid image data supplied to analysis worker."
      );

    }


    if (
      width <= 0 ||
      height <= 0
    ) {

      throw new Error(
        "Invalid image dimensions."
      );

    }


    /* -----------------------------------------------------
       ANALYSE IMAGE
       ----------------------------------------------------- */

    const analysisStart =
      performance.now();


    const analysis =
      analyseImage(
        rgba,
        width,
        height,
        {
          palette:
            paletteOptions
        }
      );


    const analysisTime =
      performance.now() -
      analysisStart;


    /* -----------------------------------------------------
       GENERATE IMAGE DESCRIPTION
       ----------------------------------------------------- */

    const description =
      describeImage(
        analysis
      );


    /* -----------------------------------------------------
       TOTAL WORKER TIME
       ----------------------------------------------------- */

    const totalTime =
      performance.now() -
      startTime;


    /* -----------------------------------------------------
       RETURN RESULT
       ----------------------------------------------------- */

    self.postMessage({

      type:
        "complete",

      palette:
        analysis.palette,

      histogram:
        analysis.histogram,

      brightness:
        analysis.brightness,

      statistics:
        analysis.statistics,

      colourDistribution:
        analysis.colourDistribution,

      complexity:
        analysis.complexity,

      description,

      analysisTime,

      totalTime

    });

  } catch (error) {

    /* -----------------------------------------------------
       WORKER ERROR
       ----------------------------------------------------- */

    self.postMessage({

      type:
        "error",

      error:
        error?.message ||
        "Image analysis worker failed."

    });

  }

};
