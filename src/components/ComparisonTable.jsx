import React from "react";

function value(value) {
  return value === null ||
    value === undefined
    ? "—"
    : value;
}

export default function ComparisonTable({
  sequential,
  parallel
}) {
  return (
    <div className="table-responsive">
      <table className="table table-bordered align-middle performance-table mb-0">
        <thead className="table-dark">
          <tr>
            <th>Metric</th>
            <th>Sequential</th>
            <th>Parallel</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>Total execution time</td>
            <td>
              {value(
                sequential.totalTime
              )}
            </td>
            <td>
              {value(
                parallel.totalTime
              )}
            </td>
          </tr>

          <tr>
            <td>K-Means</td>
            <td>
              {value(
                sequential.colourTime
              )}
            </td>
            <td>
              {value(
                parallel.colourTime
              )}
            </td>
          </tr>

          <tr>
            <td>AI classification</td>
            <td>
              {value(
                sequential.aiTime
              )}
            </td>
            <td>
              {value(
                parallel.aiTime
              )}
            </td>
          </tr>

          <tr>
            <td>Histogram</td>
            <td>
              {value(
                sequential.histogramTime
              )}
            </td>
            <td>
              {value(
                parallel.histogramTime
              )}
            </td>
          </tr>

          <tr>
            <td>Image statistics</td>
            <td>
              {value(
                sequential.statisticsTime
              )}
            </td>
            <td>
              {value(
                parallel.statisticsTime
              )}
            </td>
          </tr>

          <tr>
            <td>Worker count</td>
            <td>1</td>
            <td>
              {parallel.workerCount}
            </td>
          </tr>

          <tr>
            <td>Speedup</td>
            <td>1.00×</td>
            <td>
              {parallel.speedup
                ? `${parallel.speedup.toFixed(
                    2
                  )}×`
                : "—"}
            </td>
          </tr>

          <tr>
            <td>Parallel efficiency</td>
            <td>—</td>
            <td>
              {parallel.efficiency
                ? `${parallel.efficiency.toFixed(
                    2
                  )}%`
                : "—"}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
