/* =========================================================
   AI WORKER
   =========================================================

   Responsibility:
   Perform local AI image classification/object analysis.

   This worker does NOT:
   - perform traditional image analysis
   - update React state
   - manipulate the DOM
   - calculate benchmark averages

   The model remains local so the deployed application does
   not depend on an external inference request at runtime.
   ========================================================= */

import {
  env,
  pipeline
} from "@huggingface/transformers";


/* =========================================================
   LOCAL MODEL CONFIGURATION
   ========================================================= */

env.allowRemoteModels = false;

env.allowLocalModels = true;

env.localModelPath = "/models/";

env.backends.onnx.wasm.wasmPaths =
  "/wasm/";


const MODEL_ID =
  "onnx-community/yolov10n";


let detectorPromise =
  null;


/* =========================================================
   MODEL INITIALIZATION
   ========================================================= */

async function getDetector() {

  if (!detectorPromise) {

    detectorPromise =
      pipeline(
        "object-detection",
        MODEL_ID,
        {
          device: "wasm",
          dtype: "q8"
        }
      );

  }

  return detectorPromise;

}


/* =========================================================
   IMAGE BLOB CREATION
   ========================================================= */

function createImageBitmapFromRGBA(
  rgba,
  width,
  height
) {

  return new ImageData(
    new Uint8ClampedArray(
      rgba
    ),
    width,
    height
  );

}


/* =========================================================
   MESSAGE HANDLER
   ========================================================= */

self.onmessage = async (event) => {

  const {
    rgba,
    width,
    height
  } = event.data;


  try {

    if (
      !rgba ||
      !width ||
      !height
    ) {

      throw new Error(
        "Invalid image data supplied to AI worker."
      );

    }


    const start =
      performance.now();


    /* -------------------------------------------------------
       INITIALIZE MODEL
       ------------------------------------------------------- */

    const detector =
      await getDetector();


    /* -------------------------------------------------------
       CONSTRUCT IMAGE DATA
       ------------------------------------------------------- */

    const imageData =
      createImageBitmapFromRGBA(
        rgba,
        width,
        height
      );


    /* -------------------------------------------------------
       AI INFERENCE
       ------------------------------------------------------- */

    const result =
      await detector(
        imageData
      );


    const duration =
      performance.now() -
      start;


    /* -------------------------------------------------------
       COMPLETE
       ------------------------------------------------------- */

    self.postMessage({

      type: "complete",

      result,

      duration

    });

  } catch (error) {

    console.error(
      "AI worker error:",
      error
    );


    self.postMessage({

      type: "error",

      error:
        error?.message ||
        "AI worker failed."

    });

  }

};
