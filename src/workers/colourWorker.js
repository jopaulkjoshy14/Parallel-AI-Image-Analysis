import { kMeans } from "../utils/kmeans";

self.onmessage = (event) => {
  const {
    pixels,
    k = 5
  } = event.data;

  const start = performance.now();

  try {
    const palette = kMeans(
      pixels,
      k,
      15
    );

    const duration =
      performance.now() - start;

    self.postMessage({
      type: "complete",
      result: palette,
      duration
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      error: error.message
    });
  }
};
