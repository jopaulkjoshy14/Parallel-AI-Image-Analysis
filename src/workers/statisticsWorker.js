import {
  calculateStatistics
} from "../utils/imageProcessing";

self.onmessage = (event) => {
  const {
    rgba,
    width,
    height,
    fileSize
  } = event.data;

  const start = performance.now();

  try {
    const statistics =
      calculateStatistics(
        rgba,
        width,
        height,
        fileSize
      );

    const duration =
      performance.now() - start;

    self.postMessage({
      type: "complete",
      result: statistics,
      duration
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      error: error.message
    });
  }
};
