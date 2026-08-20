import React, {
  useEffect,
  useRef
} from "react";

export default function Histogram({
  histogram
}) {
  const canvasRef =
    useRef(null);

  useEffect(() => {
    const canvas =
      canvasRef.current;

    if (
      !canvas ||
      !histogram ||
      !histogram.red ||
      !histogram.green ||
      !histogram.blue
    ) {
      return;
    }

    const context =
      canvas.getContext("2d");

    if (!context) {
      return;
    }

    const pixelRatio =
      window.devicePixelRatio || 1;

    const render = () => {
      const cssWidth =
        canvas.clientWidth || 600;

      const cssHeight =
        canvas.clientHeight || 260;

      canvas.width =
        cssWidth * pixelRatio;

      canvas.height =
        cssHeight * pixelRatio;

      context.setTransform(
        pixelRatio,
        0,
        0,
        pixelRatio,
        0,
        0
      );

      context.clearRect(
        0,
        0,
        cssWidth,
        cssHeight
      );

      const width =
        cssWidth;

      const height =
        cssHeight;

      const maxValue =
        Math.max(
          ...histogram.red,
          ...histogram.green,
          ...histogram.blue
        );

      if (
        !Number.isFinite(maxValue) ||
        maxValue <= 0
      ) {
        return;
      }

      /*
       * -------------------------------------------------
       * Background grid
       * -------------------------------------------------
       */

      context.save();

      context.strokeStyle =
        "rgba(120, 130, 145, 0.14)";

      context.lineWidth = 1;

      const horizontalLines = 4;

      for (
        let i = 1;
        i <= horizontalLines;
        i++
      ) {
        const y =
          (height / (horizontalLines + 1)) *
          i;

        context.beginPath();

        context.moveTo(
          0,
          y
        );

        context.lineTo(
          width,
          y
        );

        context.stroke();
      }

      /*
       * Vertical guide lines
       */

      [0, 64, 128, 192, 255].forEach(
        (value) => {
          const x =
            (value / 255) *
            width;

          context.beginPath();

          context.moveTo(
            x,
            0
          );

          context.lineTo(
            x,
            height
          );

          context.stroke();
        }
      );

      context.restore();

      /*
       * -------------------------------------------------
       * Draw RGB channels
       * -------------------------------------------------
       */

      const drawChannel = (
        values,
        strokeStyle,
        fillStyle
      ) => {
        context.beginPath();

        for (
          let i = 0;
          i < 256;
          i++
        ) {
          const x =
            (i / 255) *
            width;

          const normalized =
            values[i] / maxValue;

          const y =
            height -
            normalized * height;

          if (i === 0) {
            context.moveTo(
              x,
              y
            );
          } else {
            context.lineTo(
              x,
              y
            );
          }
        }

        /*
         * Fill the area below
         * the histogram curve.
         */

        context.lineTo(
          width,
          height
        );

        context.lineTo(
          0,
          height
        );

        context.closePath();

        context.fillStyle =
          fillStyle;

        context.fill();

        /*
         * Draw the actual curve.
         */

        context.beginPath();

        for (
          let i = 0;
          i < 256;
          i++
        ) {
          const x =
            (i / 255) *
            width;

          const normalized =
            values[i] / maxValue;

          const y =
            height -
            normalized * height;

          if (i === 0) {
            context.moveTo(
              x,
              y
            );
          } else {
            context.lineTo(
              x,
              y
            );
          }
        }

        context.strokeStyle =
          strokeStyle;

        context.lineWidth = 1.6;

        context.stroke();
      };

      /*
       * RGB channels
       */

      drawChannel(
        histogram.red,
        "rgba(239, 68, 68, 0.85)",
        "rgba(239, 68, 68, 0.06)"
      );

      drawChannel(
        histogram.green,
        "rgba(34, 197, 94, 0.80)",
        "rgba(34, 197, 94, 0.05)"
      );

      drawChannel(
        histogram.blue,
        "rgba(59, 130, 246, 0.85)",
        "rgba(59, 130, 246, 0.06)"
      );
    };

    render();

    const resizeObserver =
      new ResizeObserver(
        render
      );

    resizeObserver.observe(
      canvas
    );

    return () => {
      resizeObserver.disconnect();
    };
  }, [histogram]);

  return (
    <div className="histogram-wrapper">

      {/* =================================================
          Histogram header
      ================================================= */}

      <div className="histogram-header">

        <div>
          <span className="histogram-label">
            PIXEL DISTRIBUTION
          </span>

          <small>
            RGB intensity · 0–255
          </small>
        </div>

        <div className="histogram-legend">

          <span>
            <i className="legend-dot legend-red" />
            R
          </span>

          <span>
            <i className="legend-dot legend-green" />
            G
          </span>

          <span>
            <i className="legend-dot legend-blue" />
            B
          </span>

        </div>

      </div>

      {/* =================================================
          Canvas
      ================================================= */}

      {histogram ? (

        <div className="histogram-chart">

          <canvas
            ref={canvasRef}
            className="histogram-canvas"
          />

          <div className="histogram-axis">

            <span>
              0
            </span>

            <span>
              64
            </span>

            <span>
              128
            </span>

            <span>
              192
            </span>

            <span>
              255
            </span>

          </div>

        </div>

      ) : (

        <div className="histogram-empty">

          <div className="histogram-empty-icon">
            ▥
          </div>

          <strong>
            No histogram available yet
          </strong>

          <span>
            Run the analysis to calculate
            RGB pixel distribution.
          </span>

        </div>

      )}

    </div>
  );
}
