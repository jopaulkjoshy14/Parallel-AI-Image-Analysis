/* =========================================================
   BENCHMARK RUNNER
   =========================================================

   Responsible ONLY for orchestrating:

   Warm-up
   Run 1
   Run 2
   Run 3

   It does not render UI.

   ========================================================= */

import {
  RUN_COUNT
} from "./benchmarkState";


export async function runBenchmarkSuite({
  imageFile,
  runSequential,
  runParallel,
  onWarmupStart,
  onWarmupComplete,
  onRunStart,
  onRunComplete,
  onError
}) {

  if (
    !imageFile
  ) {

    throw new Error(
      "No image selected."
    );

  }


  try {

    /* =====================================================
       WARM-UP
       ===================================================== */

    onWarmupStart?.();


    await runSequential({
      imageFile,
      warmup: true
    });


    await runParallel({
      imageFile,
      warmup: true
    });


    onWarmupComplete?.();


    /* =====================================================
       MEASURED RUNS
       ===================================================== */

    for (
      let runNumber = 1;
      runNumber <= RUN_COUNT;
      runNumber++
    ) {

      onRunStart?.(
        runNumber
      );


      const sequential =
        await runSequential({
          imageFile,
          warmup: false,
          runNumber
        });


      const parallel =
        await runParallel({
          imageFile,
          warmup: false,
          runNumber,
          sequential
        });


      onRunComplete?.({
        runNumber,
        sequential,
        parallel
      });

    }


  } catch (error) {

    onError?.(
      error
    );

    throw error;

  }
}
