/* =========================================================
   CONTRAST ANALYSIS
   =========================================================

   Responsibility:
   Measure tonal/channel variation in an image.

   No:
   - React
   - DOM
   - Workers
   - UI
   ========================================================= */


export function calculateContrast(
  rgba
) {

  if (
    !rgba ||
    rgba.length < 4
  ) {

    return {
      score: 0,
      minimum: 0,
      maximum: 0,
      classification: "Unknown"
    };

  }

  let minimum = 255;
  let maximum = 0;

  let luminanceTotal = 0;
  let pixelCount = 0;

  for (
    let index = 0;
    index < rgba.length;
    index += 4
  ) {

    const red =
      rgba[index];

    const green =
      rgba[index + 1];

    const blue =
      rgba[index + 2];

    const value =
      0.2126 * red +
      0.7152 * green +
      0.0722 * blue;

    minimum =
      Math.min(
        minimum,
        value
      );

    maximum =
      Math.max(
        maximum,
        value
      );

    luminanceTotal += value;

    pixelCount++;

  }

  const range =
    maximum - minimum;

  const average =
    luminanceTotal /
    pixelCount;

  const score =
    Math.min(
      100,
      (
        range / 255
      ) * 100
    );

  let classification;

  if (score < 25) {
    classification = "Low contrast";
  } else if (score < 50) {
    classification = "Moderate contrast";
  } else if (score < 75) {
    classification = "High contrast";
  } else {
    classification = "Very high contrast";
  }

  return {

    score:
      Number(
        score.toFixed(2)
      ),

    minimum:
      Number(
        minimum.toFixed(2)
      ),

    maximum:
      Number(
        maximum.toFixed(2)
      ),

    range:
      Number(
        range.toFixed(2)
      ),

    averageLuminance:
      Number(
        average.toFixed(2)
      ),

    classification

  };

}
