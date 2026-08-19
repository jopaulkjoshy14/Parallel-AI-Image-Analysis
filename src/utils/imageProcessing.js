export async function loadImageData(file) {
  const bitmap = await createImageBitmap(file);

  const maxDimension = 800;

  const scale = Math.min(
    1,
    maxDimension /
      Math.max(bitmap.width, bitmap.height)
  );

  const width = Math.max(
    1,
    Math.round(bitmap.width * scale)
  );

  const height = Math.max(
    1,
    Math.round(bitmap.height * scale)
  );

  const canvas = new OffscreenCanvas(
    width,
    height
  );

  const context = canvas.getContext("2d", {
    willReadFrequently: true
  });

  context.drawImage(
    bitmap,
    0,
    0,
    width,
    height
  );

  const imageData =
    context.getImageData(
      0,
      0,
      width,
      height
    );

  bitmap.close();

  return {
    data: imageData.data,
    width,
    height
  };
}

export function samplePixels(
  rgba,
  sampleLimit = 12000
) {
  const pixels = [];

  const totalPixels = rgba.length / 4;

  const step = Math.max(
    1,
    Math.floor(totalPixels / sampleLimit)
  );

  for (
    let i = 0;
    i < rgba.length;
    i += step * 4
  ) {
    const alpha = rgba[i + 3];

    if (alpha < 128) {
      continue;
    }

    pixels.push([
      rgba[i],
      rgba[i + 1],
      rgba[i + 2]
    ]);
  }

  return pixels;
}

export function calculateHistogram(rgba) {
  const red = new Array(256).fill(0);
  const green = new Array(256).fill(0);
  const blue = new Array(256).fill(0);

  for (let i = 0; i < rgba.length; i += 4) {
    red[rgba[i]]++;
    green[rgba[i + 1]]++;
    blue[rgba[i + 2]]++;
  }

  return {
    red,
    green,
    blue
  };
}

export function calculateStatistics(
  rgba,
  width,
  height,
  fileSize
) {
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let totalBrightness = 0;

  const pixelCount = rgba.length / 4;

  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];

    totalR += r;
    totalG += g;
    totalB += b;

    totalBrightness +=
      0.299 * r +
      0.587 * g +
      0.114 * b;
  }

  return {
    width,
    height,
    pixelCount,
    fileSize,
    aspectRatio: width / height,
    averageRGB: {
      r: Math.round(totalR / pixelCount),
      g: Math.round(totalG / pixelCount),
      b: Math.round(totalB / pixelCount)
    },
    averageBrightness:
      Math.round(
        totalBrightness / pixelCount
      )
  };
}
