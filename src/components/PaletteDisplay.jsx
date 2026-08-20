import React from "react";

export default function PaletteDisplay({
  palette
}) {
  if (!palette?.length) {
    return (
      <div className="palette-empty">
        <div className="palette-empty-icon">
          ◇
        </div>

        <div>
          <strong>
            No palette available yet
          </strong>

          <span>
            Run the analysis to extract
            dominant colours.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="palette-display">

      <div className="palette-swatch-grid">

        {palette.map(
          (colour, index) => (
            <div
              className={`palette-item ${
                index === 0
                  ? "palette-item-primary"
                  : ""
              }`}
              key={`${colour.hex}-${index}`}
            >

              {/* Colour preview */}

              <div
                className="palette-colour"
                style={{
                  backgroundColor:
                    colour.hex
                }}
              >

                <span className="palette-index">
                  {String(
                    index + 1
                  ).padStart(
                    2,
                    "0"
                  )}
                </span>

              </div>

              {/* Colour information */}

              <div className="palette-info">

                <span className="palette-label">
                  {index === 0
                    ? "DOMINANT"
                    : `COLOUR ${String(
                        index + 1
                      ).padStart(
                        2,
                        "0"
                      )}`}
                </span>

                <strong className="palette-hex">
                  {colour.hex}
                </strong>

              </div>

            </div>
          )
        )}

      </div>

      {/* Combined palette strip */}

      <div className="palette-strip">

        {palette.map(
          (colour, index) => (
            <div
              key={`strip-${colour.hex}-${index}`}
              className="palette-strip-colour"
              style={{
                backgroundColor:
                  colour.hex
              }}
              title={colour.hex}
            />
          )
        )}

      </div>

    </div>
  );
}
