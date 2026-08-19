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

    if (!canvas || !histogram) {
      return;
    }

    const context =
      canvas.getContext("2d");

    const width =
      canvas.width =
        canvas.clientWidth *
        window.devicePixelRatio;

    const height =
      canvas.height =
        canvas.clientHeight *
        window.devicePixelRatio;

    context.clearRect(
      0,
      0,
      width,
      height
    );

    const maxValue =
      Math.max(
        ...histogram.red,
        ...histogram.green,
        ...histogram.blue
      );

    const drawChannel =
      (values, lineType) => {
        context.beginPath();

        for (
          let i = 0;
          i < 256;
          i++
        ) {
          const x =
            (i / 255) *
            width;

          const y =
            height -
            (values[i] /
              maxValue) *
              height;

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

        context.globalCompositeOperation =
          "lighter";

        context.lineWidth =
          2 *
          window.devicePixelRatio;

        if (
          lineType === "red"
        ) {
          context.strokeStyle =
            "rgba(220,53,69,0.65)";
        } else if (
          lineType === "green"
        ) {
          context.strokeStyle =
            "rgba(25,135,84,0.65)";
        } else {
          context.strokeStyle =
            "rgba(13,110,253,0.65)";
        }

        context.stroke();
      };

    drawChannel(
      histogram.red,
      "red"
    );

    drawChannel(
      histogram.green,
      "green"
    );

    drawChannel(
      histogram.blue,
      "blue"
    );

    context.globalCompositeOperation =
      "source-over";
  }, [histogram]);

  return (
    <canvas
      ref={canvasRef}
      className="histogram-canvas"
    />
  );
}
