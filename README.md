# Parallel Vision Lab

### Browser-Based Parallel AI Image Analysis with RF-DETR Nano

Parallel Vision Lab is a browser-based parallel-computing demonstration that combines **RF-DETR Nano object detection** with a deterministic **Deep Analysis Worker**. Independent workloads are executed in Web Workers and compared using a controlled serial-versus-parallel benchmark.

## 🌐 Live Application

**Live Demo:**  
https://parallel-ai-image-analysis.onrender.com/

**GitHub Repository:**  
https://github.com/jopaulkjoshy14/Parallel-AI-Image-Analysis

> Initial RF-DETR model loading may take some time. Model initialization is excluded from benchmark measurements.

## Project Objective

The project demonstrates how independent image-processing workloads can be decomposed and executed concurrently in a browser.

For a selected image, the system provides:

- **RF-DETR Nano** object detection
- Deterministic deep image analysis
- Serial execution
- Parallel Web Worker execution
- Result validation
- Actual performance measurement
- JSON and CSV benchmark export

## Final Application Structure

The application is organized into four primary navigation areas plus a dedicated results destination:

```text
HOME
 │
 ├── ANALYZE ──────────┐
 │                     │
 ├── BENCHMARK ────────┤──→ RESULTS
 │                     │
 └── ABOUT             │
                       │
                 Analysis or
                 Benchmark report
```

### Home

The landing dashboard introduces the project, shows system status, and provides entry points to image analysis, benchmarking, and the architecture overview.

### Analyze

The analysis workspace is focused on input and execution:

1. Select or drop an image.
2. Load RF-DETR Nano if required.
3. Run object detection and/or deep analysis.
4. On successful completion, the application navigates to the **Results** page.

### Benchmark

The benchmark workspace configures and runs the fixed experimental protocol:

- 1 warmup
- 3 measured serial runs
- 3 measured parallel runs

On successful completion, the application navigates to the **Results** page.

### Results

Results are intentionally separated from the action pages. The same results destination presents either an image-analysis report or a benchmark report depending on the operation that completed.

### About

The About page explains the architecture, technologies, benchmark methodology, and project philosophy.

## Architecture

```text
                         Browser
                            │
                         Image
                            │
             ┌──────────────┴──────────────┐
             │                             │
             ▼                             ▼
     RF-DETR Detection              Deep Analysis
          Worker                         Worker
             │                             │
             └──────────────┬──────────────┘
                            │
                            ▼
                    Result Validation
                            │
                            ▼
                    Benchmark Analysis
                            │
                            ▼
                         Results
```

The application intentionally uses **exactly two computational Web Workers**.

### RF-DETR Detection Worker

Responsible for:

- Loading RF-DETR Nano
- Running object detection
- Returning labels, confidence scores, and bounding boxes
- Measuring inference time

### Deep Analysis Worker

Responsible for deterministic image analysis including:

- Dominant colour extraction
- RGB statistics
- Mean luminance
- Luminance standard deviation
- Shannon entropy
- Sharpness
- Exposure classification
- Spatial luminance analysis
- RGB histograms
- Image dimensions and processing information

## Serial vs Parallel Execution

### Serial

```text
Image
  │
  ▼
RF-DETR Detection
  │
  ▼
Deep Analysis
  │
  ▼
Result
```

### Parallel

```text
                 ┌── RF-DETR Detection Worker ──┐
Image ───────────┤                               ├── Result
                 └── Deep Analysis Worker ───────┘
```

The parallel experiment dispatches both independent workloads concurrently.

## Benchmark Methodology

Every benchmark follows the fixed protocol:

```text
1 Warmup
   ↓
3 Serial Runs
   ↓
3 Parallel Runs
```

The warmup is excluded from aggregate statistics. RF-DETR model initialization is also excluded from benchmark timings.

Timing uses the browser's:

```javascript
performance.now()
```

The benchmark records:

- Wall-clock execution time
- Detection inference time
- Deep analysis time
- Mean serial time
- Mean parallel time
- Speedup
- Time saved
- Percentage improvement
- Parallel efficiency

The system does **not** force a positive result. If parallel execution is slower, that measured outcome is reported honestly.

## Result Validation

Serial and parallel outputs are validated before performance metrics are reported.

Validation covers the computational outputs of both workloads, including:

- Object detections
- Confidence scores
- Bounding boxes
- Dominant colours
- Image information
- Image statistics
- Entropy
- Sharpness
- Exposure
- Spatial analysis
- Histograms

This separates **correctness** from **performance**:

```text
Same input
    ↓
Serial execution ──────┐
                       ├── Validate ──→ Performance metrics
Parallel execution ────┘
```

## Example Experimental Result

One measured deployment run produced:

| Metric | Result |
|---|---:|
| Serial mean | 1976.67 ms |
| Parallel mean | 1877.67 ms |
| Speedup | 1.05× |
| Time saved | 99.00 ms |
| Improvement | 5.01% |
| Parallel efficiency | 52.64% |
| Validation | PASSED |

The result demonstrates actual concurrent execution, but the modest speedup also shows that parallelism does not automatically produce linear performance gains. RF-DETR inference dominates the workload while the deterministic analysis workload is comparatively small.

Browser scheduling, device hardware, system load, and runtime conditions can affect individual measurements.

## Technologies Used

### Frontend

- React
- Vite
- CSS

### AI and Runtime

- Transformers.js
- RF-DETR Nano
- ONNX Runtime Web
- WebAssembly

### Parallel Computing

- Web Workers
- `performance.now()`

### Image Processing

- Canvas / OffscreenCanvas
- K-Means colour extraction
- RGB histograms
- Statistical image analysis

### Deployment

- Render

## Project Structure

```text
parallel-ai-image-analysis/
│
├── src/
│   ├── workers/
│   │   └── analysis.worker.js
│   │
│   ├── app.js
│   ├── benchmark.js
│   ├── benchmarkAnalyzer.js
│   ├── benchmarkController.js
│   ├── benchmarkExport.js
│   ├── detection.worker.js
│   ├── experimentRunner.js
│   ├── main.js
│   ├── resultValidator.js
│   └── style.css
│
├── index.html
├── package.json
├── render.yaml
├── vite.config.js
└── README.md
```

## Experimental Integrity

The project follows these principles:

- No artificial delays
- No hardcoded speedup values
- No forced positive performance result
- Same image for serial and parallel execution
- Same computational workers
- Fixed benchmark protocol
- Warmup excluded from measured statistics
- Model initialization excluded
- Actual browser timing used
- Serial and parallel outputs validated before performance reporting

## Limitations

Browser-based performance can vary because of:

- CPU scheduling
- Web Worker scheduling
- Browser activity
- Background processes
- Thermal throttling
- Memory pressure
- Device hardware

The current benchmark uses three measured runs for each execution mode, so it is intended as a controlled project demonstration rather than a large statistical performance study.

## Conclusion

Parallel Vision Lab demonstrates task parallelism in a real browser environment by running RF-DETR Nano object detection and deterministic image analysis as independent workloads.

The application separates **input and execution** from **result presentation**, provides responsive layouts for mobile and desktop screens, validates computational equivalence, and reports measured performance without artificially guaranteeing a speedup.

The project therefore demonstrates not only how parallel browser workloads can be implemented, but also how their performance should be **measured, validated, interpreted, and presented honestly**.

## Author

**Jopaul K Joshy**

Final Year Major Project
