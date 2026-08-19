function distance(a, b) {
  const r = a[0] - b[0];
  const g = a[1] - b[1];
  const bl = a[2] - b[2];

  return Math.sqrt(
    r * r +
    g * g +
    bl * bl
  );
}

function randomCentroids(points, k) {
  const shuffled = [...points];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [shuffled[i], shuffled[j]] =
      [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, k).map((p) => [...p]);
}

export function kMeans(points, k = 5, maxIterations = 15) {
  if (!points.length) {
    return [];
  }

  const actualK = Math.min(k, points.length);

  let centroids = randomCentroids(points, actualK);

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const clusters = Array.from(
      { length: actualK },
      () => []
    );

    for (const point of points) {
      let closest = 0;
      let minDistance = Infinity;

      for (let i = 0; i < centroids.length; i++) {
        const d = distance(point, centroids[i]);

        if (d < minDistance) {
          minDistance = d;
          closest = i;
        }
      }

      clusters[closest].push(point);
    }

    const newCentroids = centroids.map(
      (centroid, index) => {
        const cluster = clusters[index];

        if (!cluster.length) {
          return centroid;
        }

        const sum = cluster.reduce(
          (acc, point) => {
            acc[0] += point[0];
            acc[1] += point[1];
            acc[2] += point[2];

            return acc;
          },
          [0, 0, 0]
        );

        return [
          Math.round(sum[0] / cluster.length),
          Math.round(sum[1] / cluster.length),
          Math.round(sum[2] / cluster.length)
        ];
      }
    );

    const movement = centroids.reduce(
      (total, centroid, index) =>
        total +
        distance(centroid, newCentroids[index]),
      0
    );

    centroids = newCentroids;

    if (movement < 1) {
      break;
    }
  }

  return centroids
    .map(([r, g, b]) => ({
      r,
      g,
      b,
      hex:
        "#" +
        [r, g, b]
          .map((value) =>
            value.toString(16).padStart(2, "0")
          )
          .join("")
    }));
}
