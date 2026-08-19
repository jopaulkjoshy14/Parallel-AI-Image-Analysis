import React, {
  useRef
} from "react";

export default function ImageUploader({
  onImageSelected,
  disabled
}) {
  const inputRef =
    useRef(null);

  function handleFile(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    onImageSelected(file);
  }

  return (
    <div
      className="drop-zone"
      onClick={() =>
        inputRef.current?.click()
      }
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

      <div className="mb-2">
        <strong>
          Upload an image
        </strong>
      </div>

      <div className="text-secondary small">
        JPG, PNG or WebP
      </div>
    </div>
  );
}
