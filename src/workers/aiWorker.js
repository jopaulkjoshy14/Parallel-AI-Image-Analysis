/* =========================================================
   AI WORKER
   =========================================================

   RESPONSIBILITY:
   Perform AI image classification in a dedicated Web Worker.

   This worker handles ONLY:
   - ONNX Runtime initialisation
   - Model loading
   - Image preprocessing
   - AI inference
   - Prediction extraction

   It does NOT handle:
   - Colour analysis
   - Histogram calculation
   - Brightness analysis
   - Image statistics
   - React state
   - DOM operations
   - UI rendering
   - Performance comparison

   ========================================================= */

import * as ort from "onnxruntime-web";


/* =========================================================
   MODEL CONFIGURATION
   ========================================================= */

const MODEL_PATH =
  "/models/onnx/model_quantized.onnx";

const CONFIG_PATH =
  "/models/config.json";

const PREPROCESSOR_CONFIG_PATH =
  "/models/preprocessor_config.json";

const WASM_PATH =
  "/models/";


/* =========================================================
   RUNTIME STATE
   ========================================================= */

let sessionPromise =
  null;

let modelConfig =
  null;

let preprocessorConfig =
  null;


/* =========================================================
   ONNX RUNTIME CONFIGURATION
   ========================================================= */

ort.env.wasm.wasmPaths =
  WASM_PATH;

ort.env.wasm.numThreads =
  1;

ort.env.wasm.simd =
  true;


/* =========================================================
   LOAD JSON CONFIGURATION
   ========================================================= */

async function loadJson(
  path
) {

  const response =
    await fetch(path);


  if (
    !response.ok
  ) {

    throw new Error(
      `Unable to load AI configuration: ${path}`
    );

  }


  return response.json();

}


/* =========================================================
   LOAD AI MODEL
   ========================================================= */

async function loadModel() {

  if (
    !sessionPromise
  ) {

    sessionPromise =
      (async () => {

        modelConfig =
          await loadJson(
            CONFIG_PATH
          );


        preprocessorConfig =
          await loadJson(
            PREPROCESSOR_CONFIG_PATH
          );


        return ort.InferenceSession.create(
          MODEL_PATH,
          {
            executionProviders:
              ["wasm"],

            graphOptimizationLevel:
              "all"
          }
        );

      })();

  }


  return sessionPromise;

}


/* =========================================================
   IMAGE RESIZE
   ========================================================= */

function resizeImage(
  rgba,
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight
) {

  const source =
    new Uint8ClampedArray(
      rgba
    );


  const output =
    new Float32Array(
      targetWidth *
      targetHeight *
      3
    );


  for (
    let y = 0;
    y < targetHeight;
    y++
  ) {

    const sourceY =
      Math.min(
        sourceHeight - 1,
        Math.floor(
          y *
          sourceHeight /
          targetHeight
        )
      );


    for (
      let x = 0;
      x < targetWidth;
      x++
    ) {

      const sourceX =
        Math.min(
          sourceWidth - 1,
          Math.floor(
            x *
            sourceWidth /
            targetWidth
          )
        );


      const sourceIndex =
        (
          sourceY *
          sourceWidth +
          sourceX
        ) * 4;


      const targetIndex =
        (
          y *
          targetWidth +
          x
        ) * 3;


      output[targetIndex] =
        source[sourceIndex];

      output[targetIndex + 1] =
        source[sourceIndex + 1];

      output[targetIndex + 2] =
        source[sourceIndex + 2];

    }

  }


  return output;

}


/* =========================================================
   NORMALISE IMAGE
   ========================================================= */

function normalizePixels(
  pixels
) {

  const normalized =
    new Float32Array(
      pixels.length
    );


  /*
   * ImageNet-style normalisation.
   *
   * These values are also used by many standard
   * vision-classification models.
   */

  const mean = [
    0.485,
    0.456,
    0.406
  ];

  const std = [
    0.229,
    0.224,
    0.225
  ];


  const pixelCount =
    pixels.length / 3;


  for (
    let i = 0;
    i < pixelCount;
    i++
  ) {

    const sourceIndex =
      i * 3;


    normalized[sourceIndex] =
      (
        pixels[sourceIndex] /
        255 -
        mean[0]
      ) /
      std[0];


    normalized[sourceIndex + 1] =
      (
        pixels[sourceIndex + 1] /
        255 -
        mean[1]
      ) /
      std[1];


    normalized[sourceIndex + 2] =
      (
        pixels[sourceIndex + 2] /
        255 -
        mean[2]
      ) /
      std[2];

  }


  return normalized;

}


/* =========================================================
   HWC → CHW
   ========================================================= */

function convertToCHW(
  pixels
) {

  const pixelCount =
    pixels.length / 3;


  const chw =
    new Float32Array(
      pixels.length
    );


  const channelSize =
    pixelCount;


  for (
    let i = 0;
    i < pixelCount;
    i++
  ) {

    chw[i] =
      pixels[
        i * 3
      ];

    chw[
      channelSize + i
    ] =
      pixels[
        i * 3 + 1
      ];

    chw[
      channelSize * 2 + i
    ] =
      pixels[
        i * 3 + 2
      ];

  }


  return chw;

}


/* =========================================================
   FIND INPUT NAME
   ========================================================= */

function getInputName(
  session
) {

  if (
    !session.inputNames ||
    session.inputNames.length === 0
  ) {

    throw new Error(
      "AI model does not expose an input tensor."
    );

  }


  return session.inputNames[0];

}


/* =========================================================
   FIND OUTPUT NAME
   ========================================================= */

function getOutputName(
  session
) {

  if (
    !session.outputNames ||
    session.outputNames.length === 0
  ) {

    throw new Error(
      "AI model does not expose an output tensor."
    );

  }


  return session.outputNames[0];

}


/* =========================================================
   EXTRACT TOP PREDICTION
   ========================================================= */

function getTopPrediction(
  output
) {

  const values =
    output.data;


  let bestIndex =
    0;

  let bestValue =
    -Infinity;


  for (
    let i = 0;
    i < values.length;
    i++
  ) {

    if (
      values[i] >
      bestValue
    ) {

      bestValue =
        values[i];

      bestIndex =
        i;

    }

  }


  /*
   * Some classification models return logits while others
   * return probabilities. We convert logits to probabilities
   * using softmax.
   */

  let maxLogit =
    -Infinity;


  for (
    let i = 0;
    i < values.length;
    i++
  ) {

    maxLogit =
      Math.max(
        maxLogit,
        values[i]
      );

  }


  let sum =
    0;


  for (
    let i = 0;
    i < values.length;
    i++
  ) {

    sum +=
      Math.exp(
        values[i] -
        maxLogit
      );

  }


  const confidence =
    sum > 0
      ? Math.exp(
          values[bestIndex] -
          maxLogit
        ) / sum
      : 0;


  const labels =
    modelConfig?.id2label ||
    modelConfig?.labels ||
    {};


  const label =
    labels[bestIndex] ??
    labels[String(bestIndex)] ??
    `Class ${bestIndex}`;


  return {

    label,

    classIndex:
      bestIndex,

    confidence:
      Number(
        (
          confidence *
          100
        ).toFixed(2)
      )

  };

}


/* =========================================================
   RUN INFERENCE
   ========================================================= */

async function classifyImage(
  rgba,
  width,
  height
) {

  const session =
    await loadModel();


  /*
   * Read the model's expected input dimensions.
   *
   * The bundled model is normally 224 × 224.
   * Fall back to 224 when the model metadata uses
   * dynamic dimensions.
   */

  let targetWidth =
    224;

  let targetHeight =
    224;


  const inputName =
    getInputName(
      session
    );


  const inputMetadata =
    session.inputMetadata?.[inputName];


  const dimensions =
    inputMetadata?.dimensions;


  if (
    Array.isArray(
      dimensions
    ) &&
    dimensions.length >= 4
  ) {

    const modelHeight =
      Number(
        dimensions[2]
      );

    const modelWidth =
      Number(
        dimensions[3]
      );


    if (
      Number.isFinite(
        modelWidth
      ) &&
      modelWidth > 0
    ) {

      targetWidth =
        modelWidth;

    }


    if (
      Number.isFinite(
        modelHeight
      ) &&
      modelHeight > 0
    ) {

      targetHeight =
        modelHeight;

    }

  }


  const resized =
    resizeImage(
      rgba,
      width,
      height,
      targetWidth,
      targetHeight
    );


  const normalized =
    normalizePixels(
      resized
    );


  const chw =
    convertToCHW(
      normalized
    );


  const tensor =
    new ort.Tensor(
      "float32",
      chw,
      [
        1,
        3,
        targetHeight,
        targetWidth
      ]
    );


  const results =
    await session.run({
      [inputName]:
        tensor
    });


  const outputName =
    getOutputName(
      session
    );


  const output =
    results[
      outputName
    ];


  if (
    !output
  ) {

    throw new Error(
      "AI model returned no output."
    );

  }


  return getTopPrediction(
    output
  );

}


/* =========================================================
   WORKER MESSAGE HANDLER
   ========================================================= */

self.onmessage =
  async (event) => {

    const startTime =
      performance.now();


    try {

      const {
        rgba,
        width,
        height
      } = event.data;


      /* ---------------------------------------------------
         VALIDATE INPUT
         --------------------------------------------------- */

      if (
        !rgba ||
        !width ||
        !height
      ) {

        throw new Error(
          "Invalid image data supplied to AI worker."
        );

      }


      /* ---------------------------------------------------
         AI INFERENCE
         --------------------------------------------------- */

      const result =
        await classifyImage(
          rgba,
          width,
          height
        );


      const totalTime =
        performance.now() -
        startTime;


      /* ---------------------------------------------------
         RETURN RESULT
         --------------------------------------------------- */

      self.postMessage({

        type:
          "complete",

        result,

        duration:
          totalTime

      });

    } catch (error) {

      /* ---------------------------------------------------
         ERROR
         --------------------------------------------------- */

      self.postMessage({

        type:
          "error",

        error:
          error?.message ||
          "AI worker failed."

      });

    }

  };
