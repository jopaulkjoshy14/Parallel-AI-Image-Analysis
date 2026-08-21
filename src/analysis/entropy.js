/* =========================================================
   IMAGE ENTROPY ANALYSIS
   =========================================================

   Responsibility:
   Estimate luminance entropy.

   Entropy gives us a meaningful measure of the diversity
   of luminance values in an image.

   No:
   - React
   - DOM
   - Workers
   - UI
   ========================================================= */


const BIN_COUNT = 256;


export function calculateEntropy(
  rgba
) {

  if (
    !rgba ||
    rgba.length < 4
  ) {

    return {
      entropy: 0,
      normalized: 0,
      classification: "Unknown"
    };

  }

  const histogram =
    new Array(
      BIN_COUNT
    ).fill(0);

  let pixelCount = 0;

  for (
    let index = 0;
    index < rgba.length;
    index += 4
  ) {

    const luminance =
      Math.round(
        0.2126 * rgba[index] +
        0.7152 * rgba[index + 1] +
        0.0722 * rgba[index + 2]
      );

    histogram[luminance]++;

    pixelCount++;

  }

  let entropy = 0;

  for (
    let index = 0;
    index < histogram.length;
    index++
  ) {

    const count =
      histogram[index];

    if (count === 0) {
      continue;
    }

    const probability =
      count / pixelCount;

    entropy -=
      probability *
      Math.log2(
        probability
      );

  }

  const maximumEntropy =
    Math.log2(
      BIN_COUNT
    );

  const normalized =
    (
      entropy /
      maximumEntropy
    ) * 100;

  let classification;

  if (normalized < 25) {
    classification = "Low information diversity";
  } else if (normalized < 50) {
    classification = "Moderate information diversity";
  } else if (normalized < 75) {
    classification = "High information diversity";
  } else {
    classification = "Very high information diversity";
  }

  return {

    entropy:
      Number(
        entropy.toFixed(3)
      ),

    normalized:
      Number(
        normalized.toFixed(2)
      ),

    classification

  };

}
