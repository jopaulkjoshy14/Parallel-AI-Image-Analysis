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
   PARALLEL CONFIGURATION
   ========================================================= */

const PARALLEL_WORKER_COUNT = 2;


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

  const [imageFile, setImageFile] =
    useState(null);

  const [imageUrl, setImageUrl] =
    useState(null);

  const [sequential, setSequential] =
    useState(initialSequential);

  const [parallel, setParallel] =
    useState(initialParallel);

  const [running, setRunning] =
    useState(false);


  /* =======================================================
     WORKER REFERENCES
     ======================================================= */

  const sequentialWorker =
    useRef(null);

  const aiWorker =
    useRef(null);

  const analysisWorker =
    useRef(null);


  /* =======================================================
     CLEANUP
     ======================================================= */

  useEffect(() => {

    return () => {

      sequentialWorker.current?.terminate();
      aiWorker.current?.terminate();
      analysisWorker.current?.terminate();

      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
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

  }


  /* =======================================================
     IMAGE SELECTION
     ======================================================= */

  function handleImageSelected(file) {

    if (running || !file) {
      return;
    }

    resetResults();

    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }

    setImageFile(file);

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
     ======================================================= */

  function terminateWorkers() {

    if (sequentialWorker.current) {
      sequentialWorker.current.terminate();
      sequentialWorker.current = null;
    }

    if (aiWorker.current) {
      aiWorker.current.terminate();
      aiWorker.current = null;
    }

    if (analysisWorker.current) {
      analysisWorker.current.terminate();
      analysisWorker.current = null;
    }

  }


  /* =======================================================
     RUN COMPLETE ANALYSIS
     ======================================================= */

  async function runAnalysis() {

    if (!imageFile || running) {
      return;
    }

    setRunning(true);

    resetResults();

    try {

      /* ---------------------------------------------------
         LOAD IMAGE
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
         SAMPLE PIXELS FOR K-MEANS
         --------------------------------------------------- */

      const pixels =
        samplePixels(data);


      /* ---------------------------------------------------
         SEQUENTIAL BENCHMARK
         --------------------------------------------------- */

      const sequentialTime =
        await runSequential(
          data,
          pixels,
          width,
          height
        );


      /* ---------------------------------------------------
         PARALLEL BENCHMARK
         --------------------------------------------------- */

      await runParallel(
        data,
        pixels,
        width,
        height,
        sequentialTime
      );

    } catch (error) {

      console.error(
        "Analysis error:",
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
       * Final safety cleanup.
       *
       * Even if a worker failed or something
       * unexpected happened, no worker remains alive.
       */

      terminateWorkers();

      setRunning(false);

    }

  }


  /* =======================================================
     SEQUENTIAL EXECUTION
     
     ONE WORKER:
     
     sequentialWorker.js
     
     ├── K-Means
     ├── AI
     ├── Histogram
     └── Statistics
     ======================================================= */

  function runSequential(
    data,
    pixels,
    width,
    height
  ) {

    return new Promise(
      (resolve, reject) => {

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


        /* -------------------------------------------------
           MESSAGE HANDLER
           ------------------------------------------------- */

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
               SEQUENTIAL COMPLETE
               --------------------------------------------- */

            if (
              message.type ===
              "complete"
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


              worker.terminate();

              sequentialWorker.current =
                null;


              resolve(
                message.totalTime
              );

            }


            /* ---------------------------------------------
               SEQUENTIAL ERROR
               --------------------------------------------- */

            if (
              message.type ===
              "error"
            ) {

              worker.terminate();

              sequentialWorker.current =
                null;


              reject(
                new Error(
                  message.error
                )
              );

            }

          };


        /* -------------------------------------------------
           WORKER ERROR
           ------------------------------------------------- */

        worker.onerror =
          (error) => {

            worker.terminate();

            sequentialWorker.current =
              null;

            reject(error);

          };


        /* -------------------------------------------------
           START SEQUENTIAL WORKER
           ------------------------------------------------- */

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
     
     TWO WORKERS:
     
     Worker 1 → AI
     
     Worker 2 → Analysis
                 ├── K-Means
                 ├── Histogram
                 └── Statistics
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

        const start =
          performance.now();

        let completed =
          0;

        let failed =
          false;


        /* =================================================
           WORKER COMPLETE
           ================================================= */

        function handleComplete() {

          completed++;


          /*
           * The parallel benchmark is finished
           * only after BOTH workers finish.
           */

          if (
            completed ===
              PARALLEL_WORKER_COUNT &&
            !failed
          ) {

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

          }

        }


        /* =================================================
           WORKER ERROR
           ================================================= */

        function handleError(
          workerId,
          worker,
          error
        ) {

          if (failed) {
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

              progress:
                0,

              duration:
                null
            }
          );


          worker.terminate();


          if (
            worker ===
            aiWorker.current
          ) {
            aiWorker.current =
              null;
          }


          if (
            worker ===
            analysisWorker.current
          ) {
            analysisWorker.current =
              null;
          }


          reject(
            new Error(
              message
            )
          );

        }


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


        aiWorker.current =
          ai;

        analysisWorker.current =
          analysis;


        /* =================================================
           INITIAL STATUS
           ================================================= */

        updateWorker(
          1,
          {
            status:
              "running",

            progress:
              10
          }
        );


        updateWorker(
          2,
          {
            status:
              "running",

            progress:
              10
          }
        );


        /* =================================================
           AI WORKER
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
               * AI worker is no longer
               * required after completion.
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
           ANALYSIS WORKER
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
               * Analysis worker has completed
               * all three lightweight workloads.
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
           ERROR HANDLERS
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
                      {imageFile?.name}
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
                {PARALLEL_WORKER_COUNT}
              </strong>

              <span>
                parallel workers
              </span>

            </div>

          </div>


          <div className="processing-grid">


            {/* ---------------------------------------------
                SEQUENTIAL
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
                PARALLEL
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
            STEP 03 — PERFORMANCE ANALYSIS
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
