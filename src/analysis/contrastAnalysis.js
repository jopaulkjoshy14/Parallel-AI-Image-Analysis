/**
 * Calculate image contrast.
 *
 * Responsibility:
 * - Measure tonal variation across the image.
 *
 * Method:
 * - Convert each RGB pixel to perceived luminance.
 * - Calculate the mean luminance.
 * - Calculate luminance standard deviation.
 *
 * Higher standard deviation:
 *     Greater tonal variation / contrast.
 *
 * Lower standard deviation:
 *     More uniform / flat image.
 *
 * Input:
 * - rgba: Uint8ClampedArray or compatible RGBA array.
 *
 * Output:
 * {
 *   averageLuminance: Number,
 *   standardDeviation: Number,
 *   percentage: Number,
 *   level: String
 * }
 */

export function calculateContrast(rgba) {

  if (!rgba || rgba.length === 0) {

    return {
      averageLuminance: 0,
      standardDeviation: 0,
      percentage: 0,
      level: "Low"
    };

  }


  let luminanceSum = 0;

  let pixelCount = 0;


  /*
   * -------------------------------------------------------
   * PASS 1
   *
   * Calculate average luminance.
   * -------------------------------------------------------
   */

  for (
    let i = 0;
    i < rgba.length;
    i += 4
  ) {

    const red =
      rgba[i];

    const green =
      rgba[i + 1];

    const blue =
      rgba[i + 2];


    const luminance =
      (
        0.299 * red +
        0.587 * green +
        0.114 * blue
      );


    luminanceSum +=
      luminance;

    pixelCount++;

  }


  const averageLuminance =
    pixelCount > 0
      ? luminanceSum / pixelCount
      : 0;


  /*
   * -------------------------------------------------------
   * PASS 2
   *
   * Calculate variance.
   * -------------------------------------------------------
   */

  let squaredDifferenceSum = 0;


  for (
    let i = 0;
    i < rgba.length;
    i += 4
  ) {

    const red =
      rgba[i];

    const green =
      rgba[i + 1];

    const blue =
      rgba[i + 2];


    const luminance =
      (
        0.299 * red +
        0.587 * green +
        0.114 * blue
      );


    const difference =
      luminance -
      averageLuminance;


    squaredDifferenceSum +=
      difference * difference;

  }


  const variance =
    pixelCount > 0
      ? squaredDifferenceSum / pixelCount
      : 0;


  /*
   * Standard deviation is used as
   * the primary contrast measurement.
   */

  const standardDeviation =
    Math.sqrt(
      variance
    );


  /*
   * Convert the 0–255 luminance
   * deviation into a simple percentage.
   *
   * 127.5 represents approximately half
   * of the available luminance range.
   */

  const percentage =
    Math.min(
      100,
      (standardDeviation / 127.5) * 100
    );


  /*
   * Provide a human-readable interpretation.
   *
   * These categories are descriptive rather
   * than claiming to be an industry-standard
   * classification.
   */

  let level;

  if (
    standardDeviation < 35
  ) {

    level =
      "Low";

  } else if (
    standardDeviation < 70
  ) {

    level =
      "Moderate";

  } else {

    level =
      "High";

  }


  return {

    averageLuminance:
      Number(
        averageLuminance.toFixed(2)
      ),

    standardDeviation:
      Number(
        standardDeviation.toFixed(2)
      ),

    percentage:
      Number(
        percentage.toFixed(2)
      ),

    level

  };

}
