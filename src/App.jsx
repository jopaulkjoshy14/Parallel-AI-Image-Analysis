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

function createInitialWorkers() {
  return [
    {
      id: 1,
      name: "Worker 1",
      task: "K-Means colour extraction",
      status: "idle",
      progress: 0,
      duration: null
    },
    {
      id: 2,
      name: "Worker 2",
      task: "AI image classification",
      status: "idle",
      progress: 0,
      duration: null
    },
    {
      id: 3,
      name: "Worker 3",
      task: "RGB histogram",
      status: "idle",
      progress: 0,
      duration: null
    },
    {
      id: 4,
      name: "Worker 4",
      task: "Image statistics",
      status: "idle",
      progress: 0,
      duration: null
    }
  ];
}

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
  workerCount: 4,
  speedup: null,
  efficiency: null,
  workers: createInitialWorkers()
};

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

  const sequentialWorker =
    useRef(null);

  const colourWorker =
    useRef(null);

  const histogramWorker =
    useRef(null);

  const statisticsWorker =
    useRef(null);

  const aiWorker =
    useRef(null);

  useEffect(() => {
    return () => {
      [
        sequentialWorker,
        colourWorker,
        histogramWorker,
        statisticsWorker,
        aiWorker
      ].forEach(
        (workerRef) => {
          workerRef.current?.terminate();
        }
      );

      if (imageUrl) {
        URL.revokeObjectURL(
          imageUrl
        );
      }
    };
  }, [imageUrl]);

  function resetResults() {
    setSequential(
      initialSequential
    );

    setParallel(
      initialParallel
    );
  }

  async function handleImageSelected(
    file
  ) {
    if (running) {
      return;
    }

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

  function terminateWorkers() {
    [
      sequentialWorker,
      colourWorker,
      histogramWorker,
      statisticsWorker,
      aiWorker
    ].forEach(
      (workerRef) => {
        workerRef.current?.terminate();
        workerRef.current = null;
      }
    );
  }

  async function runAnalysis() {
    if (!imageFile || running) {
      return;
    }

    setRunning(true);

    resetResults();

    try {
      const processed =
        await loadImageData(
          imageFile
        );

      const {
        data,
        width,
        height
      } = processed;

      const pixels =
        samplePixels(data);

      const imageData = new ImageData(
        new Uint8ClampedArray(data),
        width,
        height
      );

      await Promise.all([
        runSequential(
          data,
          pixels,
          width,
          height,
          imageData
        ),
        runParallel(
          data,
          pixels,
          width,
          height,
          imageData
        )
      ]);
    } catch (error) {
      console.error(error);

      setSequential(
        (current) => ({
          ...current,
          status:
            "Error: " +
            error.message
        })
      );
    } finally {
      terminateWorkers();
      setRunning(false);
    }
  }

  function runSequential(
    data,
    pixels,
    width,
    height,
    imageData
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

        worker.onmessage =
          (event) => {
            const message =
              event.data;

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

              resolve();
            }

            if (
              message.type ===
              "error"
            ) {
              reject(
                new Error(
                  message.error
                )
              );
            }
          };

        worker.onerror =
          (error) => {
            reject(error);
          };

        worker.postMessage({
          rgba: data,
          pixels,
          width,
          height,
          fileSize:
            imageFile.size,
          imageData
        });
      }
    );
  }

  function runParallel(
    data,
    pixels,
    width,
    height,
    imageData
  ) {
    return new Promise(
      (resolve, reject) => {
        const start =
          performance.now();

        let completed = 0;

        const handleComplete =
          () => {
            completed++;

            if (completed === 4) {
              const totalTime =
                performance.now() -
                start;

              setParallel(
                (current) => {
                  const speedup =
                    calculateSpeedup(
                      sequential.totalTime ||
                        totalTime,
                      totalTime
                    );

                  return {
                    ...current,
                    totalTime,
                    speedup,
                    efficiency:
                      calculateEfficiency(
                        speedup,
                        4
                      )
                  };
                }
              );

              resolve();
            }
          };

        const colour =
          new Worker(
            new URL(
              "./workers/colourWorker.js",
              import.meta.url
            ),
            {
              type: "module"
            }
          );

        const histogram =
          new Worker(
            new URL(
              "./workers/histogramWorker.js",
              import.meta.url
            ),
            {
              type: "module"
            }
          );

        const statistics =
          new Worker(
            new URL(
              "./workers/statisticsWorker.js",
              import.meta.url
            ),
            {
              type: "module"
            }
          );

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

        colourWorker.current =
          colour;

        histogramWorker.current =
          histogram;

        statisticsWorker.current =
          statistics;

        aiWorker.current = ai;

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

        updateWorker(
          3,
          {
            status: "running",
            progress: 10
          }
        );

        updateWorker(
          4,
          {
            status: "running",
            progress: 10
          }
        );

        colour.onmessage =
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
                    message.result,
                  colourTime:
                    message.duration
                })
              );

              updateWorker(
                1,
                {
                  status:
                    "complete",
                  progress: 100,
                  duration:
                    message.duration
                }
              );

              colour.terminate();

              handleComplete();
            }
          };

        histogram.onmessage =
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
                  histogram:
                    message.result,
                  histogramTime:
                    message.duration
                })
              );

              updateWorker(
                3,
                {
                  status:
                    "complete",
                  progress: 100,
                  duration:
                    message.duration
                }
              );

              histogram.terminate();

              handleComplete();
            }
          };

        statistics.onmessage =
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
                  statistics:
                    message.result,
                  statisticsTime:
                    message.duration
                })
              );

              updateWorker(
                4,
                {
                  status:
                    "complete",
                  progress: 100,
                  duration:
                    message.duration
                }
              );

              statistics.terminate();

              handleComplete();
            }
          };

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
                2,
                {
                  status:
                    "complete",
                  progress: 100,
                  duration:
                    message.duration
                }
              );

              ai.terminate();

              handleComplete();
            }
          };

        colour.onerror =
          reject;

        histogram.onerror =
          reject;

        statistics.onerror =
          reject;

        ai.onerror =
          reject;

        colour.postMessage({
          pixels
        });

        histogram.postMessage({
          rgba: data
        });

        statistics.postMessage({
          rgba: data,
          width,
          height,
          fileSize:
            imageFile.size
        });

        ai.postMessage({
          imageData
        });
      }
    );
  }

  return (
    <div className="min-vh-100">
      <header className="app-header py-4">
        <div className="container">
          <h1 className="h3 mb-1">
            Parallel AI-Based Image Analysis
          </h1>

          <p className="mb-0 text-light opacity-75">
            Colour palette extraction,
            AI classification and
            parallel-performance analysis
          </p>
        </div>
      </header>

      <main className="container py-4">
        <section className="mb-4">
          <ImageUploader
            onImageSelected={
              handleImageSelected
            }
            disabled={running}
          />

          {imageUrl && (
            <div className="text-center mt-3">
              <img
                src={imageUrl}
                alt="Uploaded preview"
                className="image-preview shadow-sm"
              />

              <div className="small text-secondary mt-2">
                {imageFile.name}
              </div>
            </div>
          )}

          <div className="text-center mt-3">
            <button
              className="btn btn-primary btn-lg px-5"
              disabled={
                !imageFile ||
                running
              }
              onClick={
                runAnalysis
              }
            >
              {running
                ? "Processing..."
                : "Run Analysis"}
            </button>
          </div>
        </section>

        <section className="row g-4">
          <div className="col-12 col-xl-6">
            <SequentialPanel
              data={
                sequential
              }
            />
          </div>

          <div className="col-12 col-xl-6">
            <ParallelPanel
              data={
                parallel
              }
            />
          </div>
        </section>

        <section className="card border-0 shadow-sm mt-4">
          <div className="card-header bg-dark text-white">
            <h2 className="h5 mb-0">
              Sequential vs Parallel Performance
            </h2>
          </div>

          <div className="card-body p-0">
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
      </main>

      <footer className="text-center text-secondary small py-4">
        Parallel AI-Based Colour Palette
        Extraction and Image Analysis
      </footer>
    </div>
  );
          }
