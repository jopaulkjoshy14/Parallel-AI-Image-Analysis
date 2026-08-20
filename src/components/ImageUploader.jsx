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

  const [
    dragging,
    setDragging
  ] = useState(false);

  function handleFile(file) {
    if (!file || disabled) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert(
        "Please select a valid image file."
      );
      return;
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
      alert(
        "Please select a PNG, JPG or WebP image."
      );
      return;
    }

    onImageSelected(file);

    /*
     * Reset the input so selecting the same
     * image again still triggers onChange.
     */
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleDragOver(event) {
    event.preventDefault();

    if (!disabled) {
      setDragging(true);
    }
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

  function handleKeyDown(event) {
    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      openFilePicker();
    }
  }

  return (
    <div
      className={`drop-zone ${
        dragging
          ? "drop-zone-active"
          : ""
      } ${
        disabled
          ? "drop-zone-disabled"
          : ""
      }`}
      onClick={
        openFilePicker
      }
      onDragOver={
        handleDragOver
      }
      onDragEnter={
        handleDragOver
      }
      onDragLeave={
        handleDragLeave
      }
      onDrop={
        handleDrop
      }
      onKeyDown={
        handleKeyDown
      }
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload an image"
      aria-disabled={disabled}
    >

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="d-none"
        disabled={disabled}
        onChange={(event) =>
          handleFile(
            event.target.files?.[0]
          )
        }
      />

      {/* Upload icon */}

      <div className="upload-icon">
        <svg
          viewBox="0 0 24 24"
          width="30"
          height="30"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path
            d="M12 16V4"
          />

          <path
            d="m7 9 5-5 5 5"
          />

          <path
            d="M4 20h16"
          />
        </svg>
      </div>

      {/* Main message */}

      <div className="upload-content">

        <strong className="upload-title">
          {dragging
            ? "Drop your image here"
            : "Upload an image"}
        </strong>

        <p className="upload-description">
          Drag and drop your image here,
          or click to browse your device.
        </p>

      </div>

      {/* Supported formats */}

      <div className="upload-formats">

        <span>
          JPG
        </span>

        <span>
          PNG
        </span>

        <span>
          WebP
        </span>

      </div>

      {/* Bottom hint */}

      <div className="upload-hint">
        Your image stays in the browser
        during analysis.
      </div>

    </div>
  );
          }
