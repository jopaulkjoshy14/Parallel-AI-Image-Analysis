/* =========================================================
   SEQUENTIAL ANALYSIS WORKER
   =========================================================

   Responsibility:
   Execute the complete image-analysis workload
   sequentially, one operation after another.

   This worker does NOT:
   - manage React state
   - manipulate the DOM
   - perform parallel scheduling
   - calculate benchmark averages

   Message in:
   {
     rgba,
     pixels,
     width,
     height,
     fileSize
   }

   Messages out:
   - step
   - complete
   - error
   ========================================================= */

import {
  extractDominantPalette
} from "../analysis/palette.js";

import {
  calculateHistogram
} from "../analysis/histogram.js";

import {
  calculateBrightness
} from "../analysis/brightness.js";

import {
  calculateContrast
} from "../analysis/contrast.js";

import {
  calculateEntropy
} from "../analysis/entropy.js";

import {
  calculateEdgeDensity
} from "../analysis/edges.js";


/* =========================================================
   MESSAGE HANDLER
   ========================================================= */

self.onmessage = async (event) => {

  try {

    const {
      rgba,
      pixels,
      width,
      height,
      fileSize
    } = event.data;


    if (
      !rgba ||
      !width ||
      !height
    ) {

      throw new Error(
        "Invalid image data supplied to sequential worker."
      );

    }


    const totalStart =
      performance.now();


    /* =====================================================
       1. DOMINANT COLOUR PALETTE
       ===================================================== */

    const colourStart =
      performance.now();

    const palette =
      extractDominantPalette(
        pixels
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


    /* =====================================================
       2. HISTOGRAM
       ===================================================== */

    const histogramStart =
      performance.now();

    const histogram =
      calculateHistogram(
        rgba
      );

    const histogramTime =
      performance.now() -
      histogramStart;


    self.postMessage({

      type: "step",

      step: "histogram",

      result: histogram,

      duration: histogramTime

    });


    /* =====================================================
       3. BRIGHTNESS
       ===================================================== */

    const brightnessStart =
      performance.now();

    const brightness =
      calculateBrightness(
        rgba
      );

    const brightnessTime =
      performance.now() -
      brightnessStart;


    self.postMessage({

      type: "step",

      step: "brightness",

      result: brightness,

      duration: brightnessTime

    });


    /* =====================================================
       4. CONTRAST
       ===================================================== */

    const contrastStart =
      performance.now();

    const contrast =
      calculateContrast(
        rgba
      );

    const contrastTime =
      performance.now() -
      contrastStart;


    self.postMessage({

      type: "step",

      step: "contrast",

      result: contrast,

      duration: contrastTime

    });


    /* =====================================================
       5. ENTROPY
       ===================================================== */

    const entropyStart =
      performance.now();

    const entropy =
      calculateEntropy(
        rgba
      );

    const entropyTime =
      performance.now() -
      entropyStart;


    self.postMessage({

      type: "step",

      step: "entropy",

      result: entropy,

      duration: entropyTime

    });


    /* =====================================================
       6. EDGE / DETAIL ANALYSIS
       ===================================================== */

    const edgeStart =
      performance.now();

    const edges =
      calculateEdgeDensity(
        rgba,
        width,
        height
      );

    const edgeTime =
      performance.now() -
      edgeStart;


    self.postMessage({

      type: "step",

      step: "edges",

      result: edges,

      duration: edgeTime

    });


    /* =====================================================
       COMPLETE
       ===================================================== */

    const totalTime =
      performance.now() -
      totalStart;


    self.postMessage({

      type: "complete",

      results: {

        palette,

        histogram,

        brightness,

        contrast,

        entropy,

        edges

      },

      timings: {

        colour:
          colourTime,

        histogram:
          histogramTime,

        brightness:
          brightnessTime,

        contrast:
          contrastTime,

        entropy:
          entropyTime,

        edges:
          edgeTime

      },

      totalTime,

      fileSize:
        fileSize ?? 0

    });

  } catch (error) {

    self.postMessage({

      type: "error",

      error:
        error?.message ||
        "Sequential worker failed."

    });

  }

};
