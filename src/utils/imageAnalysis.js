/* =========================================================
   IMAGE ANALYSIS UTILITIES
   =========================================================

   Purpose:
   Centralised, reusable image-analysis operations.

   This file contains ONLY pure image-analysis functions.
   It does NOT:
   - create Web Workers
   - update React state
   - access the DOM
   - handle UI
   - handle files
   - perform AI inference

   Workers can import these functions and execute them
   independently.

   Current operations:
   1. Dominant colour / palette extraction
   2. RGB histogram
   3. Brightness analysis
   4. Image statistics
   5. Colour distribution
   6. Image complexity metrics

   ========================================================= */


/* =========================================================
   CONFIGURATION
   ========================================================= */

const DEFAULT_PALETTE_SIZE = 5;

const DEFAULT_KMEANS_ITERATIONS = 8;

const DEFAULT_SAMPLE_SIZE = 12000;

const HISTOGRAM_BINS = 256;


/* =========================================================
   INTERNAL HELPERS
   ========================================================= */

/**
 * Clamp a number to the supplied range.
 */
function clamp(
  value,
  min,
  max
) {

  return Math.min(
    Math.max(
      value,
      min
    ),
    max
  );

}


/**
 * Calculate Euclidean distance between two RGB colours.
 */
function colourDistance(
  a,
  b
) {

  const red =
    a[0] - b[0];

  const green =
    a[1] - b[1];

  const blue =
    a[2] - b[2];

  return Math.sqrt(
    red * red +
    green * green +
    blue * blue
  );

}


/**
 * Convert RGB values to a hexadecimal colour.
 */
function rgbToHex(
  red,
  green,
  blue
) {

  return [
    red,
    green,
    blue
  ]
    .map(
      (value) =>
        clamp(
          Math.round(value),
          0,
          255
        )
          .toString(16)
          .padStart(2, "0")
    )
    .join("")
    .toUpperCase()
    .replace(
      /^/,
      "#"
    );

}


/**
 * Convert RGB to perceived luminance.
 */
function calculateLuminance(
  red,
  green,
  blue
) {

  return (
    0.2126 * red +
    0.7152 * green +
    0.0722 * blue
  );

}


/**
 * Create a deterministic pixel sample.

 * Sampling rather than processing every pixel makes the
 * colour-clustering operation predictable and manageable
 * for large images.
 */
function createPixelSample(
  rgba,
  sampleSize = DEFAULT_SAMPLE_SIZE
) {

  if (
    !rgba ||
    rgba.length < 4
  ) {

    return [];

  }


  const pixelCount =
    Math.floor(
      rgba.length / 4
    );


  if (
    pixelCount <= sampleSize
  ) {

    const result = [];

    for (
      let index = 0;
      index < rgba.length;
      index += 4
    ) {

      result.push([
        rgba[index],
        rgba[index + 1],
        rgba[index + 2]
      ]);

    }

    return result;

  }


  const result = [];

  const step =
    pixelCount / sampleSize;


  for (
    let i = 0;
    i < sampleSize;
    i++
  ) {

    const pixelIndex =
      Math.floor(
        i * step
      );

    const index =
      pixelIndex * 4;


    result.push([
      rgba[index],
      rgba[index + 1],
      rgba[index + 2]
    ]);

  }


  return result;

}


/* =========================================================
   1. DOMINANT COLOUR PALETTE
   ========================================================= */

/**
 * Extract a representative colour palette using
 * lightweight K-Means clustering.
 *
 * Returns:
 *
 * [
 *   {
 *     hex,
 *     rgb,
 *     percentage
 *   }
 * ]
 */
export function extractDominantPalette(
  rgba,
  options = {}
) {

  const paletteSize =
    options.paletteSize ??
    DEFAULT_PALETTE_SIZE;

  const iterations =
    options.iterations ??
    DEFAULT_KMEANS_ITERATIONS;

  const sampleSize =
    options.sampleSize ??
    DEFAULT_SAMPLE_SIZE;


  const pixels =
    createPixelSample(
      rgba,
      sampleSize
    );


  if (
    pixels.length === 0
  ) {

    return [];

  }


  const clusterCount =
    Math.min(
      paletteSize,
      pixels.length
    );


  /* -------------------------------------------------------
     INITIAL CENTROIDS
     ------------------------------------------------------- */

  const centroids =
    [];

  const centroidStep =
    pixels.length /
    clusterCount;


  for (
    let i = 0;
    i < clusterCount;
    i++
  ) {

    const pixel =
      pixels[
        Math.floor(
          i * centroidStep
        )
      ];

    centroids.push([
      pixel[0],
      pixel[1],
      pixel[2]
    ]);

  }


  let assignments =
    new Array(
      pixels.length
    ).fill(0);


  /* -------------------------------------------------------
     K-MEANS ITERATIONS
     ------------------------------------------------------- */

  for (
    let iteration = 0;
    iteration < iterations;
    iteration++
  ) {

    const sums =
      Array.from(
        {
          length:
            clusterCount
        },
        () => [0, 0, 0, 0]
      );


    for (
      let i = 0;
      i < pixels.length;
      i++
    ) {

      const pixel =
        pixels[i];

      let nearest =
        0;

      let shortestDistance =
        Infinity;


      for (
        let cluster = 0;
        cluster < clusterCount;
        cluster++
      ) {

        const distance =
          colourDistance(
            pixel,
            centroids[cluster]
          );


        if (
          distance <
          shortestDistance
        ) {

          shortestDistance =
            distance;

          nearest =
            cluster;

        }

      }


      assignments[i] =
        nearest;


      sums[nearest][0] +=
        pixel[0];

      sums[nearest][1] +=
        pixel[1];

      sums[nearest][2] +=
        pixel[2];

      sums[nearest][3] +=
        1;

    }


    for (
      let cluster = 0;
      cluster < clusterCount;
      cluster++
    ) {

      const count =
        sums[cluster][3];


      if (
        count === 0
      ) {

        continue;

      }


      centroids[cluster] = [

        sums[cluster][0] /
          count,

        sums[cluster][1] /
          count,

        sums[cluster][2] /
          count

      ];

    }

  }


  /* -------------------------------------------------------
     BUILD PALETTE
     ------------------------------------------------------- */

  const counts =
    new Array(
      clusterCount
    ).fill(0);


  assignments.forEach(
    (cluster) => {

      counts[cluster]++;

    }
  );


  const palette =
    centroids.map(
      (
        centroid,
        index
      ) => {

        const red =
          Math.round(
            centroid[0]
          );

        const green =
          Math.round(
            centroid[1]
          );

        const blue =
          Math.round(
            centroid[2]
          );


        return {

          hex:
            rgbToHex(
              red,
              green,
              blue
            ),

          rgb: {
            r: red,
            g: green,
            b: blue
          },

          percentage:
            Number(
              (
                counts[index] /
                pixels.length *
                100
              ).toFixed(2)
            ),

          count:
            counts[index]

        };

      }
    );


  return palette
    .filter(
      (colour) =>
        colour.count > 0
    )
    .sort(
      (
        a,
        b
      ) =>
        b.percentage -
        a.percentage
    );

}


/* =========================================================
   2. RGB HISTOGRAM
   ========================================================= */

/**
 * Calculate RGB histograms.
 *
 * Returns:
 *
 * {
 *   red: [],
 *   green: [],
 *   blue: [],
 *   luminance: []
 * }
 */
export function calculateHistogram(
  rgba
) {

  const red =
    new Array(
      HISTOGRAM_BINS
    ).fill(0);

  const green =
    new Array(
      HISTOGRAM_BINS
    ).fill(0);

  const blue =
    new Array(
      HISTOGRAM_BINS
    ).fill(0);

  const luminance =
    new Array(
      HISTOGRAM_BINS
    ).fill(0);


  if (
    !rgba
  ) {

    return {
      red,
      green,
      blue,
      luminance
    };

  }


  for (
    let index = 0;
    index < rgba.length;
    index += 4
  ) {

    const r =
      rgba[index];

    const g =
      rgba[index + 1];

    const b =
      rgba[index + 2];


    red[r]++;

    green[g]++;

    blue[b]++;


    const brightness =
      Math.round(
        calculateLuminance(
          r,
          g,
          b
        )
      );


    luminance[
      clamp(
        brightness,
        0,
        255
      )
    ]++;

  }


  return {
    red,
    green,
    blue,
    luminance
  };

}


/* =========================================================
   3. BRIGHTNESS ANALYSIS
   ========================================================= */

/**
 * Analyse overall image brightness.
 *
 * Returns:
 *
 * {
 *   average,
 *   minimum,
 *   maximum,
 *   normalized,
 *   classification
 * }
 */
export function calculateBrightness(
  rgba
) {

  if (
    !rgba ||
    rgba.length < 4
  ) {

    return {

      average: 0,
      minimum: 0,
      maximum: 0,
      normalized: 0,
      classification:
        "Unknown"

    };

  }


  let total =
    0;

  let minimum =
    255;

  let maximum =
    0;

  let count =
    0;


  for (
    let index = 0;
    index < rgba.length;
    index += 4
  ) {

    const brightness =
      calculateLuminance(
        rgba[index],
        rgba[index + 1],
        rgba[index + 2]
      );


    total +=
      brightness;

    minimum =
      Math.min(
        minimum,
        brightness
      );

    maximum =
      Math.max(
        maximum,
        brightness
      );

    count++;

  }


  const average =
    total / count;


  let classification;


  if (
    average < 64
  ) {

    classification =
      "Dark";

  } else if (
    average < 128
  ) {

    classification =
      "Moderately dark";

  } else if (
    average < 192
  ) {

    classification =
      "Moderately bright";

  } else {

    classification =
      "Bright";

  }


  return {

    average:
      Number(
        average.toFixed(2)
      ),

    minimum:
      Number(
        minimum.toFixed(2)
      ),

    maximum:
      Number(
        maximum.toFixed(2)
      ),

    normalized:
      Number(
        (
          average /
          255
        ).toFixed(4)
      ),

    classification

  };

}


/* =========================================================
   4. IMAGE STATISTICS
   ========================================================= */

/**
 * Calculate basic RGB and luminance statistics.
 *
 * These values help describe the image and also provide
 * meaningful lightweight CPU work for benchmarking.
 */
export function calculateImageStatistics(
  rgba
) {

  if (
    !rgba ||
    rgba.length < 4
  ) {

    return {

      pixelCount: 0,

      averageRGB: {
        r: 0,
        g: 0,
        b: 0
      },

      channelRange: {
        r: 0,
        g: 0,
        b: 0
      },

      averageLuminance: 0,

      contrast: 0,

      saturation: 0

    };

  }


  let redTotal =
    0;

  let greenTotal =
    0;

  let blueTotal =
    0;

  let luminanceTotal =
    0;

  let saturationTotal =
    0;


  let redMinimum =
    255;

  let greenMinimum =
    255;

  let blueMinimum =
    255;

  let redMaximum =
    0;

  let greenMaximum =
    0;

  let blueMaximum =
    0;


  const pixelCount =
    Math.floor(
      rgba.length / 4
    );


  for (
    let index = 0;
    index < rgba.length;
    index += 4
  ) {

    const r =
      rgba[index];

    const g =
      rgba[index + 1];

    const b =
      rgba[index + 2];


    redTotal +=
      r;

    greenTotal +=
      g;

    blueTotal +=
      b;


    redMinimum =
      Math.min(
        redMinimum,
        r
      );

    greenMinimum =
      Math.min(
        greenMinimum,
        g
      );

    blueMinimum =
      Math.min(
        blueMinimum,
        b
      );


    redMaximum =
      Math.max(
        redMaximum,
        r
      );

    greenMaximum =
      Math.max(
        greenMaximum,
        g
      );

    blueMaximum =
      Math.max(
        blueMaximum,
        b
      );


    luminanceTotal +=
      calculateLuminance(
        r,
        g,
        b
      );


    const channelMaximum =
      Math.max(
        r,
        g,
        b
      );

    const channelMinimum =
      Math.min(
        r,
        g,
        b
      );


    saturationTotal +=
      channelMaximum -
      channelMinimum;

  }


  const averageRed =
    redTotal /
    pixelCount;

  const averageGreen =
    greenTotal /
    pixelCount;

  const averageBlue =
    blueTotal /
    pixelCount;

  const averageLuminance =
    luminanceTotal /
    pixelCount;

  const averageSaturation =
    saturationTotal /
    pixelCount;


  return {

    pixelCount,

    averageRGB: {

      r:
        Number(
          averageRed.toFixed(2)
        ),

      g:
        Number(
          averageGreen.toFixed(2)
        ),

      b:
        Number(
          averageBlue.toFixed(2)
        )

    },

    channelRange: {

      r:
        redMaximum -
        redMinimum,

      g:
        greenMaximum -
        greenMinimum,

      b:
        blueMaximum -
        blueMinimum

    },

    averageLuminance:
      Number(
        averageLuminance.toFixed(2)
      ),

    contrast:
      Number(
        (
          (
            Math.max(
              redMaximum,
              greenMaximum,
              blueMaximum
            ) -
            Math.min(
              redMinimum,
              greenMinimum,
              blueMinimum
            )
          ) /
          255 *
          100
        ).toFixed(2)
      ),

    saturation:
      Number(
        (
          averageSaturation /
          255 *
          100
        ).toFixed(2)
      )

  };

}


/* =========================================================
   5. COLOUR DISTRIBUTION
   ========================================================= */

/**
 * Analyse broad colour distribution.
 *
 * The result describes whether the image is predominantly:
 * - warm
 * - cool
 * - neutral
 *
 * This is useful as an image-description metric rather than
 * merely adding another arbitrary CPU operation.
 */
export function calculateColourDistribution(
  rgba
) {

  if (
    !rgba ||
    rgba.length < 4
  ) {

    return {

      warmPercentage: 0,
      coolPercentage: 0,
      neutralPercentage: 0,

      dominantTemperature:
        "Unknown"

    };

  }


  let warm =
    0;

  let cool =
    0;

  let neutral =
    0;

  let pixelCount =
    0;


  for (
    let index = 0;
    index < rgba.length;
    index += 4
  ) {

    const r =
      rgba[index];

    const g =
      rgba[index + 1];

    const b =
      rgba[index + 2];


    const redBlueDifference =
      r - b;

    const greenDifference =
      Math.abs(
        g -
        (
          r + b
        ) / 2
      );


    if (
      redBlueDifference >
        20 &&
      r >= b
    ) {

      warm++;

    } else if (
      redBlueDifference <
        -20
    ) {

      cool++;

    } else {

      neutral++;

    }


    /*
     * Keep the green channel relevant to prevent the
     * classification from becoming a simple red-vs-blue
     * comparison.
     */

    if (
      greenDifference < 12 &&
      Math.abs(
        redBlueDifference
      ) < 30
    ) {

      neutral++;

    }


    pixelCount++;

  }


  /*
   * The neutral counter can receive a second contribution
   * for very neutral pixels. Normalize against the actual
   * classification contributions rather than pixel count.
   */

  const total =
    warm +
    cool +
    neutral;


  const warmPercentage =
    total > 0
      ? warm / total * 100
      : 0;

  const coolPercentage =
    total > 0
      ? cool / total * 100
      : 0;

  const neutralPercentage =
    total > 0
      ? neutral / total * 100
      : 0;


  let dominantTemperature;


  if (
    warmPercentage >
      coolPercentage &&
    warmPercentage >
      neutralPercentage
  ) {

    dominantTemperature =
      "Warm";

  } else if (
    coolPercentage >
      warmPercentage &&
    coolPercentage >
      neutralPercentage
  ) {

    dominantTemperature =
      "Cool";

  } else {

    dominantTemperature =
      "Neutral";

  }


  return {

    warmPercentage:
      Number(
        warmPercentage.toFixed(2)
      ),

    coolPercentage:
      Number(
        coolPercentage.toFixed(2)
      ),

    neutralPercentage:
      Number(
        neutralPercentage.toFixed(2)
      ),

    dominantTemperature

  };

}


/* =========================================================
   6. IMAGE COMPLEXITY
   ========================================================= */

/**
 * Estimate image complexity using neighbouring-pixel
 * luminance differences.
 *
 * Higher values indicate stronger local variation such as
 * edges, texture and fine detail.
 *
 * This is intentionally a lightweight image-descriptive
 * metric, not a formal computer-vision complexity measure.
 */
export function calculateImageComplexity(
  rgba,
  width,
  height
) {

  if (
    !rgba ||
    !width ||
    !height
  ) {

    return {

      averageEdgeChange: 0,
      complexityScore: 0,
      classification:
        "Unknown"

    };

  }


  let totalDifference =
    0;

  let comparisons =
    0;


  /*
   * Horizontal and vertical neighbouring-pixel comparisons.
   */

  for (
    let y = 0;
    y < height;
    y++
  ) {

    for (
      let x = 0;
      x < width;
      x++
    ) {

      const currentIndex =
        (
          y *
          width +
          x
        ) * 4;


      const currentLuminance =
        calculateLuminance(
          rgba[currentIndex],
          rgba[currentIndex + 1],
          rgba[currentIndex + 2]
        );


      /* -----------------------------------------------
         RIGHT NEIGHBOUR
         ----------------------------------------------- */

      if (
        x + 1 <
        width
      ) {

        const rightIndex =
          currentIndex +
          4;


        const rightLuminance =
          calculateLuminance(
            rgba[rightIndex],
            rgba[rightIndex + 1],
            rgba[rightIndex + 2]
          );


        totalDifference +=
          Math.abs(
            currentLuminance -
            rightLuminance
          );

        comparisons++;

      }


      /* -----------------------------------------------
         BOTTOM NEIGHBOUR
         ----------------------------------------------- */

      if (
        y + 1 <
        height
      ) {

        const bottomIndex =
          currentIndex +
          width * 4;


        const bottomLuminance =
          calculateLuminance(
            rgba[bottomIndex],
            rgba[bottomIndex + 1],
            rgba[bottomIndex + 2]
          );


        totalDifference +=
          Math.abs(
            currentLuminance -
            bottomLuminance
          );

        comparisons++;

      }

    }

  }


  const averageEdgeChange =
    comparisons > 0
      ? totalDifference /
        comparisons
      : 0;


  const complexityScore =
    clamp(
      averageEdgeChange /
        128 *
        100,
      0,
      100
    );


  let classification;


  if (
    complexityScore < 20
  ) {

    classification =
      "Low detail";

  } else if (
    complexityScore < 45
  ) {

    classification =
      "Moderate detail";

  } else if (
    complexityScore < 70
  ) {

    classification =
      "High detail";

  } else {

    classification =
      "Very high detail";

  }


  return {

    averageEdgeChange:
      Number(
        averageEdgeChange.toFixed(2)
      ),

    complexityScore:
      Number(
        complexityScore.toFixed(2)
      ),

    classification

  };

}


/* =========================================================
   7. COMPLETE LIGHTWEIGHT IMAGE ANALYSIS
   ========================================================= */

/**
 * Runs every lightweight image-analysis operation.
 *
 * This function is intended for the Analysis Worker.
 *
 * AI inference is intentionally NOT included here.
 */
export function analyseImage(
  rgba,
  width,
  height,
  options = {}
) {

  const palette =
    extractDominantPalette(
      rgba,
      options.palette
    );


  const histogram =
    calculateHistogram(
      rgba
    );


  const brightness =
    calculateBrightness(
      rgba
    );


  const statistics =
    calculateImageStatistics(
      rgba
    );


  const colourDistribution =
    calculateColourDistribution(
      rgba
    );


  const complexity =
    calculateImageComplexity(
      rgba,
      width,
      height
    );


  return {

    palette,

    histogram,

    brightness,

    statistics,

    colourDistribution,

    complexity

  };

}


/* =========================================================
   8. HUMAN-READABLE IMAGE DESCRIPTION
   ========================================================= */

/**
 * Converts numerical analysis into a concise description
 * that can be displayed by the UI.
 */
export function describeImage(
  analysis
) {

  if (
    !analysis
  ) {

    return {

      summary:
        "No image analysis available.",

      brightness:
        "Unknown",

      temperature:
        "Unknown",

      detail:
        "Unknown",

      saturation:
        null

    };

  }


  const brightness =
    analysis.brightness
      ?.classification ||
    "Unknown";


  const temperature =
    analysis.colourDistribution
      ?.dominantTemperature ||
    "Unknown";


  const detail =
    analysis.complexity
      ?.classification ||
    "Unknown";


  const saturation =
    analysis.statistics
      ?.saturation ??
    null;


  let saturationDescription =
    "moderate colour saturation";


  if (
    typeof saturation ===
    "number"
  ) {

    if (
      saturation < 20
    ) {

      saturationDescription =
        "low colour saturation";

    } else if (
      saturation > 60
    ) {

      saturationDescription =
        "high colour saturation";

    }

  }


  return {

    summary:
      `${brightness}, ${temperature.toLowerCase()} image with ${detail.toLowerCase()} and ${saturationDescription}.`,

    brightness,

    temperature,

    detail,

    saturation

  };

}


/* =========================================================
   9. DEFAULT EXPORT
   ========================================================= */

const imageAnalysis = {

  extractDominantPalette,

  calculateHistogram,

  calculateBrightness,

  calculateImageStatistics,

  calculateColourDistribution,

  calculateImageComplexity,

  analyseImage,

  describeImage

};


export default imageAnalysis;
