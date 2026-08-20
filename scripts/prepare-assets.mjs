import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, "..");

const modelId = "Xenova/mobilevit-x-small";

const modelDirectory = path.join(
  root,
  "public",
  "models",
  "Xenova",
  "mobilevit-x-small"
);

const wasmDirectory = path.join(
  root,
  "public",
  "wasm"
);

fs.mkdirSync(modelDirectory, {
  recursive: true
});

fs.mkdirSync(wasmDirectory, {
  recursive: true
});

console.log("\nPreparing local AI assets...\n");

/*
 * ---------------------------------------------------------
 * Download local AI model
 * ---------------------------------------------------------
 */

const modelFiles = [
  "config.json",
  "preprocessor_config.json",
  "onnx/model_quantized.onnx"
];

for (const file of modelFiles) {
  const destination =
    path.join(modelDirectory, file);

  const destinationDirectory =
    path.dirname(destination);

  fs.mkdirSync(
    destinationDirectory,
    {
      recursive: true
    }
  );

  if (fs.existsSync(destination)) {
    console.log(
      `✓ ${file} already exists`
    );

    continue;
  }

  const url =
    `https://huggingface.co/${modelId}/resolve/main/${file}`;

  console.log(
    `Downloading ${file}...`
  );

  try {
    execSync(
      `curl -L --fail --retry 3 "${url}" -o "${destination}"`,
      {
        stdio: "inherit"
      }
    );
  } catch {
    console.error(
      `Failed to download ${file}`
    );

    process.exit(1);
  }
}

/*
 * ---------------------------------------------------------
 * Copy ONNX Runtime Web assets
 * ---------------------------------------------------------
 *
 * Transformers.js may require both:
 *
 *   .wasm
 *   .mjs
 *
 * runtime files.
 *
 * Previously only .wasm files were copied,
 * which caused:
 *
 * Failed to fetch dynamically imported module:
 * ort-wasm-simd-threaded.jsep.mjs
 *
 * ---------------------------------------------------------
 */

console.log(
  "\nPreparing ONNX Runtime WASM files...\n"
);

const nodeModulesRoot =
  path.join(
    root,
    "node_modules",
    "onnxruntime-web",
    "dist"
  );

if (!fs.existsSync(nodeModulesRoot)) {
  console.error(
    "onnxruntime-web was not found. Run npm install first."
  );

  process.exit(1);
}

const runtimeFiles =
  fs
    .readdirSync(nodeModulesRoot)
    .filter(
      (file) =>
        file.endsWith(".wasm") ||
        file.endsWith(".mjs")
    );

if (runtimeFiles.length === 0) {
  console.error(
    "No ONNX Runtime WASM or MJS files were found."
  );

  process.exit(1);
}

for (const file of runtimeFiles) {
  fs.copyFileSync(
    path.join(
      nodeModulesRoot,
      file
    ),
    path.join(
      wasmDirectory,
      file
    )
  );

  console.log(
    `✓ ${file}`
  );
}

console.log(
  "\nLocal AI assets are ready.\n"
);
