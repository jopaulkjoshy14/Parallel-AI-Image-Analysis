import {
  calculateHistogram
} from "../utils/imageProcessing";

self.onmessage = (event) => {
  const {
    rgba
  } = event.data;

  const start = performance.now();

  try {
    const histogram =
      calculateHistogram(rgba);

    const duration =
      performance.now() - start;

    self.postMessage({
      type: "complete",
      result: histogram,
      duration
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      error: error.message
    });
  }
};
