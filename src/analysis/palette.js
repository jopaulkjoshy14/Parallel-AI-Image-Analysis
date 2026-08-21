/* =========================================================
   DOMINANT COLOUR PALETTE
   ========================================================= */

const DEFAULT_PALETTE_SIZE = 5;
const DEFAULT_ITERATIONS = 8;


/**
 * Calculate RGB Euclidean distance.
 */
function colourDistance(a, b) {

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
 * Convert RGB values to hexadecimal.
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
    .replace(/^/, "#");

}


/**
 * Extract dominant colours using K-Means clustering.
 */
export function extractDominantPalette(
  pixels,
  options = {}
) {

  const paletteSize =
    options.paletteSize ??
    DEFAULT_PALETTE_SIZE;

  const iterations =
    options.iterations ??
    DEFAULT_ITERATIONS;

  if (
    !Array.isArray(pixels) ||
    pixels.length === 0
  ) {

    return [];

  }

  const clusterCount =
    Math.min(
      paletteSize,
      pixels.length
    );

  const centroids = [];

  const step =
    pixels.length /
    clusterCount;


  /* -------------------------------------------------------
     INITIAL CENTROIDS
     ------------------------------------------------------- */

  for (
    let index = 0;
    index < clusterCount;
    index++
  ) {

    const pixel =
      pixels[
        Math.floor(
          index * step
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
     K-MEANS
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
      let index = 0;
      index < pixels.length;
      index++
    ) {

      const pixel =
        pixels[index];

      let nearestCluster = 0;

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

          nearestCluster =
            cluster;

        }

      }


      assignments[index] =
        nearestCluster;

      sums[nearestCluster][0] +=
        pixel[0];

      sums[nearestCluster][1] +=
        pixel[1];

      sums[nearestCluster][2] +=
        pixel[2];

      sums[nearestCluster][3]++;

    }


    for (
      let cluster = 0;
      cluster < clusterCount;
      cluster++
    ) {

      const count =
        sums[cluster][3];

      if (count === 0) {
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
     BUILD RESULTS
     ------------------------------------------------------- */

  const counts =
    new Array(
      clusterCount
    ).fill(0);


  for (
    const cluster of assignments
  ) {

    counts[cluster]++;

  }


  return centroids
    .map(
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
    )
    .filter(
      (colour) =>
        colour.count > 0
    )
    .sort(
      (a, b) =>
        b.percentage -
        a.percentage
    );

}
