/**
 * Calculate image edge density.
 *
 * Responsibility:
 * - Detect intensity changes between neighbouring pixels.
 * - Estimate how much structural detail exists in the image.
 *
 * Method:
 * - Convert pixels to grayscale.
 * - Apply a lightweight gradient calculation using
 *   horizontal and vertical neighbouring pixels.
 * - Count pixels whose gradient exceeds the edge threshold.
 *
 * Input:
 * - rgba: Uint8ClampedArray or compatible RGBA array
 * - width: image width
 * - height: image height
 *
 * Output:
 * {
 *   edgePixels: Number,
 *   edgeDensity: Number,
 *   percentage: Number,
 *   level: String
 * }
 */

export function calculateEdgeDensity(
  rgba,
  width,
  height
) {

  if (
    !rgba ||
    !width ||
    !height ||
    width < 2 ||
    height < 2
  ) {

    return {
      edgePixels: 0,
      edgeDensity: 0,
      percentage: 0,
      level: "Low"
    };

  }


  /*
   * -------------------------------------------------------
   * GRAYSCALE IMAGE
   * -------------------------------------------------------
   *
   * Creating a grayscale buffer makes the edge
   * calculation much easier to perform.
   */

  const grayscale =
    new Uint8Array(
      width * height
    );


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

      const pixelIndex =
        (
          y * width +
          x
        );

      const rgbaIndex =
        pixelIndex * 4;


      const red =
        rgba[rgbaIndex];

      const green =
        rgba[rgbaIndex + 1];

      const blue =
        rgba[rgbaIndex + 2];


      grayscale[pixelIndex] =
        Math.round(
          0.299 * red +
          0.587 * green +
          0.114 * blue
        );

    }

  }


  /*
   * -------------------------------------------------------
   * EDGE DETECTION
   * -------------------------------------------------------
   *
   * We compare each pixel with its right and
   * lower neighbours.
   *
   * This is intentionally lightweight. The goal
   * is image-detail analysis rather than producing
   * a display-quality edge map.
   */

  const EDGE_THRESHOLD = 30;

  let edgePixels = 0;

  let analysedPixels = 0;


  for (
    let y = 0;
    y < height - 1;
    y++
  ) {

    for (
      let x = 0;
      x < width - 1;
      x++
    ) {

      const currentIndex =
        y * width + x;

      const rightIndex =
        currentIndex + 1;

      const bottomIndex =
        currentIndex + width;


      const current =
        grayscale[currentIndex];

      const right =
        grayscale[rightIndex];

      const bottom =
        grayscale[bottomIndex];


      const horizontalDifference =
        Math.abs(
          current - right
        );

      const verticalDifference =
        Math.abs(
          current - bottom
        );


      /*
       * Combine horizontal and vertical
       * intensity changes into a simple
       * gradient magnitude.
       */

      const gradient =
        Math.sqrt(
          (
            horizontalDifference *
            horizontalDifference
          ) +
          (
            verticalDifference *
            verticalDifference
          )
        );


      if (
        gradient >=
        EDGE_THRESHOLD
      ) {

        edgePixels++;

      }


      analysedPixels++;

    }

  }


  /*
   * -------------------------------------------------------
   * EDGE DENSITY
   * -------------------------------------------------------
   */

  const edgeDensity =
    analysedPixels > 0
      ? edgePixels /
        analysedPixels
      : 0;


  const percentage =
    edgeDensity * 100;


  /*
   * -------------------------------------------------------
   * INTERPRETATION
   * -------------------------------------------------------
   *
   * These are application-level descriptive
   * categories rather than universal standards.
   */

  let level;


  if (
    edgeDensity < 0.05
  ) {

    level =
      "Low";

  } else if (
    edgeDensity < 0.15
  ) {

    level =
      "Moderate";

  } else {

    level =
      "High";

  }


  return {

    edgePixels,

    edgeDensity:
      Number(
        edgeDensity.toFixed(4)
      ),

    percentage:
      Number(
        percentage.toFixed(2)
      ),

    level

  };

}
