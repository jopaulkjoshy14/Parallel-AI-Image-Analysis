/* =========================================================
   BRIGHTNESS ANALYSIS
   =========================================================

   Responsibility:
   Calculate descriptive brightness information.

   No:
   - React
   - DOM
   - Workers
   - UI
   ========================================================= */


function luminance(
  red,
  green,
  blue
) {

  return (
    0.2126 * red +
    0.7152 * green +
    0.0722 * blue
  );

}


export function calculateBrightness(
  rgba
) {

  if (
    !rgba ||
    rgba.length < 4
  ) {

    return {
      average: 0,
      minimum: 0,
      maximum: 0,
      normalized: 0,
      classification: "Unknown"
    };

  }

  let total = 0;
  let minimum = 255;
  let maximum = 0;
  let count = 0;

  for (
    let index = 0;
    index < rgba.length;
    index += 4
  ) {

    const value =
      luminance(
        rgba[index],
        rgba[index + 1],
        rgba[index + 2]
      );

    total += value;

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

    count++;

  }

  const average =
    total / count;

  let classification;

  if (average < 64) {
    classification = "Dark";
  } else if (average < 128) {
    classification = "Moderately dark";
  } else if (average < 192) {
    classification = "Moderately bright";
  } else {
    classification = "Bright";
  }

  return {

    average:
      Number(
        average.toFixed(2)
      ),

    minimum:
      Number(
        minimum.toFixed(2)
      ),

    maximum:
      Number(
        maximum.toFixed(2)
      ),

    normalized:
      Number(
        (
          average / 255
        ).toFixed(4)
      ),

    classification

  };

}
