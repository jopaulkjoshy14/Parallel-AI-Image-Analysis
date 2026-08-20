import React from "react";

import PaletteDisplay from "./PaletteDisplay";
import Histogram from "./Histogram";

export default function SequentialPanel({
  data
}) {
  const isCompleted =
    data.status === "Completed";

  const isProcessing =
    data.status?.startsWith(
      "Processing"
    );

  const formatTime = (value) => {
    if (value === null || value === undefined) {
      return "—";
    }

    return `${value.toFixed(2)} ms`;
  };

  return (
    <div className="analysis-panel sequential-panel">

      {/* =====================================================
          PANEL HEADER
      ===================================================== */}

      <div className="analysis-panel-header sequential-panel-header">

        <div className="panel-title-group">

          <div className="panel-icon sequential-icon">
            <span>01</span>
          </div>

          <div>
            <div className="panel-eyebrow">
              SINGLE EXECUTION FLOW
            </div>

            <h3>
              Sequential Processing
            </h3>

            <p>
              Tasks execute one after another
            </p>
          </div>

        </div>

        <div
          className={`panel-status ${
            isCompleted
              ? "panel-status-complete"
              : isProcessing
              ? "panel-status-running"
              : ""
          }`}
        >
          <span className="status-dot" />

          {isCompleted
            ? "Completed"
            : isProcessing
            ? "Processing"
            : "Waiting"}

        </div>

      </div>

      {/* =====================================================
          EXECUTION FLOW
      ===================================================== */}

      <div className="execution-flow">

        <div className="flow-label">
          EXECUTION FLOW
        </div>

        <div className="flow-track">

          <div
            className={`flow-step ${
              data.colourTime !== null
                ? "flow-step-complete"
                : ""
            }`}
          >
            <span className="flow-number">
              01
            </span>

            <div>
              <strong>
                Colour
              </strong>

              <span>
                {formatTime(
                  data.colourTime
                )}
              </span>
            </div>
          </div>

          <span className="flow-arrow">
            →
          </span>

          <div
            className={`flow-step ${
              data.aiTime !== null
                ? "flow-step-complete"
                : ""
            }`}
          >
            <span className="flow-number">
              02
            </span>

            <div>
              <strong>
                AI
              </strong>

              <span>
                {formatTime(
                  data.aiTime
                )}
              </span>
            </div>
          </div>

          <span className="flow-arrow">
            →
          </span>

          <div
            className={`flow-step ${
              data.histogramTime !== null
                ? "flow-step-complete"
                : ""
            }`}
          >
            <span className="flow-number">
              03
            </span>

            <div>
              <strong>
                Histogram
              </strong>

              <span>
                {formatTime(
                  data.histogramTime
                )}
              </span>
            </div>
          </div>

          <span className="flow-arrow">
            →
          </span>

          <div
            className={`flow-step ${
              data.statisticsTime !== null
                ? "flow-step-complete"
                : ""
            }`}
          >
            <span className="flow-number">
              04
            </span>

            <div>
              <strong>
                Statistics
              </strong>

              <span>
                {formatTime(
                  data.statisticsTime
                )}
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* =====================================================
          STATUS
      ===================================================== */}

      <div className="panel-section status-section">

        <div className="section-label">
          PROCESSING STATUS
        </div>

        <div
          className={`processing-status ${
            isCompleted
              ? "processing-status-complete"
              : ""
          }`}
        >
          <span className="status-indicator" />

          <span>
            {data.status}
          </span>
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
              <span>
                AI classification results
                will appear here.
              </span>
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
          EXECUTION TIME
      ===================================================== */}

      <div className="execution-total sequential-total">

        <div>
          <span>
            TOTAL EXECUTION TIME
          </span>

          <small>
            Sequential benchmark
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

    </div>
  );
            }
