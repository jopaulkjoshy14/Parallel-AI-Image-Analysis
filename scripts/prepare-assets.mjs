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

const wasmDirectory = path.join(root, "public", "wasm");

fs.mkdirSync(modelDirectory, { recursive: true });
fs.mkdirSync(wasmDirectory, { recursive: true });

console.log("\nPreparing local AI assets...\n");

const modelFiles = [
  "config.json",
  "preprocessor_config.json",
  "onnx/model_quantized.onnx"
];

for (const file of modelFiles) {
  const destination = path.join(modelDirectory, file);
  const destinationDirectory = path.dirname(destination);

  fs.mkdirSync(destinationDirectory, { recursive: true });

  if (fs.existsSync(destination)) {
    console.log(`✓ ${file} already exists`);
    continue;
  }

  const url =
    `https://huggingface.co/${modelId}/resolve/main/${file}`;

  console.log(`Downloading ${file}...`);

  try {
    execSync(
      `curl -L --fail --retry 3 "${url}" -o "${destination}"`,
      {
        stdio: "inherit"
      }
    );
  } catch {
    console.error(`Failed to download ${file}`);
    process.exit(1);
  }
}

console.log("\nPreparing ONNX Runtime WASM files...\n");

const nodeModulesRoot = path.join(
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

const wasmFiles = fs
  .readdirSync(nodeModulesRoot)
  .filter((file) => file.endsWith(".wasm"));

for (const file of wasmFiles) {
  fs.copyFileSync(
    path.join(nodeModulesRoot, file),
    path.join(wasmDirectory, file)
  );

  console.log(`✓ ${file}`);
}

console.log("\nLocal AI assets are ready.\n");
