/*
 * Parallel Vision Lab
 * Result Validator
 *
 * Purpose:
 * Verify that SERIAL and PARALLEL executions produced
 * equivalent computational results.
 *
 * A performance result must NOT be considered valid if
 * the two execution modes produce materially different
 * outputs.
 *
 * The validator does not modify either result.
 */

const DEFAULT_TOLERANCES = {
  score: 0.01,
  coordinate: 2.0,
  percentage: 1.0,
  numeric: 0.01,
  sharpnessRelative: 0.05
};

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function approximatelyEqual(
  a,
  b,
  tolerance = DEFAULT_TOLERANCES.numeric
) {
  const first = Number(a);
  const second = Number(b);

  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    return false;
  }

  return Math.abs(first - second) <= tolerance;
}

function relativeEqual(a, b, tolerance) {
  const first = Number(a);
  const second = Number(b);

  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    return false;
  }

  const scale = Math.max(
    Math.abs(first),
    Math.abs(second),
    1
  );

  return Math.abs(first - second) / scale <= tolerance;
}

function addFailure(failures, category, message) {
  failures.push({
    category,
    message
  });
}

/*
 * ---------------------------------------------------------
 * Detection validation
 * ---------------------------------------------------------
 */

function validateDetections(
  serial,
  parallel,
  failures,
  tolerances
) {
  const serialDetections =
    Array.isArray(serial?.detections)
      ? serial.detections
      : [];

  const parallelDetections =
    Array.isArray(parallel?.detections)
      ? parallel.detections
      : [];

  if (serialDetections.length !== parallelDetections.length) {
    addFailure(
      failures,
      'detection',
      `Detection count differs: serial=${serialDetections.length}, parallel=${parallelDetections.length}`
    );

    return;
  }

  /*
   * Detection order should normally be stable, but we sort
   * by label and confidence so harmless ordering differences
   * do not invalidate the computation.
   */
  const normalize = (items) =>
    items
      .map((item) => ({
        label: String(item?.label ?? ''),
        score: Number(item?.score ?? 0),
        box: {
          xmin: Number(item?.box?.xmin ?? 0),
          ymin: Number(item?.box?.ymin ?? 0),
          xmax: Number(item?.box?.xmax ?? 0),
          ymax: Number(item?.box?.ymax ?? 0)
        }
      }))
      .sort((a, b) => {
        const labelCompare =
          a.label.localeCompare(b.label);

        if (labelCompare !== 0) {
          return labelCompare;
        }

        return a.score - b.score;
      });

  const a = normalize(serialDetections);
  const b = normalize(parallelDetections);

  for (let i = 0; i < a.length; i += 1) {
    if (a[i].label !== b[i].label) {
      addFailure(
        failures,
        'detection',
        `Detection ${i + 1} label differs: "${a[i].label}" vs "${b[i].label}"`
      );
    }

    if (
      !approximatelyEqual(
        a[i].score,
        b[i].score,
        tolerances.score
      )
    ) {
      addFailure(
        failures,
        'detection',
        `Detection ${i + 1} confidence differs: ${a[i].score} vs ${b[i].score}`
      );
    }

    const coordinates = [
      ['xmin', a[i].box.xmin, b[i].box.xmin],
      ['ymin', a[i].box.ymin, b[i].box.ymin],
      ['xmax', a[i].box.xmax, b[i].box.xmax],
      ['ymax', a[i].box.ymax, b[i].box.ymax]
    ];

    for (const [name, first, second] of coordinates) {
      if (
        !approximatelyEqual(
          first,
          second,
          tolerances.coordinate
        )
      ) {
        addFailure(
          failures,
          'detection',
          `Detection ${i + 1} ${name} differs: ${first} vs ${second}`
        );
      }
    }
  }
}

/*
 * ---------------------------------------------------------
 * Dominant colour validation
 * ---------------------------------------------------------
 */

function validateColours(
  serial,
  parallel,
  failures,
  tolerances
) {
  const serialColours =
    Array.isArray(serial?.colors)
      ? serial.colors
      : [];

  const parallelColours =
    Array.isArray(parallel?.colors)
      ? parallel.colors
      : [];

  if (serialColours.length !== parallelColours.length) {
    addFailure(
      failures,
      'colour',
      `Dominant colour count differs: serial=${serialColours.length}, parallel=${parallelColours.length}`
    );

    return;
  }

  for (let i = 0; i < serialColours.length; i += 1) {
    const a = serialColours[i];
    const b = parallelColours[i];

    /*
     * K-Means is deterministic in our analysis worker.
     * Therefore the RGB values and hexadecimal colour should
     * normally match exactly.
     *
     * We still tolerate a tiny percentage difference.
     */
    if (String(a?.hex ?? '').toUpperCase() !==
        String(b?.hex ?? '').toUpperCase()) {
      addFailure(
        failures,
        'colour',
        `Dominant colour ${i + 1} differs: ${a?.hex ?? 'unknown'} vs ${b?.hex ?? 'unknown'}`
      );
    }

    const rgbA = a?.rgb || {};
    const rgbB = b?.rgb || {};

    for (const channel of ['r', 'g', 'b']) {
      if (
        !approximatelyEqual(
          rgbA[channel],
          rgbB[channel],
          1
        )
      ) {
        addFailure(
          failures,
          'colour',
          `Colour ${i + 1} RGB ${channel} differs.`
        );
      }
    }

    if (
      !approximatelyEqual(
        a?.percentage,
        b?.percentage,
        tolerances.percentage
      )
    ) {
      addFailure(
        failures,
        'colour',
        `Colour ${i + 1} percentage differs: ${a?.percentage} vs ${b?.percentage}`
      );
    }
  }
}

/*
 * ---------------------------------------------------------
 * Statistics validation
 * ---------------------------------------------------------
 */

function validateStatistics(
  serial,
  parallel,
  failures,
  tolerances
) {
  const a = serial?.statistics;
  const b = parallel?.statistics;

  if (!a || !b) {
    addFailure(
      failures,
      'statistics',
      'Statistics result is missing from one execution.'
    );

    return;
  }

  if (Number(a.pixelCount) !== Number(b.pixelCount)) {
    addFailure(
      failures,
      'statistics',
      `Pixel count differs: ${a.pixelCount} vs ${b.pixelCount}`
    );
  }

  const meanA = a.meanRGB || {};
  const meanB = b.meanRGB || {};

  for (const channel of ['r', 'g', 'b']) {
    if (
      !approximatelyEqual(
        meanA[channel],
        meanB[channel],
        tolerances.numeric
      )
    ) {
      addFailure(
        failures,
        'statistics',
        `Mean RGB ${channel} differs.`
      );
    }
  }

  if (
    !approximatelyEqual(
      a.meanLuminance,
      b.meanLuminance,
      tolerances.numeric
    )
  ) {
    addFailure(
      failures,
      'statistics',
      `Mean luminance differs: ${a.meanLuminance} vs ${b.meanLuminance}`
    );
  }

  if (
    !approximatelyEqual(
      a.luminanceStdDev,
      b.luminanceStdDev,
      tolerances.numeric
    )
  ) {
    addFailure(
      failures,
      'statistics',
      `Luminance standard deviation differs.`
    );
  }
}

/*
 * ---------------------------------------------------------
 * Entropy validation
 * ---------------------------------------------------------
 */

function validateEntropy(
  serial,
  parallel,
  failures,
  tolerances
) {
  if (
    !approximatelyEqual(
      serial?.entropy,
      parallel?.entropy,
      tolerances.numeric
    )
  ) {
    addFailure(
      failures,
      'entropy',
      `Entropy differs: ${serial?.entropy} vs ${parallel?.entropy}`
    );
  }
}

/*
 * ---------------------------------------------------------
 * Sharpness validation
 * ---------------------------------------------------------
 */

function validateSharpness(
  serial,
  parallel,
  failures,
  tolerances
) {
  if (
    !relativeEqual(
      serial?.sharpness,
      parallel?.sharpness,
      tolerances.sharpnessRelative
    )
  ) {
    addFailure(
      failures,
      'sharpness',
      `Sharpness differs materially: ${serial?.sharpness} vs ${parallel?.sharpness}`
    );
  }
}

/*
 * ---------------------------------------------------------
 * Exposure validation
 * ---------------------------------------------------------
 */

function validateExposure(
  serial,
  parallel,
  failures
) {
  const a = serial?.exposure;
  const b = parallel?.exposure;

  if (!a || !b) {
    addFailure(
      failures,
      'exposure',
      'Exposure result is missing from one execution.'
    );

    return;
  }

  if (String(a.classification) !== String(b.classification)) {
    addFailure(
      failures,
      'exposure',
      `Exposure classification differs: ${a.classification} vs ${b.classification}`
    );
  }

  for (const field of [
    'darkPercentage',
    'brightPercentage'
  ]) {
    if (
      !approximatelyEqual(
        a[field],
        b[field],
        tolerances.percentage
      )
    ) {
      addFailure(
        failures,
        'exposure',
        `Exposure ${field} differs.`
      );
    }
  }
}

/*
 * ---------------------------------------------------------
 * Spatial validation
 * ---------------------------------------------------------
 */

function validateSpatial(
  serial,
  parallel,
  failures,
  tolerances
) {
  const a = serial?.spatial;
  const b = parallel?.spatial;

  if (!a || !b) {
    addFailure(
      failures,
      'spatial',
      'Spatial analysis is missing from one execution.'
    );

    return;
  }

  for (const field of [
    'centerLuminance',
    'outerLuminance',
    'difference'
  ]) {
    if (
      !approximatelyEqual(
        a[field],
        b[field],
        tolerances.numeric
      )
    ) {
      addFailure(
        failures,
        'spatial',
        `Spatial ${field} differs.`
      );
    }
  }
}

/*
 * ---------------------------------------------------------
 * Histogram validation
 * ---------------------------------------------------------
 */

function validateHistogram(
  serial,
  parallel,
  failures
) {
  const histogramA = serial?.histogram;
  const histogramB = parallel?.histogram;

  if (!histogramA || !histogramB) {
    addFailure(
      failures,
      'histogram',
      'Histogram result is missing from one execution.'
    );

    return;
  }

  const channels = ['red', 'green', 'blue', 'luminance'];

  for (const channel of channels) {
    const a = histogramA[channel];
    const b = histogramB[channel];

    if (!Array.isArray(a) || !Array.isArray(b)) {
      addFailure(
        failures,
        'histogram',
        `Histogram channel "${channel}" is missing.`
      );

      continue;
    }

    if (a.length !== b.length) {
      addFailure(
        failures,
        'histogram',
        `Histogram channel "${channel}" length differs.`
      );

      continue;
    }

    for (let i = 0; i < a.length; i += 1) {
      if (Number(a[i]) !== Number(b[i])) {
        addFailure(
          failures,
          'histogram',
          `Histogram "${channel}" differs at bin ${i}.`
        );

        /*
         * One mismatch is enough to invalidate this channel.
         * Avoid producing hundreds of duplicate messages.
         */
        break;
      }
    }
  }
}

/*
 * ---------------------------------------------------------
 * Image information validation
 * ---------------------------------------------------------
 */

function validateImageInfo(
  serial,
  parallel,
  failures
) {
  const fields = [
    'width',
    'height',
    'processedWidth',
    'processedHeight'
  ];

  for (const field of fields) {
    if (
      Number(serial?.[field]) !==
      Number(parallel?.[field])
    ) {
      addFailure(
        failures,
        'image',
        `Image ${field} differs: ${serial?.[field]} vs ${parallel?.[field]}`
      );
    }
  }
}

/*
 * ---------------------------------------------------------
 * Main validation function
 * ---------------------------------------------------------
 */

export function validateResults(
  serialResult,
  parallelResult,
  customTolerances = {}
) {
  const tolerances = {
    ...DEFAULT_TOLERANCES,
    ...customTolerances
  };

  const failures = [];

  if (!serialResult) {
    addFailure(
      failures,
      'general',
      'Serial result is missing.'
    );
  }

  if (!parallelResult) {
    addFailure(
      failures,
      'general',
      'Parallel result is missing.'
    );
  }

  if (failures.length > 0) {
    return {
      valid: false,
      failures,
      failureCount: failures.length,
      categories: [...new Set(
        failures.map((failure) => failure.category)
      )]
    };
  }

  /*
   * The benchmark result structure is:
   *
   * result.detection
   * result.analysis
   */

  validateDetections(
    serialResult.detection,
    parallelResult.detection,
    failures,
    tolerances
  );

  validateColours(
    serialResult.analysis,
    parallelResult.analysis,
    failures,
    tolerances
  );

  validateStatistics(
    serialResult.analysis,
    parallelResult.analysis,
    failures,
    tolerances
  );

  validateEntropy(
    serialResult.analysis,
    parallelResult.analysis,
    failures,
    tolerances
  );

  validateSharpness(
    serialResult.analysis,
    parallelResult.analysis,
    failures,
    tolerances
  );

  validateExposure(
    serialResult.analysis,
    parallelResult.analysis,
    failures
  );

  validateSpatial(
    serialResult.analysis,
    parallelResult.analysis,
    failures,
    tolerances
  );

  validateHistogram(
    serialResult.analysis,
    parallelResult.analysis,
    failures
  );

  validateImageInfo(
    serialResult.analysis,
    parallelResult.analysis,
    failures
  );

  return {
    valid: failures.length === 0,
    failures,
    failureCount: failures.length,
    categories: [...new Set(
      failures.map((failure) => failure.category)
    )]
  };
}

/*
 * ---------------------------------------------------------
 * Validate every measured pair
 * ---------------------------------------------------------
 *
 * Serial and parallel measurements are validated by run
 * number:
 *
 *   Serial run 1  ↔  Parallel run 1
 *   Serial run 2  ↔  Parallel run 2
 *   Serial run 3  ↔  Parallel run 3
 *
 * This function is useful once experimentRunner has
 * completed all six measured runs.
 */

export function validateExperimentResults(
  serialRuns,
  parallelRuns,
  customTolerances = {}
) {
  const failures = [];
  const runResults = [];

  if (!Array.isArray(serialRuns)) {
    return {
      valid: false,
      failures: [
        {
          category: 'experiment',
          message: 'Serial runs are missing or invalid.'
        }
      ],
      runResults: []
    };
  }

  if (!Array.isArray(parallelRuns)) {
    return {
      valid: false,
      failures: [
        {
          category: 'experiment',
          message: 'Parallel runs are missing or invalid.'
        }
      ],
      runResults: []
    };
  }

  if (serialRuns.length !== parallelRuns.length) {
    failures.push({
      category: 'experiment',
      message:
        `Run count differs: serial=${serialRuns.length}, parallel=${parallelRuns.length}`
    });
  }

  const runCount = Math.min(
    serialRuns.length,
    parallelRuns.length
  );

  for (let i = 0; i < runCount; i += 1) {
    const result = validateResults(
      serialRuns[i],
      parallelRuns[i],
      customTolerances
    );

    runResults.push({
      run: i + 1,
      ...result
    });

    if (!result.valid) {
      for (const failure of result.failures) {
        failures.push({
          ...failure,
          run: i + 1
        });
      }
    }
  }

  return {
    valid: failures.length === 0,
    failures,
    failureCount: failures.length,
    runResults,
    categories: [...new Set(
      failures.map((failure) => failure.category)
    )]
  };
}

export {
  DEFAULT_TOLERANCES
};
