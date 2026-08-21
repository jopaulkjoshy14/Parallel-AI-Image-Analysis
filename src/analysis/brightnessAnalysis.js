/**
 * Calculate the average perceived brightness of an RGBA image.
 *
 * Responsibility:
 * - Calculate average luminance/brightness
 *
 * Input:
 * - rgba: Uint8ClampedArray or compatible RGBA pixel array
 *
 * Output:
 * {
 *   average: Number,
 *   percentage: Number
 * }
 *
 * The calculation uses the standard relative-luminance
 * approximation:
 *
 *   0.299R + 0.587G + 0.114B
 *
 * Alpha is intentionally ignored because brightness describes
 * the visible RGB colour information.
 */

export function calculateBrightness(rgba) {

  if (!rgba || rgba.length === 0) {
    return {
      average: 0,
      percentage: 0
    };
  }

  let brightnessSum = 0;

  let pixelCount = 0;

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


    const brightness =
      (
        0.299 * red +
        0.587 * green +
        0.114 * blue
      );


    brightnessSum +=
      brightness;

    pixelCount++;

  }


  const average =
    pixelCount > 0
      ? brightnessSum / pixelCount
      : 0;


  const percentage =
    (average / 255) * 100;


  return {

    average:
      Number(
        average.toFixed(2)
      ),

    percentage:
      Number(
        percentage.toFixed(2)
      )

  };

}
