import {
  pipeline,
  env,
  RawImage
} from "@huggingface/transformers";

env.backends.onnx.wasm.wasmPaths =
  "/wasm/";

self.onmessage = async (event) => {
  const {
    rgba,
    width,
    height
  } = event.data;

  const start =
    performance.now();

  try {
    /*
     * -------------------------------------------------
     * STEP 1
     * Load RT-DETR model
     *
     * A new model instance is created for this
     * worker execution only.
     * -------------------------------------------------
     */

    const model =
      await pipeline(
        "object-detection",
        "onnx-community/rfdetr_nano-ONNX",
        {
          device: "wasm",
          dtype: "q8"
        }
      );

    /*
     * -------------------------------------------------
     * STEP 2
     * Convert RGBA data to RawImage
     * -------------------------------------------------
     */

    const image =
      new RawImage(
        new Uint8ClampedArray(rgba),
        width,
        height,
        4
      );

    /*
     * -------------------------------------------------
     * STEP 3
     * AI inference
     * -------------------------------------------------
     */

    const output =
      await model(image, {
        threshold: 0.40
      });

    const duration =
      performance.now() - start;

    /*
     * -------------------------------------------------
     * STEP 4
     * Send result
     * -------------------------------------------------
     */

    self.postMessage({
      type: "complete",
      result: output,
      duration
    });

    /*
     * -------------------------------------------------
     * STEP 5
     * Destroy this worker context
     *
     * The worker cannot process another image.
     * -------------------------------------------------
     */

    self.close();

  } catch (error) {

    console.error(
      "AI worker error:",
      error
    );

    self.postMessage({
      type: "error",
      error:
        error?.message ||
        String(error)
    });

    /*
     * Close even when inference fails.
     */

    self.close();
  }
};
