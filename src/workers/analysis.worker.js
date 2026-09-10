/*
 * Parallel Vision Lab
 * Deep Analysis Worker
 *
 * Worker 2
 *
 * Responsibilities:
 * - Decode image
 * - Resize large images for mobile-friendly processing
 * - Extract 5 dominant colours using K-Means
 * - RGB histogram
 * - Luminance histogram
 * - Basic image statistics
 * - Entropy
 * - Sharpness
 * - Exposure
 * - Spatial brightness analysis
 *
 * This worker intentionally contains the analysis logic directly.
 * There are no additional worker/module chains.
 */

const MAX_DIMENSION = 1280;
const COLOR_COUNT = 5;
const KMEANS_ITERATIONS = 12;
const HISTOGRAM_BINS = 256;

/* -----------------------------------------------------------
 * Messaging
 * --------------------------------------------------------- */

function send(type, id, payload = {}) {
  self.postMessage({
    type,
    id,
    payload
  });
}

function makeError(error, stage, requestType) {
  return {
    name: error?.name || "Error",
    message: error?.message || String(error),
    stack: error?.stack || null,
    stage,
    requestType
  };
}

/* -----------------------------------------------------------
 * Image decoding
 * --------------------------------------------------------- */

async function decodeImage(buffer, mimeType) {
  if (!buffer) {
    throw new Error("Analysis Worker received an empty image buffer.");
  }

  const blob = new Blob([buffer], {
    type: mimeType || "image/jpeg"
  });

  const bitmap = await createImageBitmap(blob);

  let width = bitmap.width;
  let height = bitmap.height;

  /*
   * Large images can create very large ImageData objects.
   * Resize them before analysis to keep mobile memory usage reasonable.
   */
  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(width, height)
  );

  const targetWidth = Math.max(
    1,
    Math.round(width * scale)
  );

  const targetHeight = Math.max(
    1,
    Math.round(height * scale)
  );

  const canvas = new OffscreenCanvas(
    targetWidth,
    targetHeight
  );

  const context = canvas.getContext("2d", {
    willReadFrequently: true
  });

  if (!context) {
    bitmap.close();
    throw new Error("Could not create OffscreenCanvas 2D context.");
  }

  context.drawImage(
    bitmap,
    0,
    0,
    targetWidth,
    targetHeight
  );

  bitmap.close();

  const imageData = context.getImageData(
    0,
    0,
    targetWidth,
    targetHeight
  );

  return {
    imageData,
    width: targetWidth,
    height: targetHeight,
    originalWidth: width,
    originalHeight: height,
    resized: scale < 1
  };
}

/* -----------------------------------------------------------
 * Pixel sampling
 * --------------------------------------------------------- */

function samplePixels(imageData, maxSamples = 12000) {
  const data = imageData.data;
  const pixelCount = data.length / 4;

  const samples = [];

  if (pixelCount <= maxSamples) {
    for (let i = 0; i < data.length; i += 4) {
      samples.push([
        data[i],
        data[i + 1],
        data[i + 2]
      ]);
    }

    return samples;
  }

  const step = Math.max(
    1,
    Math.floor(pixelCount / maxSamples)
  );

  for (
    let pixelIndex = 0;
    pixelIndex < pixelCount;
    pixelIndex += step
  ) {
    const i = pixelIndex * 4;

    samples.push([
      data[i],
      data[i + 1],
      data[i + 2]
    ]);
  }

  return samples;
}

/* -----------------------------------------------------------
 * K-Means colour extraction
 * --------------------------------------------------------- */

function colourDistanceSquared(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];

  return (
    dr * dr +
    dg * dg +
    db * db
  );
}

function initialiseCentroids(samples, k) {
  const centroids = [];

  if (samples.length === 0) {
    return centroids;
  }

  /*
   * Deterministic initialization.
   *
   * This is intentional: repeated benchmark runs should
   * produce stable analysis results.
   */
  for (let i = 0; i < k; i++) {
    const index = Math.floor(
      (i * samples.length) / k
    );

    const source =
      samples[Math.min(index, samples.length - 1)];

    centroids.push([
      source[0],
      source[1],
      source[2]
    ]);
  }

  return centroids;
}

function runKMeans(samples, k = COLOR_COUNT) {
  if (!samples.length) {
    return [];
  }

  const actualK = Math.min(k, samples.length);

  let centroids = initialiseCentroids(
    samples,
    actualK
  );

  const assignments = new Int32Array(
    samples.length
  );

  for (
    let iteration = 0;
    iteration < KMEANS_ITERATIONS;
    iteration++
  ) {
    const sums = Array.from(
      { length: actualK },
      () => [0, 0, 0, 0]
    );

    /*
     * Assignment step
     */
    for (let i = 0; i < samples.length; i++) {
      const pixel = samples[i];

      let bestCluster = 0;
      let bestDistance = Infinity;

      for (let c = 0; c < actualK; c++) {
        const distance = colourDistanceSquared(
          pixel,
          centroids[c]
        );

        if (distance < bestDistance) {
          bestDistance = distance;
          bestCluster = c;
        }
      }

      assignments[i] = bestCluster;

      sums[bestCluster][0] += pixel[0];
      sums[bestCluster][1] += pixel[1];
      sums[bestCluster][2] += pixel[2];
      sums[bestCluster][3] += 1;
    }

    /*
     * Update step
     */
    let changed = false;

    for (let c = 0; c < actualK; c++) {
      const count = sums[c][3];

      if (count === 0) {
        continue;
      }

      const next = [
        Math.round(sums[c][0] / count),
        Math.round(sums[c][1] / count),
        Math.round(sums[c][2] / count)
      ];

      if (
        next[0] !== centroids[c][0] ||
        next[1] !== centroids[c][1] ||
        next[2] !== centroids[c][2]
      ) {
        changed = true;
      }

      centroids[c] = next;
    }

    if (!changed) {
      break;
    }
  }

  /*
   * Calculate cluster populations again using final
   * centroids.
   */
  const counts = new Array(actualK).fill(0);

  for (const pixel of samples) {
    let bestCluster = 0;
    let bestDistance = Infinity;

    for (let c = 0; c < actualK; c++) {
      const distance = colourDistanceSquared(
        pixel,
        centroids[c]
      );

      if (distance < bestDistance) {
        bestDistance = distance;
        bestCluster = c;
      }
    }

    counts[bestCluster]++;
  }

  const total = samples.length;

  const colours = centroids.map(
    (rgb, index) => ({
      rgb: {
        r: rgb[0],
        g: rgb[1],
        b: rgb[2]
      },
      hex: rgbToHex(
        rgb[0],
        rgb[1],
        rgb[2]
      ),
      percentage:
        (counts[index] / total) * 100
    })
  );

  /*
   * Largest colour clusters first.
   */
  colours.sort(
    (a, b) =>
      b.percentage - a.percentage
  );

  return colours;
}

function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((value) =>
        Math.max(
          0,
          Math.min(
            255,
            Math.round(value)
          )
        )
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
      .toUpperCase()
  );
}

/* -----------------------------------------------------------
 * RGB + luminance histogram
 * --------------------------------------------------------- */

function calculateHistograms(imageData) {
  const data = imageData.data;

  const red = new Array(HISTOGRAM_BINS).fill(0);
  const green = new Array(HISTOGRAM_BINS).fill(0);
  const blue = new Array(HISTOGRAM_BINS).fill(0);
  const luminance = new Array(HISTOGRAM_BINS).fill(0);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    red[r]++;
    green[g]++;
    blue[b]++;

    /*
     * ITU-R BT.601 perceived luminance approximation.
     */
    const y = Math.round(
      0.299 * r +
      0.587 * g +
      0.114 * b
    );

    luminance[y]++;
  }

  return {
    red,
    green,
    blue,
    luminance
  };
}

/* -----------------------------------------------------------
 * Basic statistics
 * --------------------------------------------------------- */

function calculateStatistics(imageData) {
  const data = imageData.data;
  const pixelCount = data.length / 4;

  if (pixelCount === 0) {
    throw new Error(
      "Image contains no pixels."
    );
  }

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sumLuminance = 0;

  const luminances = new Float64Array(
    pixelCount
  );

  let pixelIndex = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    sumR += r;
    sumG += g;
    sumB += b;

    const luminance =
      0.299 * r +
      0.587 * g +
      0.114 * b;

    luminances[pixelIndex++] =
      luminance;

    sumLuminance += luminance;
  }

  const meanR = sumR / pixelCount;
  const meanG = sumG / pixelCount;
  const meanB = sumB / pixelCount;
  const meanLuminance =
    sumLuminance / pixelCount;

  let variance = 0;

  for (
    let i = 0;
    i < luminances.length;
    i++
  ) {
    const difference =
      luminances[i] -
      meanLuminance;

    variance +=
      difference * difference;
  }

  variance /= pixelCount;

  return {
    pixelCount,
    meanRGB: {
      r: meanR,
      g: meanG,
      b: meanB
    },
    meanLuminance,
    luminanceStdDev: Math.sqrt(
      variance
    )
  };
}

/* -----------------------------------------------------------
 * Entropy
 * --------------------------------------------------------- */

function calculateEntropy(luminanceHistogram, pixelCount) {
  if (!pixelCount) {
    return 0;
  }

  let entropy = 0;

  for (
    let i = 0;
    i < luminanceHistogram.length;
    i++
  ) {
    const count =
      luminanceHistogram[i];

    if (count === 0) {
      continue;
    }

    const probability =
      count / pixelCount;

    entropy -=
      probability *
      Math.log2(probability);
  }

  return entropy;
}

/* -----------------------------------------------------------
 * Sharpness
 *
 * Laplacian variance is used as a deterministic sharpness
 * indicator.
 * --------------------------------------------------------- */

function calculateSharpness(
  imageData,
  width,
  height
) {
  if (
    width < 3 ||
    height < 3
  ) {
    return 0;
  }

  const data = imageData.data;

  let sum = 0;
  let sumSquared = 0;
  let count = 0;

  for (
    let y = 1;
    y < height - 1;
    y++
  ) {
    for (
      let x = 1;
      x < width - 1;
      x++
    ) {
      const center =
        (y * width + x) * 4;

      const top =
        ((y - 1) * width + x) * 4;

      const bottom =
        ((y + 1) * width + x) * 4;

      const left =
        (y * width + x - 1) * 4;

      const right =
        (y * width + x + 1) * 4;

      const centerLum =
        0.299 * data[center] +
        0.587 * data[center + 1] +
        0.114 * data[center + 2];

      const topLum =
        0.299 * data[top] +
        0.587 * data[top + 1] +
        0.114 * data[top + 2];

      const bottomLum =
        0.299 * data[bottom] +
        0.587 * data[bottom + 1] +
        0.114 * data[bottom + 2];

      const leftLum =
        0.299 * data[left] +
        0.587 * data[left + 1] +
        0.114 * data[left + 2];

      const rightLum =
        0.299 * data[right] +
        0.587 * data[right + 1] +
        0.114 * data[right + 2];

      const laplacian =
        topLum +
        bottomLum +
        leftLum +
        rightLum -
        4 * centerLum;

      sum += laplacian;
      sumSquared +=
        laplacian * laplacian;

      count++;
    }
  }

  if (count === 0) {
    return 0;
  }

  const mean = sum / count;

  return (
    sumSquared / count -
    mean * mean
  );
}

/* -----------------------------------------------------------
 * Exposure analysis
 * --------------------------------------------------------- */

function calculateExposure(
  luminanceHistogram,
  pixelCount
) {
  if (!pixelCount) {
    return {
      classification: "unknown",
      darkPercentage: 0,
      brightPercentage: 0,
      normalPercentage: 0
    };
  }

  let darkPixels = 0;
  let brightPixels = 0;

  for (
    let i = 0;
    i <= 50;
    i++
  ) {
    darkPixels +=
      luminanceHistogram[i];
  }

  for (
    let i = 205;
    i < HISTOGRAM_BINS;
    i++
  ) {
    brightPixels +=
      luminanceHistogram[i];
  }

  const darkPercentage =
    (darkPixels / pixelCount) * 100;

  const brightPercentage =
    (brightPixels / pixelCount) * 100;

  const normalPercentage =
    Math.max(
      0,
      100 -
        darkPercentage -
        brightPercentage
    );

  let classification = "balanced";

  if (
    darkPercentage >= 40 &&
    darkPercentage > brightPercentage
  ) {
    classification = "underexposed";
  } else if (
    brightPercentage >= 40 &&
    brightPercentage > darkPercentage
  ) {
    classification = "overexposed";
  } else if (
    darkPercentage >= 25 &&
    brightPercentage >= 25
  ) {
    classification = "high dynamic range";
  }

  return {
    classification,
    darkPercentage,
    brightPercentage,
    normalPercentage
  };
}

/* -----------------------------------------------------------
 * Spatial brightness analysis
 * --------------------------------------------------------- */

function calculateSpatialAnalysis(
  imageData,
  width,
  height
) {
  const data = imageData.data;

  let centerSum = 0;
  let centerCount = 0;

  let outerSum = 0;
  let outerCount = 0;

  /*
   * Central rectangle:
   * 50% of width × 50% of height.
   */
  const centerLeft =
    width * 0.25;

  const centerRight =
    width * 0.75;

  const centerTop =
    height * 0.25;

  const centerBottom =
    height * 0.75;

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
      const index =
        (y * width + x) * 4;

      const luminance =
        0.299 * data[index] +
        0.587 * data[index + 1] +
        0.114 * data[index + 2];

      const isCenter =
        x >= centerLeft &&
        x < centerRight &&
        y >= centerTop &&
        y < centerBottom;

      if (isCenter) {
        centerSum += luminance;
        centerCount++;
      } else {
        outerSum += luminance;
        outerCount++;
      }
    }
  }

  const centerMean =
    centerCount
      ? centerSum / centerCount
      : 0;

  const outerMean =
    outerCount
      ? outerSum / outerCount
      : 0;

  return {
    centerMeanLuminance: centerMean,
    outerMeanLuminance: outerMean,
    centerOuterDifference:
      centerMean - outerMean,
    centerBrighterThanOuter:
      centerMean > outerMean
  };
}

/* -----------------------------------------------------------
 * Main analysis pipeline
 * --------------------------------------------------------- */

async function analyseImage(
  buffer,
  mimeType
) {
  const totalStart =
    performance.now();

  const decoded =
    await decodeImage(
      buffer,
      mimeType
    );

  const {
    imageData,
    width,
    height,
    originalWidth,
    originalHeight,
    resized
  } = decoded;

  const samples =
    samplePixels(
      imageData
    );

  const colours =
    runKMeans(
      samples,
      COLOR_COUNT
    );

  const histograms =
    calculateHistograms(
      imageData
    );

  const statistics =
    calculateStatistics(
      imageData
    );

  const entropy =
    calculateEntropy(
      histograms.luminance,
      statistics.pixelCount
    );

  const sharpness =
    calculateSharpness(
      imageData,
      width,
      height
    );

  const exposure =
    calculateExposure(
      histograms.luminance,
      statistics.pixelCount
    );

  const spatial =
    calculateSpatialAnalysis(
      imageData,
      width,
      height
    );

  const totalMs =
    performance.now() -
    totalStart;

  return {
    image: {
      originalWidth,
      originalHeight,
      processedWidth: width,
      processedHeight: height,
      resized
    },

    colours,

    statistics,

    entropy,

    sharpness,

    exposure,

    spatial,

    histogram: histograms,

    timings: {
      totalMs
    }
  };
}

/* -----------------------------------------------------------
 * Worker API
 * --------------------------------------------------------- */

self.onmessage = async (
  event
) => {
  const {
    type,
    id,
    payload = {}
  } = event.data || {};

  try {
    if (type === "ping") {
      send("result", id, {
        stage: "worker-alive",
        worker: "Deep Analysis Worker"
      });

      return;
    }

    if (type === "analyze") {
      send("status", id, {
        stage: "analysis-start",
        message:
          "Starting deterministic image analysis..."
      });

      const result =
        await analyseImage(
          payload.buffer,
          payload.mimeType
        );

      send("result", id, {
        stage: "analysis-complete",
        worker:
          "Deep Analysis Worker",
        result
      });

      return;
    }

    throw new Error(
      `Unknown Analysis Worker request: ${type}`
    );
  } catch (error) {
    send("error", id,
      makeError(
        error,
        type === "analyze"
          ? "Deep image analysis"
          : "Worker request",
        type
      )
    );
  }
};

/* -----------------------------------------------------------
 * Boot message
 * --------------------------------------------------------- */

self.postMessage({
  type: "boot",
  payload: {
    worker: "Deep Analysis Worker",
    message:
      "Deep Analysis Worker booted."
  }
});
