/**
 * Calculate image entropy.
 *
 * Responsibility:
 * - Measure the information content of an image
 *   using grayscale intensity distribution.
 *
 * Method:
 * 1. Convert RGB pixels to grayscale.
 * 2. Build a 256-bin grayscale histogram.
 * 3. Calculate Shannon entropy:
 *
 *      H = -Σ p(x) log2(p(x))
 *
 * Higher entropy:
 *     More varied intensity distribution.
 *
 * Lower entropy:
 *     More uniform intensity distribution.
 *
 * Input:
 * - rgba: Uint8ClampedArray or compatible RGBA array.
 *
 * Output:
 * {
 *   value: Number,
 *   percentage: Number,
 *   level: String
 * }
 */

export function calculateEntropy(rgba) {

  if (!rgba || rgba.length === 0) {

    return {
      value: 0,
      percentage: 0,
      level: "Low"
    };

  }


  const histogram =
    new Array(256).fill(0);


  let pixelCount = 0;


  /*
   * -------------------------------------------------------
   * BUILD GRAYSCALE HISTOGRAM
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


    /*
     * Convert RGB to perceived grayscale intensity.
     */

    const grayscale =
      Math.round(
        0.299 * red +
        0.587 * green +
        0.114 * blue
      );


    histogram[grayscale]++;

    pixelCount++;

  }


  /*
   * -------------------------------------------------------
   * SHANNON ENTROPY
   * -------------------------------------------------------
   */

  let entropy = 0;


  for (
    let i = 0;
    i < histogram.length;
    i++
  ) {

    const frequency =
      histogram[i];


    if (frequency === 0) {
      continue;
    }


    const probability =
      frequency /
      pixelCount;


    entropy -=
      probability *
      Math.log2(
        probability
      );

  }


  /*
   * A grayscale image has a theoretical
   * maximum entropy of log2(256) = 8 bits.
   *
   * Convert that to a percentage so it is
   * easier to display in the UI.
   */

  const percentage =
    (entropy / 8) * 100;


  /*
   * Descriptive classification.
   *
   * These thresholds are application-level
   * interpretations, not universal standards.
   */

  let level;


  if (
    entropy < 3
  ) {

    level =
      "Low";

  } else if (
    entropy < 6
  ) {

    level =
      "Moderate";

  } else {

    level =
      "High";

  }


  return {

    value:
      Number(
        entropy.toFixed(3)
      ),

    percentage:
      Number(
        percentage.toFixed(2)
      ),

    level

  };

}
