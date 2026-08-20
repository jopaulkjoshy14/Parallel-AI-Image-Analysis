import React, {
  useRef,
  useState
} from "react";

export default function ImageUploader({
  onImageSelected,
  disabled
}) {
  const inputRef =
    useRef(null);

  const [dragging, setDragging] =
    useState(false);

  const [error, setError] =
    useState("");

  function validateFile(file) {
    if (!file) {
      return false;
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp"
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setError(
        "Please select a PNG, JPG or WebP image."
      );

      return false;
    }

    setError("");

    return true;
  }

  function handleFile(file) {
    if (disabled) {
      return;
    }

    if (!validateFile(file)) {
      return;
    }

    onImageSelected(file);
  }

  function handleInputChange(event) {
    const file =
      event.target.files?.[0];

    handleFile(file);

    /*
     * Allows the same file to be
     * selected again later.
     */

    event.target.value = "";
  }

  function handleDragOver(event) {
    event.preventDefault();

    if (disabled) {
      return;
    }

    setDragging(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();

    setDragging(false);
  }

  function handleDrop(event) {
    event.preventDefault();

    setDragging(false);

    if (disabled) {
      return;
    }

    const file =
      event.dataTransfer.files?.[0];

    handleFile(file);
  }

  function openFilePicker() {
    if (disabled) {
      return;
    }

    inputRef.current?.click();
  }

  return (
    <div>

      <div
        className={`upload-zone ${
          dragging
            ? "upload-zone-dragging"
            : ""
        } ${
          disabled
            ? "upload-zone-disabled"
            : ""
        }`}
        onClick={
          openFilePicker
        }
        onDragOver={
          handleDragOver
        }
        onDragLeave={
          handleDragLeave
        }
        onDrop={
          handleDrop
        }
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(event) => {
          if (
            event.key ===
              "Enter" ||
            event.key ===
              " "
          ) {
            event.preventDefault();
            openFilePicker();
          }
        }}
      >

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="d-none"
          disabled={disabled}
          onChange={
            handleInputChange
          }
        />

        {/* ================================================
            Upload icon
        ================================================= */}

        <div className="upload-icon">

          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M12 16V4"
            />

            <path
              d="M7 9l5-5 5 5"
            />

            <path
              d="M5 20h14"
            />
          </svg>

        </div>

        {/* ================================================
            Upload text
        ================================================= */}

        <div className="upload-content">

          <strong>
            {dragging
              ? "Drop your image here"
              : "Upload an image"}
          </strong>

          <span>
            Drag & drop or click to browse
          </span>

          <small>
            PNG · JPG · WebP
          </small>

        </div>

        <div className="upload-action">
          Browse files
        </div>

      </div>

      {/* ================================================
          Validation error
      ================================================= */}

      {error && (
        <div className="upload-error">
          <span>!</span>

          {error}
        </div>
      )}

    </div>
  );
}
