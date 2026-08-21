/* =========================================================
   IMAGE PROCESSING UTILITIES
   =========================================================

   Responsibility:
   - Load an image file
   - Convert it to RGBA pixel data
   - Provide deterministic pixel sampling

   This module contains no:
   - React
   - Workers
   - UI
   - benchmarking
   - AI
   ========================================================= */


/**
 * Load an image file into an RGBA ImageData-like object.
 */
export async function loadImageData(file) {

  if (!(file instanceof File)) {
    throw new Error("Invalid image file.");
  }

  const imageUrl = URL.createObjectURL(file);

  try {

    const image = new Image();

    image.decoding = "async";

    image.src = imageUrl;

    await image.decode();

    const canvas = document.createElement("canvas");

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context =
      canvas.getContext("2d", {
        willReadFrequently: true
      });

    if (!context) {
      throw new Error(
        "Unable to create 2D canvas context."
      );
    }

    context.drawImage(
      image,
      0,
      0
    );

    const imageData =
      context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

    return {
      data: imageData.data,
      width: canvas.width,
      height: canvas.height
    };

  } finally {

    URL.revokeObjectURL(imageUrl);

  }

}


/**
 * Create a deterministic RGB sample from RGBA data.
 *
 * Sampling keeps palette analysis predictable and prevents
 * K-Means from becoming unnecessarily expensive on very
 * large images.
 */
export function samplePixels(
  rgba,
  sampleSize = 12000
) {

  if (
    !rgba ||
    rgba.length < 4
  ) {
    return [];
  }

  const pixelCount =
    Math.floor(
      rgba.length / 4
    );

  const target =
    Math.min(
      sampleSize,
      pixelCount
    );

  if (target <= 0) {
    return [];
  }

  const pixels = [];

  const step =
    pixelCount / target;

  for (
    let i = 0;
    i < target;
    i++
  ) {

    const pixelIndex =
      Math.floor(
        i * step
      );

    const index =
      pixelIndex * 4;

    pixels.push([
      rgba[index],
      rgba[index + 1],
      rgba[index + 2]
    ]);

  }

  return pixels;
}
