import React, {
  useEffect,
  useRef,
  useState
} from "react";

import ImageUploader from "./components/ImageUploader";
import SequentialPanel from "./components/SequentialPanel";
import ParallelPanel from "./components/ParallelPanel";
import ComparisonTable from "./components/ComparisonTable";

import {
  loadImageData,
  samplePixels
} from "./utils/imageProcessing";

import {
  calculateSpeedup,
  calculateEfficiency
} from "./utils/performance";


/* =========================================================
   FINAL PARALLEL CONFIGURATION
   ========================================================= */

const PARALLEL_WORKER_COUNT = 2;

const TOTAL_BENCHMARK_RUNS = 3;


/* =========================================================
   WORKER UI STATE
   ========================================================= */

function createInitialWorkers() {
  return [
    {
      id: 1,
      name: "Worker 1",
      task: "AI image classification",
      status: "idle",
      progress: 0,
      duration: null
    },
    {
      id: 2,
      name: "Worker 2",
      task: "Colour + histogram + statistics",
      status: "idle",
      progress: 0,
      duration: null
    }
  ];
}


/* =========================================================
   INITIAL SEQUENTIAL STATE
   ========================================================= */

const initialSequential = {
  status: "Waiting for image",

  palette: [],
  ai: [],
  histogram: null,
  statistics: null,

  colourTime: null,
  aiTime: null,
  histogramTime: null,
  statisticsTime: null,

  totalTime: null
};


/* =========================================================
   INITIAL PARALLEL STATE
   ========================================================= */

const initialParallel = {
  palette: [],
  ai: [],
  histogram: null,
  statistics: null,

  colourTime: null,
  aiTime: null,
  histogramTime: null,
  statisticsTime: null,

  totalTime: null,

  workerCount: PARALLEL_WORKER_COUNT,

  speedup: null,
  efficiency: null,

  workers: createInitialWorkers()
};


/* =========================================================
   APP
   ========================================================= */

export default function App() {

  const [
    imageFile,
    setImageFile
  ] = useState(null);

  const [
    imageUrl,
    setImageUrl
  ] = useState(null);

  const [
    sequential,
    setSequential
  ] = useState(
    initialSequential
  );

  const [
    parallel,
    setParallel
  ] = useState(
    initialParallel
  );

  const [
    running,
    setRunning
  ] = useState(false);

  /*
   * Current benchmark stage.
   *
   * Values:
   * idle
   * warmup
   * run1
   * run2
   * run3
   * complete
   */

  const [
    benchmarkStage,
    setBenchmarkStage
  ] = useState("idle");


  /* =======================================================
     WORKER REFERENCES
     ======================================================= */

  const sequentialWorker =
    useRef(null);

  const analysisWorker =
    useRef(null);

  const aiWorker =
    useRef(null);


  /* =======================================================
     IMAGE URL CLEANUP
     ======================================================= */

  useEffect(() => {

    return () => {

      terminateWorkers();

      if (imageUrl) {

        URL.revokeObjectURL(
          imageUrl
        );

      }

    };

  }, [imageUrl]);


  /* =======================================================
     RESET RESULTS
     ======================================================= */

  function resetResults() {

    setSequential({
      ...initialSequential
    });

    setParallel({
      ...initialParallel,
      workers:
        createInitialWorkers()
    });

    setBenchmarkStage(
      "idle"
    );

  }


  /* =======================================================
     IMAGE SELECTION
     ======================================================= */

  async function handleImageSelected(file) {

    if (running) {
      return;
    }

    terminateWorkers();

    resetResults();

    setImageFile(file);

    if (imageUrl) {

      URL.revokeObjectURL(
        imageUrl
      );

    }

    setImageUrl(
      URL.createObjectURL(file)
    );

  }


  /* =======================================================
     UPDATE WORKER UI
     ======================================================= */

  function updateWorker(
    id,
    changes
  ) {

    setParallel(
      (current) => ({

        ...current,

        workers:
          current.workers.map(
            (worker) =>
              worker.id === id
                ? {
                    ...worker,
                    ...changes
                  }
                : worker
          )

      })
    );

  }


  /* =======================================================
     TERMINATE ALL WORKERS
     
     IMPORTANT:
     Workers NEVER persist between benchmark runs.
     ======================================================= */

  function terminateWorkers() {

    [
      sequentialWorker,
      analysisWorker,
      aiWorker
    ].forEach(
      (workerRef) => {

        if (
          workerRef.current
        ) {

          try {

            workerRef.current.terminate();

          } catch (error) {

            console.warn(
              "Worker termination warning:",
              error
            );

          }

        }

        workerRef.current =
          null;

      }
    );

  }


  /* =======================================================
     GET BENCHMARK LABEL
     ======================================================= */

  function getBenchmarkLabel(
    stage
  ) {

    if (
      stage === "warmup"
    ) {
      return "Warm-up";
    }

    if (
      stage === "run1"
    ) {
      return "Run 1";
    }

    if (
      stage === "run2"
    ) {
      return "Run 2";
    }

    if (
      stage === "run3"
    ) {
      return "Run 3";
    }

    return "";

  }


  /* =======================================================
     COMPLETE ANALYSIS
     
     Execution:
     
     Warm-up
        ↓
     Run 1
        ↓
     Run 2
        ↓
     Run 3
        ↓
     Completed
     
     Warm-up is excluded from the benchmark.
     ======================================================= */

  async function runAnalysis() {

    if (
      !imageFile ||
      running
    ) {

      return;

    }

    setRunning(true);

    resetResults();

    try {

      /* ---------------------------------------------------
         LOAD IMAGE ONCE
         --------------------------------------------------- */

      const processed =
        await loadImageData(
          imageFile
        );

      const {
        data,
        width,
        height
      } = processed;


      /* ---------------------------------------------------
         SAMPLE PIXELS ONCE
         --------------------------------------------------- */

      const pixels =
        samplePixels(data);


      /* ===================================================
         WARM-UP RUN
         
         This run is deliberately NOT included
         in the final benchmark.
         =================================================== */

      setBenchmarkStage(
        "warmup"
      );

      setSequential(
        (current) => ({
          ...current,
          status:
            "Warm-up run..."
        })
      );

      await runSequential(
        data,
        pixels,
        width,
        height,
        false
      );


      /* ---------------------------------------------------
         Clear warm-up output before measured runs.
         --------------------------------------------------- */

      setSequential(
        {
          ...initialSequential,
          status:
            "Starting benchmark..."
        }
      );

      setParallel(
        {
          ...initialParallel,
          workers:
            createInitialWorkers()
        }
      );


      /* ===================================================
         THREE MEASURED BENCHMARK RUNS
         =================================================== */

      let finalSequentialTime =
        null;


      for (
        let run = 1;
        run <= TOTAL_BENCHMARK_RUNS;
        run++
      ) {

        const stage =
          `run${run}`;

        setBenchmarkStage(
          stage
        );


        /* -----------------------------------------------
           Update status
           ----------------------------------------------- */

        setSequential(
          (current) => ({
            ...current,
            status:
              `${getBenchmarkLabel(stage)} — sequential`
          })
        );


        setParallel(
          (current) => ({
            ...current,
            workers:
              createInitialWorkers()
          })
        );


        /* -----------------------------------------------
           SEQUENTIAL BENCHMARK
           ----------------------------------------------- */

        const sequentialTime =
          await runSequential(
            data,
            pixels,
            width,
            height,
            true
          );


        finalSequentialTime =
          sequentialTime;


        /* -----------------------------------------------
           PARALLEL BENCHMARK
           ----------------------------------------------- */

        await runParallel(
          data,
          pixels,
          width,
          height,
          sequentialTime
        );


        /*
         * Small scheduling gap between runs.
         *
         * Workers have already been terminated by
         * runSequential() and runParallel().
         */

        if (
          run <
          TOTAL_BENCHMARK_RUNS
        ) {

          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                100
              )
          );

        }

      }


      /* ===================================================
         FINAL BENCHMARK STATE
         =================================================== */

      setBenchmarkStage(
        "complete"
      );

      setSequential(
        (current) => ({
          ...current,
          status:
            "Completed — 3 benchmark runs"
        })
      );


    } catch (error) {

      console.error(
        "Analysis failed:",
        error
      );

      setSequential(
        (current) => ({
          ...current,
          status:
            "Error: " +
            (
              error?.message ||
              "Unknown error"
            )
        })
      );

    } finally {

      /*
       * Absolute cleanup.
       *
       * Even if something fails, no worker
       * is allowed to remain alive.
       */

      terminateWorkers();

      setRunning(false);

    }

  }


  /* =======================================================
     SEQUENTIAL EXECUTION
     
     Creates ONE fresh worker.
     
     Worker is terminated immediately after completion.
     
     This function is used for:
     
     - Warm-up
     - Run 1
     - Run 2
     - Run 3
     ======================================================= */

  function runSequential(
    data,
    pixels,
    width,
    height,
    updateUI = true
  ) {

    return new Promise(
      (resolve, reject) => {

        /*
         * Defensive cleanup.
         *
         * There should never be a previous sequential
         * worker, but terminate it just in case.
         */

        if (
          sequentialWorker.current
        ) {

          sequentialWorker.current.terminate();

          sequentialWorker.current =
            null;

        }


        const worker =
          new Worker(
            new URL(
              "./workers/sequentialWorker.js",
              import.meta.url
            ),
            {
              type: "module"
            }
          );


        sequentialWorker.current =
          worker;


        let settled = false;


        const cleanup =
          () => {

            if (
              worker
            ) {

              worker.terminate();

            }

            if (
              sequentialWorker.current ===
              worker
            ) {

              sequentialWorker.current =
                null;

            }

          };


        worker.onmessage =
          (event) => {

            const message =
              event.data;


            /* ---------------------------------------------
               INDIVIDUAL STEP
               --------------------------------------------- */

            if (
              message.type ===
              "step"
            ) {

              /*
               * During warm-up we don't need to populate
               * the visible result panels.
               */

              if (
                !updateUI
              ) {

                return;

              }


              setSequential(
                (current) => {

                  const next = {
                    ...current,

                    status:
                      `Processing ${message.step}...`
                  };


                  if (
                    message.step ===
                    "colour"
                  ) {

                    next.palette =
                      message.result;

                    next.colourTime =
                      message.duration;

                  }


                  if (
                    message.step ===
                    "ai"
                  ) {

                    next.ai =
                      message.result;

                    next.aiTime =
                      message.duration;

                  }


                  if (
                    message.step ===
                    "histogram"
                  ) {

                    next.histogram =
                      message.result;

                    next.histogramTime =
                      message.duration;

                  }


                  if (
                    message.step ===
                    "statistics"
                  ) {

                    next.statistics =
                      message.result;

                    next.statisticsTime =
                      message.duration;

                  }


                  return next;

                }
              );

            }


            /* ---------------------------------------------
               COMPLETE
               --------------------------------------------- */

            if (
              message.type ===
              "complete"
            ) {

              if (
                settled
              ) {

                return;

              }

              settled = true;


              if (
                updateUI
              ) {

                setSequential(
                  (current) => ({

                    ...current,

                    status:
                      "Completed",

                    totalTime:
                      message.totalTime

                  })
                );

              }


              const totalTime =
                message.totalTime;


              cleanup();


              resolve(
                totalTime
              );

            }


            /* ---------------------------------------------
               ERROR
               --------------------------------------------- */

            if (
              message.type ===
              "error"
            ) {

              if (
                settled
              ) {

                return;

              }

              settled = true;

              const error =
                new Error(
                  message.error ||
                  "Sequential worker failed"
                );


              cleanup();


              reject(
                error
              );

            }

          };


        worker.onerror =
          (error) => {

            if (
              settled
            ) {

              return;

            }

            settled = true;


            cleanup();


            reject(
              error
            );

          };


        /* -----------------------------------------------
           Start sequential worker
           ----------------------------------------------- */

        worker.postMessage({

          rgba: data,

          pixels,

          width,

          height,

          fileSize:
            imageFile.size

        });

      }
    );

  }


  /* =======================================================
     PARALLEL EXECUTION
     
     TWO FRESH WORKERS:
     
     Worker 1 → AI
     
     Worker 2 → Analysis
                    ├── K-Means
                    ├── Histogram
                    └── Statistics
     
     BOTH ARE TERMINATED AFTER EVERY RUN.
     ======================================================= */

  function runParallel(
    data,
    pixels,
    width,
    height,
    sequentialTime
  ) {

    return new Promise(
      (resolve, reject) => {

        /*
         * Defensive cleanup.
         *
         * This guarantees that every measured run
         * starts with fresh workers.
         */

        if (
          aiWorker.current
        ) {

          aiWorker.current.terminate();

          aiWorker.current =
            null;

        }


        if (
          analysisWorker.current
        ) {

          analysisWorker.current.terminate();

          analysisWorker.current =
            null;

        }


        const start =
          performance.now();


        let completed =
          0;

        let failed =
          false;

        let settled =
          false;


        /* =================================================
           FINALIZE PARALLEL RUN
           ================================================= */

        const finish =
          () => {

            if (
              settled
            ) {

              return;

            }


            if (
              failed
            ) {

              return;

            }


            if (
              completed !==
              PARALLEL_WORKER_COUNT
            ) {

              return;

            }


            settled = true;


            const totalTime =
              performance.now() -
              start;


            const speedup =
              calculateSpeedup(
                sequentialTime,
                totalTime
              );


            const efficiency =
              calculateEfficiency(
                speedup,
                PARALLEL_WORKER_COUNT
              );


            setParallel(
              (current) => ({

                ...current,

                totalTime,

                speedup,

                efficiency

              })
            );


            resolve(
              totalTime
            );

          };


        /* =================================================
           WORKER COMPLETE
           ================================================= */

        const handleComplete =
          () => {

            if (
              failed ||
              settled
            ) {

              return;

            }


            completed++;

            finish();

          };


        /* =================================================
           WORKER ERROR
           ================================================= */

        const handleError =
          (
            workerId,
            worker,
            error
          ) => {

            if (
              failed ||
              settled
            ) {

              return;

            }


            failed = true;


            const message =
              error?.message ||
              error ||
              "Worker failed";


            updateWorker(
              workerId,
              {

                status:
                  "error",
                                  progress: 0,

                duration: null

              }
            );

            worker.terminate();

            reject(
              new Error(message)
            );

          };


        /* =================================================
           CREATE AI WORKER
           ================================================= */

        const ai =
          new Worker(
            new URL(
              "./workers/aiWorker.js",
              import.meta.url
            ),
            {
              type: "module"
            }
          );


        /* =================================================
           CREATE ANALYSIS WORKER
           ================================================= */

        const analysis =
          new Worker(
            new URL(
              "./workers/analysisWorker.js",
              import.meta.url
            ),
            {
              type: "module"
            }
          );


        aiWorker.current = ai;

        analysisWorker.current =
          analysis;


        /* =================================================
           INITIAL WORKER STATUS
           ================================================= */

        updateWorker(
          1,
          {
            status: "running",
            progress: 10
          }
        );

        updateWorker(
          2,
          {
            status: "running",
            progress: 10
          }
        );


        /* =================================================
           AI WORKER MESSAGE
           ================================================= */

        ai.onmessage =
          (event) => {

            const message =
              event.data;


            if (
              message.type ===
              "complete"
            ) {

              setParallel(
                (current) => ({
                  ...current,

                  ai:
                    message.result,

                  aiTime:
                    message.duration
                })
              );


              updateWorker(
                1,
                {
                  status:
                    "complete",

                  progress:
                    100,

                  duration:
                    message.duration
                }
              );


              /*
               * IMPORTANT:
               * Do not keep the AI worker alive.
               */

              ai.terminate();

              aiWorker.current =
                null;


              handleComplete();

            }


            if (
              message.type ===
              "error"
            ) {

              handleError(
                1,
                ai,
                message.error
              );

            }

          };


        /* =================================================
           ANALYSIS WORKER MESSAGE
           
           Worker 2 performs:
           
           K-Means
           Histogram
           Statistics
           ================================================= */

        analysis.onmessage =
          (event) => {

            const message =
              event.data;


            if (
              message.type ===
              "complete"
            ) {

              setParallel(
                (current) => ({

                  ...current,

                  palette:
                    message.palette ||
                    [],

                  histogram:
                    message.histogram ||
                    null,

                  statistics:
                    message.statistics ||
                    null,

                  colourTime:
                    message.colourTime ??
                    null,

                  histogramTime:
                    message.histogramTime ??
                    null,

                  statisticsTime:
                    message.statisticsTime ??
                    null

                })
              );


              /*
               * analysisWorker totalTime is
               * the execution time of the
               * three lightweight tasks.
               *
               * We intentionally do not use
               * it as the overall parallel
               * benchmark.
               */

              updateWorker(
                2,
                {
                  status:
                    "complete",

                  progress:
                    100,

                  duration:
                    message.totalTime ??
                    null
                }
              );


              /*
               * IMPORTANT:
               * Terminate immediately after
               * completing the workload.
               */

              analysis.terminate();

              analysisWorker.current =
                null;


              handleComplete();

            }


            if (
              message.type ===
              "error"
            ) {

              handleError(
                2,
                analysis,
                message.error
              );

            }

          };


        /* =================================================
           WORKER ERROR HANDLERS
           ================================================= */

        ai.onerror =
          (error) => {

            handleError(
              1,
              ai,
              error
            );

          };


        analysis.onerror =
          (error) => {

            handleError(
              2,
              analysis,
              error
            );

          };


        /* =================================================
           START AI WORKER
           ================================================= */

        ai.postMessage({
          rgba: data,
          width,
          height
        });


        /* =================================================
           START ANALYSIS WORKER
           ================================================= */

        analysis.postMessage({

          pixels,

          rgba: data,

          width,

          height,

          fileSize:
            imageFile.size

        });

      }
    );

  }


  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="app-shell">


      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="app-header">

        <div className="container app-header-inner">

          <div>

            <div className="app-eyebrow">
              PARALLEL COMPUTING • AI IMAGE ANALYSIS
            </div>

            <h1 className="app-title">
              Parallel AI-Based
              <span> Image Analysis</span>
            </h1>

            <p className="app-subtitle">
              Analyse images using sequential and
              concurrent Web Worker execution,
              then measure the performance difference.
            </p>

          </div>


          <div
            className={`system-status ${
              running
                ? "system-status-running"
                : "system-status-ready"
            }`}
          >

            <span className="status-dot" />

            {running
              ? "Processing"
              : "System Ready"}

          </div>

        </div>

      </header>


      {/* =====================================================
          MAIN DASHBOARD
          ===================================================== */}

      <main className="container app-main">


        {/* =================================================
            STEP 01 — IMAGE UPLOAD
            ================================================= */}

        <section className="dashboard-section upload-section">

          <div className="section-heading">

            <div>

              <span className="section-kicker">
                STEP 01
              </span>

              <h2>
                Select an image
              </h2>

              <p>
                Upload an image to begin the
                sequential and parallel analysis.
              </p>

            </div>

          </div>


          <div className="upload-card">

            <ImageUploader
              onImageSelected={
                handleImageSelected
              }
              disabled={
                running
              }
            />


            {imageUrl && (

              <div className="preview-area">

                <div className="preview-image-wrapper">

                  <img
                    src={imageUrl}
                    alt="Uploaded preview"
                    className="image-preview"
                  />

                </div>


                <div className="preview-meta">

                  <div>

                    <span className="preview-label">
                      SELECTED IMAGE
                    </span>

                    <div className="preview-name">
                      {imageFile.name}
                    </div>

                  </div>


                  <div className="preview-ready">

                    <span className="status-dot" />

                    Ready for analysis

                  </div>

                </div>

              </div>

            )}

          </div>


          <div className="analysis-action">

            <button
              className="analysis-button"
              disabled={
                !imageFile ||
                running
              }
              onClick={
                runAnalysis
              }
            >

              <span className="analysis-button-icon">

                {running
                  ? "◌"
                  : "▶"}

              </span>


              <span>

                {running
                  ? "Analysis in progress..."
                  : "Run Complete Analysis"}

              </span>


              {!running && (

                <span className="analysis-button-arrow">
                  →
                </span>

              )}

            </button>


            {!imageFile && (

              <p className="action-hint">
                Upload an image first to enable analysis.
              </p>

            )}

          </div>

        </section>


        {/* =================================================
            STEP 02 — PROCESSING COMPARISON
            ================================================= */}

        <section className="dashboard-section">

          <div className="section-heading section-heading-row">

            <div>

              <span className="section-kicker">
                STEP 02
              </span>

              <h2>
                Processing comparison
              </h2>

              <p>
                Compare single-threaded execution with
                two concurrent Web Workers.
              </p>

            </div>


            <div className="worker-count-badge">

              <strong>
                2
              </strong>

              <span>
                parallel workers
              </span>

            </div>

          </div>


          <div className="processing-grid">


            {/* ---------------------------------------------
                SEQUENTIAL PANEL
                --------------------------------------------- */}

            <div className="processing-column">

              <SequentialPanel
                data={
                  sequential
                }
              />

            </div>


            {/* ---------------------------------------------
                DIVIDER
                --------------------------------------------- */}

            <div className="processing-divider">

              <span>
                VS
              </span>

            </div>


            {/* ---------------------------------------------
                PARALLEL PANEL
                --------------------------------------------- */}

            <div className="processing-column">

              <ParallelPanel
                data={
                  parallel
                }
              />

            </div>

          </div>

        </section>


        {/* =================================================
            STEP 03 — PERFORMANCE
            ================================================= */}

        <section className="dashboard-section performance-section">

          <div className="section-heading">

            <div>

              <span className="section-kicker">
                STEP 03
              </span>

              <h2>
                Performance analysis
              </h2>

              <p>
                Benchmark the two execution strategies
                and measure the benefit of parallelism.
              </p>

            </div>

          </div>


          <div className="performance-card">

            <ComparisonTable
              sequential={
                sequential
              }
              parallel={
                parallel
              }
            />

          </div>

        </section>


        {/* =================================================
            PROJECT EXPLANATION
            ================================================= */}

        <section className="concept-strip">


          {/* ---------------------------------------------
              SEQUENTIAL
              --------------------------------------------- */}

          <div className="concept-item">

            <span className="concept-number">
              01
            </span>


            <div>

              <strong>
                Sequential
              </strong>

              <p>
                Tasks execute one after another
                on a single processing flow.
              </p>

            </div>

          </div>


          {/* ---------------------------------------------
              PARALLEL
              --------------------------------------------- */}

          <div className="concept-item">

            <span className="concept-number">
              02
            </span>


            <div>

              <strong>
                Parallel
              </strong>

              <p>
                AI inference and lightweight image
                analysis execute concurrently using
                two Web Workers.
              </p>

            </div>

          </div>


          {/* ---------------------------------------------
              MEASUREMENT
              --------------------------------------------- */}

          <div className="concept-item">

            <span className="concept-number">
              03
            </span>


            <div>

              <strong>
                Measure
              </strong>

              <p>
                Execution time, speedup and efficiency
                quantify the performance difference.
              </p>

            </div>

          </div>

        </section>

      </main>


      {/* =====================================================
          FOOTER
          ===================================================== */}

      <footer className="app-footer">

        <div className="container footer-inner">

          <div>

            <strong>
              Parallel AI-Based Image Analysis
            </strong>

            <span>
              Browser-based parallel image processing
              and performance analysis.
            </span>

          </div>


          <div className="footer-tech">
            React • Web Workers • AI • Parallel Computing
          </div>

        </div>

      </footer>

    </div>
  );
}
