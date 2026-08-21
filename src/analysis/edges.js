/* =========================================================
   EDGE / DETAIL ANALYSIS
   =========================================================

   Estimates local image detail by comparing each pixel
   with its right and bottom neighbours.
   ========================================================= */


/**
 * Calculate local luminance variation.
 */
export function calculateEdgeDensity(
  rgba,
  width,
  height
) {

  if (
    !rgba ||
    width <= 0 ||
    height <= 0
  ) {

    return {

      averageEdgeChange: 0,

      edgePercentage: 0,

      classification:
        "Unknown"

    };

  }


  let totalDifference = 0;

  let comparisons = 0;

  let strongEdges = 0;


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
          y * width +
          x
        ) * 4;


      const currentLuminance =
        0.2126 * rgba[currentIndex] +
        0.7152 * rgba[currentIndex + 1] +
        0.0722 * rgba[currentIndex + 2];


      /* ---------------------------------------------------
         RIGHT NEIGHBOUR
         --------------------------------------------------- */

      if (
        x + 1 < width
      ) {

        const neighbourIndex =
          currentIndex + 4;


        const neighbourLuminance =
          0.2126 *
            rgba[neighbourIndex] +
          0.7152 *
            rgba[neighbourIndex + 1] +
          0.0722 *
            rgba[neighbourIndex + 2];


        const difference =
          Math.abs(
            currentLuminance -
            neighbourLuminance
          );


        totalDifference +=
          difference;

        comparisons++;


        if (
          difference >= 32
        ) {

          strongEdges++;

        }

      }


      /* ---------------------------------------------------
         BOTTOM NEIGHBOUR
         --------------------------------------------------- */

      if (
        y + 1 < height
      ) {

        const neighbourIndex =
          currentIndex +
          width * 4;


        const neighbourLuminance =
          0.2126 *
            rgba[neighbourIndex] +
          0.7152 *
            rgba[neighbourIndex + 1] +
          0.0722 *
            rgba[neighbourIndex + 2];


        const difference =
          Math.abs(
            currentLuminance -
            neighbourLuminance
          );


        totalDifference +=
          difference;

        comparisons++;


        if (
          difference >= 32
        ) {

          strongEdges++;

        }

      }

    }

  }


  const averageEdgeChange =
    comparisons > 0
      ? totalDifference /
        comparisons
      : 0;


  const edgePercentage =
    comparisons > 0
      ? (
          strongEdges /
          comparisons
        ) * 100
      : 0;


  let classification;


  if (
    edgePercentage < 5
  ) {

    classification =
      "Low detail";

  } else if (
    edgePercentage < 15
  ) {

    classification =
      "Moderate detail";

  } else if (
    edgePercentage < 30
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

    edgePercentage:
      Number(
        edgePercentage.toFixed(2)
      ),

    classification

  };

}
