import React from "react";

function statusClass(status) {
  if (status === "running") {
    return "status-running";
  }

  if (status === "complete") {
    return "status-complete";
  }

  if (status === "error") {
    return "status-error";
  }

  return "status-idle";
}

export default function WorkerStatus({
  workers
}) {
  return (
    <div className="row g-2">
      {workers.map((worker) => (
        <div
          className="col-12 col-md-6"
          key={worker.id}
        >
          <div
            className={`worker-card ${
              worker.status === "running"
                ? "active"
                : worker.status ===
                  "complete"
                ? "complete"
                : worker.status ===
                  "error"
                ? "error"
                : ""
            }`}
          >
            <div className="d-flex justify-content-between">
              <strong>
                {worker.name}
              </strong>

              <span className="small">
                <span
                  className={`status-dot ${statusClass(
                    worker.status
                  )}`}
                />

                {worker.status}
              </span>
            </div>

            <div className="small text-secondary mt-1">
              {worker.task}
            </div>

            <div className="progress worker-progress mt-2">
              <div
                className="progress-bar"
                style={{
                  width: `${worker.progress}%`
                }}
              />
            </div>

            {worker.duration !== null && (
              <div className="small mt-2">
                Time:{" "}
                <strong>
                  {worker.duration.toFixed(
                    2
                  )} ms
                </strong>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
