# Parallel AI Image Analysis System

A browser-based application demonstrating task parallelism through concurrent image analysis and local AI inference using Web Workers.

## 📋 Overview

This system demonstrates practical parallel computing by executing meaningful image-analysis operations both sequentially and in parallel, measuring performance differences, and providing visual evidence of concurrent execution benefits (or limitations).

### Key Features

- **Local AI Inference**: Runs a lightweight Nano model in-browser using Transformers.js and ONNX Runtime Web/WASM
- **Task Parallelism**: Uses Web Workers to execute AI inference concurrently with traditional image analysis
- **Meaningful Analysis**: Performs 6+ image analysis operations that provide real information about the image
- **Scientific Benchmarking**: Warm-up + 3 measured runs with individual operation timings
- **Performance Metrics**: Speedup, efficiency, and detailed timing breakdowns
- **Worker Visualization**: Real-time worker status and workload visualization

## 🏗️ System Architecture

### Execution Strategies

**Sequential**: All operations run one after another in the main thread
