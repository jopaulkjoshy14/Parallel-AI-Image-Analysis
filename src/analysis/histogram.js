/* =========================================================
   RGB + LUMINANCE HISTOGRAM
   ========================================================= */

const HISTOGRAM_BINS = 256;


/**
 * Calculate RGB and luminance histograms.
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
    !rgba ||
    rgba.length < 4
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

    const redValue =
      rgba[index];

    const greenValue =
      rgba[index + 1];

    const blueValue =
      rgba[index + 2];


    red[redValue]++;

    green[greenValue]++;

    blue[blueValue]++;


    const luminanceValue =
      Math.round(
        0.2126 * redValue +
        0.7152 * greenValue +
        0.0722 * blueValue
      );


    luminance[
      Math.max(
        0,
        Math.min(
          255,
          luminanceValue
        )
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
