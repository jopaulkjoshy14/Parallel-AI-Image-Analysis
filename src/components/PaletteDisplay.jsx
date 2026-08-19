import React from "react";

export default function PaletteDisplay({
  palette
}) {
  if (!palette?.length) {
    return (
      <div className="text-secondary">
        No palette available yet.
      </div>
    );
  }

  return (
    <div className="palette-container">
      {palette.map(
        (colour, index) => (
          <div
            className="palette-item"
            key={`${colour.hex}-${index}`}
          >
            <div
              className="palette-colour"
              style={{
                backgroundColor:
                  colour.hex
              }}
            />

            <div className="palette-label">
              {colour.hex}
            </div>
          </div>
        )
      )}
    </div>
  );
}
