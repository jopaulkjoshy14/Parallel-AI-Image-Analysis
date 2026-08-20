import React from "react";

function getStatusLabel(status) {
  if (status === "running") {
    return "RUNNING";
  }

  if (status === "complete") {
    return "COMPLETE";
  }

  if (status === "error") {
    return "ERROR";
  }

  return "IDLE";
}

function getStatusClass(status) {
  if (status === "running") {
    return "worker-running";
  }

  if (status === "complete") {
    return "worker-complete";
  }

  if (status === "error") {
    return "worker-error";
  }

  return "worker-idle";
}

function getWorkerNumber(id) {
  return String(id).padStart(2, "0");
}

export default function WorkerStatus({
  workers = []
}) {
  return (
    <div className="worker-grid">

      {workers.map((worker) => {

        const statusClass =
          getStatusClass(
            worker.status
          );

        const statusLabel =
          getStatusLabel(
            worker.status
          );

        const progress =
          Math.min(
            Math.max(
              Number(worker.progress) || 0,
              0
            ),
            100
          );

        return (
          <div
            className={`worker-card ${statusClass}`}
            key={worker.id}
          >

            {/* =================================================
                WORKER HEADER
            ================================================= */}

            <div className="worker-card-header">

              <div className="worker-identity">

                <div className="worker-number">
                  {getWorkerNumber(
                    worker.id
                  )}
                </div>

                <div>
                  <strong>
                    {worker.name}
                  </strong>

                  <span>
                    Parallel worker
                  </span>
                </div>

              </div>

              <div className="worker-status-badge">

                <span className="worker-status-dot" />

                {statusLabel}

              </div>

            </div>

            {/* =================================================
                TASK
            ================================================= */}

            <div className="worker-task">

              <span className="worker-task-label">
                ASSIGNED TASK
              </span>

              <strong>
                {worker.task}
              </strong>

            </div>

            {/* =================================================
                PROGRESS
            ================================================= */}

            <div className="worker-progress-section">

              <div className="worker-progress-header">

                <span>
                  Progress
                </span>

                <strong>
                  {progress}%
                </strong>

              </div>

              <div className="worker-progress-track">

                <div
                  className="worker-progress-fill"
                  style={{
                    width:
                      `${progress}%`
                  }}
                />

              </div>

            </div>

            {/* =================================================
                EXECUTION TIME
            ================================================= */}

            <div className="worker-footer">

              <span>
                Execution time
              </span>

              <strong>
                {worker.duration !== null &&
                worker.duration !== undefined
                  ? `${worker.duration.toFixed(
                      2
                    )} ms`
                  : "—"}
              </strong>

            </div>

          </div>
        );
      })}

    </div>
  );
}
