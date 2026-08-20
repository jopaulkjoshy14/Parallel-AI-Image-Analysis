import React from "react";

function formatTime(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  return `${Number(value).toFixed(2)} ms`;
}

function formatSpeedup(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  return `${Number(value).toFixed(2)}×`;
}

function formatEfficiency(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  /*
   * calculateEfficiency() returns a fraction.
   * Example: 0.82 → 82.0%
   */
  return `${(
    Number(value) * 100
  ).toFixed(1)}%`;
}

function getDifference(
  sequential,
  parallel
) {
  if (
    sequential === null ||
    sequential === undefined ||
    parallel === null ||
    parallel === undefined ||
    sequential === 0
  ) {
    return null;
  }

  return (
    ((sequential - parallel) /
      sequential) *
    100
  );
}

function MetricRow({
  label,
  sequential,
  parallel,
  highlight = false
}) {
  const improvement =
    getDifference(
      sequential,
      parallel
    );

  return (
    <tr
      className={
        highlight
          ? "comparison-highlight"
          : ""
      }
    >
      <td>
        <div className="metric-name">
          {label}
        </div>

        {improvement !== null &&
          improvement > 0 && (
            <span className="metric-improvement">
              {improvement.toFixed(1)}% faster
            </span>
          )}
      </td>

      <td>
        <span className="comparison-value sequential-value">
          {formatTime(sequential)}
        </span>
      </td>

      <td>
        <span className="comparison-value parallel-value">
          {formatTime(parallel)}
        </span>
      </td>
    </tr>
  );
}

export default function ComparisonTable({
  sequential,
  parallel
}) {
  const hasBenchmark =
    sequential.totalTime !== null &&
    sequential.totalTime !== undefined &&
    parallel.totalTime !== null &&
    parallel.totalTime !== undefined;

  return (
    <div className="comparison-wrapper">

      {/* =====================================================
          PERFORMANCE SUMMARY
      ===================================================== */}

      <div className="comparison-summary">

        <div className="comparison-summary-card">

          <span>
            SEQUENTIAL
          </span>

          <strong>
            {formatTime(
              sequential.totalTime
            )}
          </strong>

          <small>
            Single execution path
          </small>

        </div>


        <div className="comparison-vs">
          VS
        </div>


        <div className="comparison-summary-card parallel-summary">

          <span>
            PARALLEL
          </span>

          <strong>
            {formatTime(
              parallel.totalTime
            )}
          </strong>

          <small>
            {parallel.workerCount || 4}
            {" "}
            concurrent workers
          </small>

        </div>


        <div className="comparison-summary-card performance-summary">

          <span>
            SPEEDUP
          </span>

          <strong>
            {formatSpeedup(
              parallel.speedup
            )}
          </strong>

          <small>
            Overall acceleration
          </small>

        </div>

      </div>

      {/* =====================================================
          TABLE
      ===================================================== */}

      <div className="table-responsive">

        <table className="comparison-table">

          <thead>
            <tr>

              <th>
                <span>
                  Metric
                </span>
              </th>

              <th>
                <span className="table-column-label sequential-label">
                  Sequential
                </span>
              </th>

              <th>
                <span className="table-column-label parallel-label">
                  Parallel
                </span>
              </th>

            </tr>
          </thead>

          <tbody>

            <MetricRow
              label="Total execution time"
              sequential={
                sequential.totalTime
              }
              parallel={
                parallel.totalTime
              }
              highlight
            />

            <MetricRow
              label="K-Means colour extraction"
              sequential={
                sequential.colourTime
              }
              parallel={
                parallel.colourTime
              }
            />

            <MetricRow
              label="AI classification"
              sequential={
                sequential.aiTime
              }
              parallel={
                parallel.aiTime
              }
            />

            <MetricRow
              label="RGB histogram"
              sequential={
                sequential.histogramTime
              }
              parallel={
                parallel.histogramTime
              }
            />

            <MetricRow
              label="Image statistics"
              sequential={
                sequential.statisticsTime
              }
              parallel={
                parallel.statisticsTime
              }
            />

            {/* Worker count */}

            <tr>
              <td>
                <div className="metric-name">
                  Worker count
                </div>
              </td>

              <td>
                <span className="comparison-value">
                  1
                </span>
              </td>

              <td>
                <span className="comparison-value parallel-value">
                  {parallel.workerCount || 4}
                </span>
              </td>
            </tr>

            {/* Speedup */}

            <tr className="comparison-highlight">
              <td>
                <div className="metric-name">
                  Speedup
                </div>

                <span className="metric-description">
                  Sequential ÷ Parallel
                </span>
              </td>

              <td>
                <span className="comparison-value">
                  1.00×
                </span>
              </td>

              <td>
                <span className="comparison-value performance-value">
                  {formatSpeedup(
                    parallel.speedup
                  )}
                </span>
              </td>
            </tr>

            {/* Efficiency */}

            <tr>
              <td>
                <div className="metric-name">
                  Parallel efficiency
                </div>

                <span className="metric-description">
                  Speedup ÷ worker count
                </span>
              </td>

              <td>
                <span className="comparison-value">
                  —
                </span>
              </td>

              <td>
                <span className="comparison-value performance-value">
                  {formatEfficiency(
                    parallel.efficiency
                  )}
                </span>
              </td>
            </tr>

          </tbody>

        </table>

      </div>

      {/* =====================================================
          BENCHMARK NOTE
      ===================================================== */}

      <div className="comparison-footer">

        <div className="comparison-footer-icon">
          i
        </div>

        <div>

          <strong>
            Benchmark interpretation
          </strong>

          <p>
            Parallel execution distributes
            independent workloads across
            Web Workers. Speedup indicates
            overall acceleration compared
            with the sequential execution.
          </p>

        </div>

      </div>

      {!hasBenchmark && (
        <div className="comparison-awaiting">
          Run the analysis to generate
          benchmark results.
        </div>
      )}

    </div>
  );
}
