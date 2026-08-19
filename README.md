Parallel AI-Based Colour Palette Extraction and Image Analysis

A browser-based mini project that demonstrates parallel computing through AI-assisted image analysis. The application compares sequential and parallel execution of independent image-processing tasks and visualizes the resulting performance.

Project Objective

The objective of this project is to demonstrate how parallel computing can improve image-processing workloads by dividing independent tasks among multiple Web Workers.

For the same uploaded image, the application performs:

Dominant colour extraction using K-Means clustering

AI-based image classification using a pre-trained model

RGB histogram generation

Basic image statistics calculation


The application executes these tasks in two different ways:

Sequential Processing

Tasks are executed one after another using a single worker.

Image
  │
  ├── K-Means
  │
  ├── AI Classification
  │
  ├── Histogram
  │
  └── Image Statistics

Parallel Processing

Independent tasks are distributed among multiple Web Workers and executed concurrently.

Image
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ↓             ↓             ↓
    Worker 1      Worker 2      Worker 3      Worker 4
    K-Means          AI         Histogram     Statistics
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                      │
                    Results

The execution times are then compared to calculate speedup and parallel efficiency.


---

Features

Image Processing

Upload JPG, JPEG, PNG, or WebP images

Display uploaded image preview

Resize large images for efficient browser processing

Extract five dominant colours using K-Means clustering

Generate RGB histograms

Calculate basic image statistics


AI-Based Analysis

Perform image classification using a pre-trained AI model

Display the top five predictions

Display confidence scores

Run AI inference locally in the browser

No AI API key required

No model training required


Parallel Computing

Sequential processing using a single worker

Parallel processing using multiple Web Workers

Separate workers for independent image-processing tasks

Visualize worker status and workload

Display execution time for individual workers


Performance Analysis

Measure total sequential execution time

Measure total parallel execution time

Compare individual processing tasks

Calculate parallel speedup

Calculate parallel efficiency

Display sequential vs parallel metrics in a comparison table


Offline Capability

The application is designed to support local/offline operation after the required dependencies and AI model assets have been downloaded.


---

Technology Stack

Frontend

React

JavaScript

Bootstrap

HTML5

CSS3


Build Tool

Vite


Parallel Computing

Web Workers

JavaScript Worker API


Image Processing

Canvas API

OffscreenCanvas

K-Means clustering


Artificial Intelligence

Transformers.js

ONNX Runtime Web

MobileViT-XS

Pre-trained image-classification model


Deployment

Render Static Site


Version Control

Git

GitHub



---

AI Model

The project uses the pre-trained:

Xenova/mobilevit-x-small

MobileViT-XS is a lightweight vision model suitable for browser-based image classification.

The model is used directly for inference and is not trained or fine-tuned as part of this project.

Why a Pre-Trained Model?

Training an image-classification model from scratch would require:

A labelled image dataset

Significant computational resources

Training time

Model-training infrastructure

Additional implementation complexity


Since the objective of this project is primarily to demonstrate parallel computing and image-processing performance, training a new AI model is unnecessary.

Instead, a pre-trained model allows the project to demonstrate AI-based image analysis while keeping the project lightweight and practical.

AI Processing

The model performs image classification approximately as follows:

Uploaded Image
      │
      ↓
Image Preprocessing
      │
      ↓
MobileViT-XS
      │
      ↓
Class Predictions
      │
      ↓
Top 5 Predictions
      │
      ↓
Confidence Scores


---

Architecture

The application is entirely browser-based.

React Application
                                │
                  ┌─────────────┴─────────────┐
                  │                           │
          Sequential Processing       Parallel Processing
                  │                           │
             Web Worker                Web Workers
                  │                 ┌─────────┼─────────┐
                  │                 │         │         │
                  │              Worker 1  Worker 2  Worker 3  Worker 4
                  │              K-Means      AI     Histogram Statistics
                  │                 │         │         │         │
                  └─────────────────┴─────────┴─────────┴─────────┘
                                    │
                                    ↓
                              Result Display
                                    │
                                    ↓
                           Performance Analysis


---

Project Structure

parallel-ai-image-analysis/
│
├── package.json
├── vite.config.js
├── index.html
├── README.md
│
├── scripts/
│   └── prepare-assets.mjs
│
├── public/
│   ├── models/
│   │   └── Xenova/
│   │       └── mobilevit-x-small/
│   │           └── ...
│   │
│   └── wasm/
│       └── ...
│
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    │
    ├── components/
    │   ├── ImageUploader.jsx
    │   ├── SequentialPanel.jsx
    │   ├── ParallelPanel.jsx
    │   ├── PaletteDisplay.jsx
    │   ├── Histogram.jsx
    │   ├── WorkerStatus.jsx
    │   └── ComparisonTable.jsx
    │
    ├── workers/
    │   ├── sequentialWorker.js
    │   ├── colourWorker.js
    │   ├── histogramWorker.js
    │   ├── statisticsWorker.js
    │   └── aiWorker.js
    │
    └── utils/
        ├── kmeans.js
        ├── imageProcessing.js
        └── performance.js


---

How the Processing Works

1. Image Upload

The user uploads an image through the web interface.

The application:

1. Reads the image locally.


2. Creates an image bitmap.


3. Resizes very large images to a manageable resolution.


4. Extracts pixel data using the Canvas API.



The original image is not uploaded to an external AI service.


---

2. Dominant Colour Extraction

The application samples RGB pixels from the image.

K-Means clustering groups similar colours together.

For this project:

K = 5

Therefore, the application extracts five dominant colour clusters.

Example:

┌────────┬────────┬────────┬────────┬────────┐
│ Colour │ Colour │ Colour │ Colour │ Colour │
│   #1   │   #2   │   #3   │   #4   │   #5   │
└────────┴────────┴────────┴────────┴────────┘


---

3. AI Image Classification

The image is passed to the pre-trained MobileViT-XS model.

The model produces multiple possible image classes with confidence scores.

Example:

1. Golden Retriever       82.31%
2. Labrador Retriever      7.42%
3. Dog                      5.18%
4. Sporting Dog             2.91%
5. Terrier                  1.34%

The top five predictions are displayed.


---

4. RGB Histogram

The application calculates the distribution of:

Red

Green

Blue


pixel values.

The histogram provides a visual representation of the colour distribution of the image.


---

5. Image Statistics

The application calculates basic information including:

Image width

Image height

Pixel count

Aspect ratio

Average RGB value

Average brightness

File size



---

Sequential Execution

In the sequential implementation, processing tasks are executed one after another.

Start
  │
  ↓
K-Means
  │
  ↓
AI Classification
  │
  ↓
Histogram
  │
  ↓
Statistics
  │
  ↓
Finish

The total execution time is measured from the beginning of processing until all tasks are completed.


---

Parallel Execution

In the parallel implementation, independent tasks are assigned to separate Web Workers.

Start
                      │
          ┌───────────┼───────────┐
          │           │           │
          ↓           ↓           ↓
      Worker 1     Worker 2     Worker 3     Worker 4
       K-Means        AI       Histogram    Statistics
          │           │           │             │
          └───────────┴───────────┴─────────────┘
                      │
                      ↓
                    Finish

Each worker operates independently.

The application waits until all workers have completed their tasks.


---

Performance Metrics

Execution Time

The time required to complete the processing workload is measured in milliseconds.

Execution Time = End Time − Start Time


---

Speedup

Parallel speedup is calculated using:

Speedup = Sequential Execution Time
          ---------------------------
           Parallel Execution Time

For example:

Sequential = 1000 ms
Parallel   = 500 ms

Speedup = 1000 / 500
        = 2×

A speedup of 2× means that the measured parallel execution completed approximately twice as quickly as the sequential execution.


---

Parallel Efficiency

Parallel efficiency is calculated using:

Efficiency = Speedup
             -------- × 100
             Workers

For example:

Speedup = 2×
Workers = 4

Efficiency = (2 / 4) × 100
           = 50%


---

User Interface

The application uses a split-screen comparison.

┌─────────────────────────────┬─────────────────────────────┐
│                             │                             │
│       SEQUENTIAL            │          PARALLEL           │
│                             │                             │
│   Processing Status         │   Worker Workload           │
│   Colour Palette            │   Colour Palette            │
│   AI Prediction             │   AI Prediction             │
│   Histogram                 │   Histogram                 │
│   Statistics                │   Statistics                │
│   Execution Time            │   Execution Time             │
│                             │                             │
└─────────────────────────────┴─────────────────────────────┘

              SEQUENTIAL VS PARALLEL

┌───────────────────────────────────────────────────────────┐
│ Metric             │ Sequential │ Parallel                │
├────────────────────┼────────────┼─────────────────────────┤
│ Total Time         │            │                         │
│ K-Means            │            │                         │
│ AI Classification  │            │                         │
│ Histogram          │            │                         │
│ Statistics         │            │                         │
│ Worker Count       │            │                         │
│ Speedup            │            │                         │
│ Efficiency         │            │                         │
└───────────────────────────────────────────────────────────┘

An important design principle is that the results displayed on each side are generated independently by that execution path. The sequential panel displays the sequential results, while the parallel panel displays the results generated by the parallel workers.


---

Offline Operation

The application is designed so that AI inference can be performed locally.

Transformers.js is configured to use local model assets rather than requesting the model from a remote service during inference.

The relevant configuration is:

env.allowRemoteModels = false;
env.allowLocalModels = true;

The local model directory is:

public/models/

The ONNX Runtime WebAssembly files are stored in:

public/wasm/

Initial Setup

The first setup requires an Internet connection to download the required npm packages and model/runtime assets.

After the assets have been prepared, the application can be run locally without requiring Internet access for AI inference.


---

Installation

Prerequisites

Install:

Node.js

npm

Git


Check the installed versions:

node --version
npm --version
git --version


---

Clone the Repository

git clone <YOUR-GITHUB-REPOSITORY-URL>

Move into the project directory:

cd parallel-ai-image-analysis


---

Install Dependencies

npm install


---

Prepare AI Assets

Run:

npm run prepare-assets

This prepares:

The MobileViT-XS model

ONNX Runtime WebAssembly files


The downloaded assets are placed inside:

public/models/
public/wasm/


---

Run the Application

Start the Vite development server:

npm run dev

Vite will display a local address such as:

http://localhost:5173

Open that address in a browser.


---

Production Build

Create a production build using:

npm run build

The production files will be generated in:

dist/

To test the production build locally:

npm run preview


---

Render Deployment

The project can be deployed as a Render Static Site.

Build Command

npm run build

Publish Directory

dist

The build process also runs the asset-preparation step.

Therefore:

npm run build

performs:

Prepare AI Assets
       ↓
Vite Production Build
       ↓
      dist/


---

Cost

The project is designed to operate at zero software/API cost.

It does not require:

Paid AI APIs

OpenAI API

Google Cloud AI

AWS AI services

Dedicated inference servers

GPU servers

Paid databases


The AI inference is performed locally in the browser.


---

Model Training

No machine-learning model is trained as part of this project.

The project uses a pre-trained image-classification model.

The purpose of the AI component is to provide an additional computational workload that can participate in the sequential-versus-parallel comparison.

The primary research/educational focus remains:

Parallel Computing + Image Processing + Performance Analysis

rather than machine-learning model development.


---

Advantages of the Architecture

Runs in the browser

No backend required

No database required

No API key required

No paid AI service required

Supports local AI inference

Uses Web Workers for parallel processing

Easy to deploy as a static website

Can be hosted on Render

Can be demonstrated offline after initial setup

Provides measurable performance metrics

Provides visual evidence of worker workload



---

Limitations

Parallel execution does not guarantee a speedup for every image or device.

Actual performance depends on:

CPU architecture

Number of available CPU cores

Browser implementation

Image dimensions

Number of pixels processed

Web Worker overhead

Memory bandwidth

AI model inference time

Worker creation and communication overhead


For small workloads, sequential execution may sometimes be faster because parallel execution introduces overhead.

Therefore, the project does not assume that parallel processing will always be faster. Instead, it measures and displays the actual performance.


---

Important Performance Consideration

The AI model must be initialized before meaningful benchmark comparisons are performed.

Model download/loading time should not be treated as the actual image-processing workload.

The intended benchmark is:

Load Model
     ↓
Model Ready
     ↓
Start Benchmark
     ↓
Sequential Processing ──────┐
                            │
Parallel Processing ────────┤
                            ↓
                       Comparison
                            ↓
                  Speedup / Efficiency

This avoids incorrectly interpreting model initialization time as image-processing performance.


---

Future Improvements

Possible future extensions include:

Multiple benchmark iterations

Average execution time

Minimum and maximum execution time

Standard deviation

Dynamic worker count

Worker pool implementation

Larger image benchmarking

Additional image-processing algorithms

Additional AI models

Real-time worker utilization charts

CPU-core comparison

GPU/WebGPU inference

Downloadable performance reports

Benchmark history

Additional colour-space analysis such as HSV/LAB



---

# Academic Relevance

This project demonstrates practical concepts from Parallel Computing, including:

Task parallelism

Independent task execution

Worker-based parallelism

Inter-thread communication

Synchronization

Workload distribution

Execution-time measurement

Speedup

Parallel efficiency

Parallel overhead

Sequential vs parallel performance analysis


The project also demonstrates the integration of:

Image processing

Machine learning inference

Browser computing

JavaScript Web Workers

Performance measurement



---

# License

This project is licensed under the MIT License.

See the [LICENSE](LICENSE) file for the complete license text.

Copyright (c) 2026 Jopaul K Joshy
