# Parallel Vision Lab

## 🌐 Live Application

### 🚀 Try Parallel Vision Lab

The latest deployed version of the project is available online:

**🔗 Live Demo:**
https://parallel-ai-image-analysis.onrender.com/

**💻 Source Code:**
https://github.com/jopaulkjoshy14/Parallel-AI-Image-Analysis

> **Note:** The application performs AI inference and image analysis directly in the browser. Initial model loading may take some time, depending on the device and network connection. Benchmark measurements begin only after model initialization is complete.

### Quick Access

| Resource             | Link                                                         |
| -------------------- | ------------------------------------------------------------ |
| 🌐 Live Demo         | https://parallel-ai-image-analysis.onrender.com/             |
| 📦 GitHub Repository | https://github.com/jopaulkjoshy14/Parallel-AI-Image-Analysis |

---

### Browser-Based Parallel AI Image Analysis with RF-DETR Nano

Parallel Vision Lab is a browser-based parallel computing system that demonstrates how **Web Workers can be used to execute independent image-analysis workloads concurrently**.

The system combines:

* **RF-DETR Nano** for AI-based object detection
* A deterministic **Deep Analysis Worker** for classical image analysis
* **Web Workers** for parallel execution
* A controlled benchmark protocol for comparing serial and parallel execution
* Result validation to ensure that parallel execution produces computationally equivalent results

The application runs directly in the browser and is designed as an experimental demonstration of **parallel computing for AI-assisted image processing**.

---

## Live Application

**Parallel Vision Lab:**
https://parallel-ai-image-analysis.onrender.com/

---

## Project Objective

The primary objective of this project is to experimentally demonstrate the difference between **serial and parallel execution of independent image-processing tasks** in a browser environment.

For a selected image, the system performs two computational workloads:

1. **AI Object Detection**

   * RF-DETR Nano
   * Detects objects present in the image
   * Produces object labels, confidence scores, and bounding boxes

2. **Deep Image Analysis**

   * Deterministic image processing
   * Dominant colour extraction
   * Image statistics
   * Entropy
   * Sharpness
   * Exposure analysis
   * Spatial luminance analysis
   * RGB histograms

These workloads are executed in two different modes.

### Serial execution

```text
Image
  │
  ├── RF-DETR Detection
  │
  └── Deep Image Analysis
```

The second workload begins after the first workload completes.

### Parallel execution

```text
                 ┌── RF-DETR Detection Worker ──┐
Image ───────────┤                               ├── Results
                 └── Deep Analysis Worker ───────┘
```

Both workloads are dispatched concurrently using separate Web Workers.

---

## Key Features

### AI Object Detection

The application uses:

**RF-DETR Nano**

Model:

`onnx-community/rfdetr_nano-ONNX`

The model runs locally in the browser through Transformers.js and ONNX Runtime Web.

Detection results include:

* Object class
* Confidence score
* Bounding box
* Detection inference time

---

### Deterministic Deep Image Analysis

The second worker performs deterministic image processing independently of the AI detector.

The analysis includes:

* Five dominant colours
* RGB statistics
* Mean luminance
* Luminance standard deviation
* Shannon entropy
* Image sharpness
* Exposure classification
* Center luminance
* Outer-region luminance
* RGB histograms
* Image dimensions
* Processed dimensions
* Resize status

The same image and deterministic processing procedure are used during both serial and parallel executions.

---

## Architecture

```text
                         Browser
                            │
                            ▼
                     React Application
                            │
             ┌──────────────┴──────────────┐
             │                             │
             ▼                             ▼
     Detection Worker              Deep Analysis Worker
             │                             │
             ▼                             ▼
       RF-DETR Nano              Deterministic Analysis
             │                             │
             └──────────────┬──────────────┘
                            │
                            ▼
                    Benchmark Controller
                            │
                            ▼
                    Result Validation
                            │
                            ▼
                  Performance Analysis
                            │
                            ▼
                         UI Report
```

The **main thread is responsible for orchestration and presentation**, while computational workloads are delegated to Web Workers.

---

## Worker Design

The project intentionally uses **exactly two computational workers**.

### Worker 1 — RF-DETR Detection Worker

Responsible for:

* Loading RF-DETR Nano
* Running object detection
* Returning detections
* Measuring inference time

Model initialization occurs once and is **excluded from benchmark measurements**.

---

### Worker 2 — Deep Analysis Worker

Responsible for:

* Image decoding
* Image resizing when required
* Dominant colour extraction
* Image statistics
* Entropy calculation
* Sharpness calculation
* Exposure analysis
* Spatial luminance analysis
* Histogram generation

The analysis pipeline is deterministic so that results can be compared between serial and parallel executions.

---

## Benchmark Methodology

The benchmark follows a fixed experimental protocol:

```text
1 Warmup
     ↓
3 Serial Runs
     ↓
3 Parallel Runs
```

Therefore, every benchmark consists of exactly:

**1 warmup + 3 serial + 3 parallel = 7 executions**

The warmup execution is excluded from the reported performance statistics.

### Why warmup?

The first execution may be affected by browser/runtime initialization, memory allocation, Web Worker startup, and other transient effects.

The warmup reduces the influence of these one-time effects on the measured runs.

### Model initialization

RF-DETR model loading and initialization are explicitly excluded from benchmark timings.

Only actual image-processing execution is measured.

---

## Timing

Execution time is measured using the browser's:

```javascript
performance.now()
```

The benchmark records:

* Total wall-clock execution time
* RF-DETR detection time
* Deep analysis time

The primary speedup metric is calculated from the measured wall-clock means.

```text
Speedup = Mean Serial Time / Mean Parallel Time
```

Parallel efficiency is calculated as:

```text
Efficiency = Speedup / Worker Count × 100
```

The system does not assume that parallel execution must be faster.

If parallel execution is slower, the benchmark reports the negative performance result rather than artificially improving or modifying the measurements.

---

## Result Validation

Performance measurements are reported only after serial and parallel results are compared.

The validator checks that corresponding results are equivalent within defined numerical tolerances.

Validation covers computational outputs such as:

* Object detections
* Confidence scores
* Bounding boxes
* Dominant colours
* Image information
* Image statistics
* Entropy
* Sharpness
* Exposure
* Spatial analysis
* Histograms

A benchmark therefore produces both:

```text
Performance Result
        +
Correctness Validation
```

This prevents a faster execution from being considered successful if it produces invalid or inconsistent results.

---

## Example Experimental Result

One measured benchmark on the deployed system produced:

| Metric              |     Result |
| ------------------- | ---------: |
| Serial mean         | 1976.67 ms |
| Parallel mean       | 1877.67 ms |
| Speedup             |      1.05× |
| Time saved          |   99.00 ms |
| Improvement         |      5.01% |
| Parallel efficiency |     52.64% |
| Validation          |     PASSED |

Measured runs:

| Mode     | Run | Wall Time | Detection | Analysis |
| -------- | --: | --------: | --------: | -------: |
| Serial   |   1 |   1890 ms |   1872 ms |    14 ms |
| Serial   |   2 |   2090 ms |   2065 ms |    20 ms |
| Serial   |   3 |   1950 ms |   1919 ms |    24 ms |
| Parallel |   1 |   1945 ms |   1941 ms |    21 ms |
| Parallel |   2 |   2073 ms |   2069 ms |    23 ms |
| Parallel |   3 |   1615 ms |   1612 ms |    32 ms |

These values are an example of one experimental run on the deployed browser environment. Performance can vary depending on device hardware, browser scheduling, system load, thermal conditions, and runtime behaviour.

### Interpretation

The experiment achieved a **1.05× speedup**.

This demonstrates that the two workloads can overlap in execution, but the performance benefit is limited because RF-DETR inference dominates the total computational workload while the deterministic analysis workload is comparatively small.

The experiment therefore demonstrates an important property of parallel computing:

> Parallel execution does not automatically produce linear speedup.

The achieved performance depends on workload balance, scheduling overhead, runtime behaviour, and the amount of computation that can actually execute concurrently.

---

## Why the Speedup Is Not 2×

Although the system uses two workers, two workers do not imply a theoretical 2× speedup.

The workloads are significantly different in computational cost.

Approximately:

```text
RF-DETR detection  → dominant workload
Deep analysis      → relatively small workload
```

During serial execution:

```text
Tserial ≈ Tdetection + Tanalysis
```

During parallel execution:

```text
Tparallel ≈ max(Tdetection, Tanalysis) + overhead
```

Because the detection workload dominates execution time, there is limited additional work that can be hidden through parallelism.

This makes the observed result useful as a practical demonstration of **Amdahl's Law and workload imbalance**.

---

## Technologies Used

### Frontend

* React
* Vite
* Bootstrap/CSS

### Parallel Computing

* Web Workers
* `performance.now()`
* Concurrent worker execution

### AI

* Transformers.js
* RF-DETR Nano
* ONNX Runtime Web
* WebAssembly

### Image Processing

* Canvas / OffscreenCanvas
* K-Means clustering
* RGB histogram analysis
* Statistical image analysis

### Deployment

* Render
* Static web deployment

---

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

---

## Execution Flow

### 1. Image Selection

The user selects a PNG, JPG, or WebP image.

### 2. Image Preview

The image is displayed in the browser.

### 3. AI Detection

RF-DETR Nano performs object detection in the dedicated detection worker.

### 4. Deep Analysis

The Deep Analysis Worker performs deterministic image processing.

### 5. Benchmark

The system executes:

```text
Warmup
   ↓
Serial × 3
   ↓
Parallel × 3
```

### 6. Validation

Serial and parallel results are compared.

### 7. Performance Analysis

The system calculates:

* Mean serial time
* Mean parallel time
* Speedup
* Time saved
* Percentage improvement
* Parallel efficiency
* Worker timing information
* Performance interpretation

### 8. Visualization

The benchmark results are displayed in the application.

---

## Experimental Integrity

The project follows several principles to maintain benchmark integrity:

* No artificial delays
* No hardcoded speedup values
* No forced positive results
* No removal of slow measurements
* Same input image for serial and parallel execution
* Same computational algorithms
* Same workers
* Fixed number of measured runs
* Warmup excluded from statistics
* Model initialization excluded
* Results validated before performance reporting
* Actual wall-clock measurements used

The purpose of the benchmark is to **measure parallel performance**, not to guarantee a positive result.

---

## Limitations

The current implementation has several practical limitations.

### Browser Runtime Variability

Browser-based execution can be affected by:

* CPU scheduling
* Browser activity
* Background processes
* Thermal throttling
* Memory pressure
* Web Worker scheduling

Therefore, benchmark results may vary between runs and devices.

### Workload Imbalance

RF-DETR inference is substantially more computationally expensive than the deterministic analysis workload.

Consequently, the parallel workload is not perfectly balanced.

### Limited Benchmark Sample Size

The current experimental protocol uses three measured serial runs and three measured parallel runs.

This provides a controlled demonstration but is not intended to represent a large-scale statistical performance study.

### Device Dependence

The measured execution time depends heavily on the hardware and browser environment on which the application is executed.

---

## Security and Privacy Considerations

Image processing is performed in the browser.

The selected image is processed locally by the application and computational workloads are executed using browser APIs and Web Workers.

The project is designed primarily as a **parallel computing and image-analysis demonstration**, rather than as a cloud-based image-processing service.

Users should nevertheless avoid uploading sensitive images when using experimental or third-party deployments.

---

## Research and Educational Value

This project demonstrates several concepts from parallel and distributed computing in a practical browser environment:

* Task parallelism
* Web Worker concurrency
* Workload decomposition
* Synchronization
* Execution-time measurement
* Speedup
* Parallel efficiency
* Amdahl's Law
* Workload imbalance
* Runtime overhead
* Experimental validation

The project also demonstrates how AI inference can be integrated into a parallel image-processing pipeline without moving the computational workload to a traditional server.

---

## Future Improvements

Potential extensions include:

* Larger benchmark sample sizes
* Multiple image-size experiments
* CPU and hardware profiling
* More balanced computational workloads
* Additional object-detection models
* GPU/WebGPU execution
* Adaptive workload scheduling
* More detailed worker utilization analysis
* Statistical confidence intervals
* Cross-device benchmark comparison

---

## Conclusion

Parallel Vision Lab demonstrates a browser-based approach to parallel image analysis using **two independent Web Workers**.

RF-DETR Nano performs AI object detection while a second worker performs deterministic image analysis. The benchmark executes both workloads serially and concurrently, measures their actual execution times, validates their results, and reports the resulting performance metrics.

The experimental results show that parallelism can reduce execution time, but the improvement depends strongly on workload characteristics. In the demonstrated experiment, the system achieved a **1.05× speedup**, showing that concurrency was successfully achieved while also illustrating the practical limitations of parallel execution when workloads are highly imbalanced.

The project therefore focuses not only on obtaining faster execution, but on **measuring, validating, and understanding parallel performance in a real browser environment**.

---
