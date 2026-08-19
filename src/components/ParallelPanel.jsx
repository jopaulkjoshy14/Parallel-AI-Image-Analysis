import React from "react";

import PaletteDisplay from "./PaletteDisplay";
import Histogram from "./Histogram";
import WorkerStatus from "./WorkerStatus";

export default function ParallelPanel({
  data
}) {
  return (
    <div className="panel-card">
      <div className="panel-header parallel-header">
        <h4 className="mb-1">
          Parallel Processing
        </h4>

        <div className="small text-secondary">
          Independent tasks execute using Web Workers
        </div>
      </div>

      <div className="result-section">
        <strong>
          Worker workload
        </strong>

        <div className="mt-3">
          <WorkerStatus
            workers={data.workers}
          />
        </div>
      </div>

      <div className="result-section">
        <strong>
          Dominant colour palette
        </strong>

        <div className="mt-3">
          <PaletteDisplay
            palette={data.palette}
          />
        </div>
      </div>

      <div className="result-section">
        <strong>
          AI classification
        </strong>

        <div className="mt-3">
          {data.ai?.length ? (
            data.ai.map(
              (item, index) => (
                <div
                  className="d-flex justify-content-between border-bottom py-2"
                  key={index}
                >
                  <span>
                    {item.label}
                  </span>

                  <strong>
                    {(
                      item.score *
                      100
                    ).toFixed(2)}
                    %
                  </strong>
                </div>
              )
            )
          ) : (
            <span className="text-secondary">
              No prediction yet.
            </span>
          )}
        </div>
      </div>

      <div className="result-section">
        <strong>
          RGB histogram
        </strong>

        <div className="mt-3">
          <Histogram
            histogram={data.histogram}
          />
        </div>
      </div>

      <div className="result-section">
        <strong>
          Image statistics
        </strong>

        {data.statistics && (
          <div className="row g-2 mt-2 small">
            <div className="col-6">
              Resolution
            </div>

            <div className="col-6 text-end">
              {data.statistics.width} ×{" "}
              {data.statistics.height}
            </div>

            <div className="col-6">
              Pixels
            </div>

            <div className="col-6 text-end">
              {data.statistics.pixelCount.toLocaleString()}
            </div>

            <div className="col-6">
              Brightness
            </div>

            <div className="col-6 text-end">
              {data.statistics.averageBrightness}
            </div>
          </div>
        )}
      </div>

      <div className="result-section">
        <strong>
          Parallel execution time
        </strong>

        <div className="display-6 mt-2">
          {data.totalTime !== null
            ? `${data.totalTime.toFixed(
                2
              )} ms`
            : "—"}
        </div>
      </div>
    </div>
  );
}
