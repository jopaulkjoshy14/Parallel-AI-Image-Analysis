import React from "react";

import PaletteDisplay from "./PaletteDisplay";
import Histogram from "./Histogram";
import WorkerStatus from "./WorkerStatus";

export default function ParallelPanel({
  data
}) {
  const isCompleted =
    data.totalTime !== null;

  const completedWorkers =
    data.workers?.filter(
      (worker) =>
        worker.status === "complete"
    ).length || 0;

  const runningWorkers =
    data.workers?.filter(
      (worker) =>
        worker.status === "running"
    ).length || 0;

  const formatTime = (value) => {
    if (
      value === null ||
      value === undefined
    ) {
      return "—";
    }

    return `${value.toFixed(2)} ms`;
  };

  return (
    <div className="analysis-panel parallel-panel">

      {/* =====================================================
          PANEL HEADER
      ===================================================== */}

      <div className="analysis-panel-header parallel-panel-header">

        <div className="panel-title-group">

          <div className="panel-icon parallel-icon">
            <span>04</span>
          </div>

          <div>
            <div className="panel-eyebrow">
              CONCURRENT EXECUTION
            </div>

            <h3>
              Parallel Processing
            </h3>

            <p>
              Independent tasks execute concurrently
              using Web Workers
            </p>
          </div>

        </div>

        <div
          className={`panel-status ${
            isCompleted
              ? "panel-status-complete"
              : runningWorkers > 0
              ? "panel-status-running"
              : ""
          }`}
        >
          <span className="status-dot" />

          {isCompleted
            ? "Completed"
            : runningWorkers > 0
            ? "Running"
            : "Waiting"}

        </div>

      </div>

      {/* =====================================================
          PARALLEL EXECUTION VISUALIZATION
      ===================================================== */}

      <div className="parallel-visual">

        <div className="parallel-visual-header">

          <div>
            <div className="section-label">
              WORKER EXECUTION
            </div>

            <p>
              Four workloads are distributed
              independently across Web Workers.
            </p>
          </div>

          <div className="worker-counter">
            <strong>
              {completedWorkers}
              <span>/</span>
              {data.workers?.length || 4}
            </strong>

            <small>
              completed
            </small>
          </div>

        </div>

        <div className="parallel-lanes">

          <div className="parallel-lane">
            <div className="lane-label">
              <span className="lane-number">
                01
              </span>

              <div>
                <strong>
                  Colour Extraction
                </strong>

                <small>
                  K-Means
                </small>
              </div>
            </div>

            <div className="lane-track">
              <div
                className={`lane-progress ${
                  data.colourTime !== null
                    ? "lane-complete"
                    : ""
                }`}
              />
            </div>

            <span className="lane-time">
              {formatTime(
                data.colourTime
              )}
            </span>
          </div>


          <div className="parallel-lane">
            <div className="lane-label">
              <span className="lane-number">
                02
              </span>

              <div>
                <strong>
                  AI Classification
                </strong>

                <small>
                  Neural inference
                </small>
              </div>
            </div>

            <div className="lane-track">
              <div
                className={`lane-progress ${
                  data.aiTime !== null
                    ? "lane-complete"
                    : ""
                }`}
              />
            </div>

            <span className="lane-time">
              {formatTime(
                data.aiTime
              )}
            </span>
          </div>


          <div className="parallel-lane">
            <div className="lane-label">
              <span className="lane-number">
                03
              </span>

              <div>
                <strong>
                  RGB Histogram
                </strong>

                <small>
                  Pixel distribution
                </small>
              </div>
            </div>

            <div className="lane-track">
              <div
                className={`lane-progress ${
                  data.histogramTime !== null
                    ? "lane-complete"
                    : ""
                }`}
              />
            </div>

            <span className="lane-time">
              {formatTime(
                data.histogramTime
              )}
            </span>
          </div>


          <div className="parallel-lane">
            <div className="lane-label">
              <span className="lane-number">
                04
              </span>

              <div>
                <strong>
                  Image Statistics
                </strong>

                <small>
                  Image metrics
                </small>
              </div>
            </div>

            <div className="lane-track">
              <div
                className={`lane-progress ${
                  data.statisticsTime !== null
                    ? "lane-complete"
                    : ""
                }`}
              />
            </div>

            <span className="lane-time">
              {formatTime(
                data.statisticsTime
              )}
            </span>
          </div>

        </div>

      </div>

      {/* =====================================================
          WORKER STATUS
      ===================================================== */}

      <div className="panel-section">

        <div className="section-label">
          WORKER STATUS
        </div>

        <div className="result-container worker-status-container">

          <WorkerStatus
            workers={data.workers}
          />

        </div>

      </div>

      {/* =====================================================
          COLOUR PALETTE
      ===================================================== */}

      <div className="panel-section">

        <div className="section-label">
          DOMINANT COLOUR PALETTE
        </div>

        <div className="result-container palette-container">

          <PaletteDisplay
            palette={data.palette}
          />

        </div>

      </div>

      {/* =====================================================
          AI CLASSIFICATION
      ===================================================== */}

      <div className="panel-section">

        <div className="section-label">
          AI CLASSIFICATION
        </div>

        <div className="result-container">

          {data.ai?.length ? (

            <div className="prediction-list">

              {data.ai.map(
                (item, index) => {

                  const percentage =
                    item.score * 100;

                  return (
                    <div
                      className="prediction-item"
                      key={index}
                    >

                      <div className="prediction-main">

                        <span className="prediction-rank">
                          {String(
                            index + 1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </span>

                        <span className="prediction-label">
                          {item.label}
                        </span>

                        <strong>
                          {percentage.toFixed(
                            2
                          )}
                          %
                        </strong>

                      </div>

                      <div className="prediction-bar">
                        <div
                          className="prediction-bar-fill"
                          style={{
                            width:
                              `${Math.min(
                                percentage,
                                100
                              )}%`
                          }}
                        />
                      </div>

                    </div>
                  );
                }
              )}

            </div>

          ) : (

            <div className="empty-result">
              AI classification results
              will appear here.
            </div>

          )}

        </div>

      </div>

      {/* =====================================================
          HISTOGRAM
      ===================================================== */}

      <div className="panel-section">

        <div className="section-label">
          RGB HISTOGRAM
        </div>

        <div className="result-container histogram-container">

          <Histogram
            histogram={
              data.histogram
            }
          />

        </div>

      </div>

      {/* =====================================================
          IMAGE STATISTICS
      ===================================================== */}

      <div className="panel-section">

        <div className="section-label">
          IMAGE STATISTICS
        </div>

        {data.statistics ? (

          <div className="statistics-grid">

            <div className="stat-item">
              <span>
                Resolution
              </span>

              <strong>
                {data.statistics.width}
                {" × "}
                {data.statistics.height}
              </strong>
            </div>

            <div className="stat-item">
              <span>
                Pixels
              </span>

              <strong>
                {data.statistics.pixelCount.toLocaleString()}
              </strong>
            </div>

            <div className="stat-item">
              <span>
                Brightness
              </span>

              <strong>
                {data.statistics.averageBrightness}
              </strong>
            </div>

          </div>

        ) : (

          <div className="empty-result">
            Image statistics will appear here.
          </div>

        )}

      </div>

      {/* =====================================================
          PARALLEL PERFORMANCE
      ===================================================== */}

      <div className="execution-total parallel-total">

        <div>
          <span>
            TOTAL PARALLEL TIME
          </span>

          <small>
            Concurrent benchmark
          </small>
        </div>

        <strong>
          {data.totalTime !== null
            ? `${data.totalTime.toFixed(
                2
              )} ms`
            : "—"}
        </strong>

      </div>

      {/* =====================================================
          SPEEDUP / EFFICIENCY
      ===================================================== */}

      <div className="parallel-metrics">

        <div className="parallel-metric">

          <span>
            SPEEDUP
          </span>

          <strong>
            {data.speedup !== null
              ? `${data.speedup.toFixed(
                  2
                )}×`
              : "—"}
          </strong>

          <small>
            Sequential ÷ Parallel
          </small>

        </div>

        <div className="parallel-metric">

          <span>
            EFFICIENCY
          </span>

          <strong>
            {data.efficiency !== null
              ? `${(
                  data.efficiency * 100
                ).toFixed(1)}%`
              : "—"}
          </strong>

          <small>
            Speedup ÷ 4 workers
          </small>

        </div>

      </div>

    </div>
  );
}
