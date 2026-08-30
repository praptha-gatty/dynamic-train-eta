/**
 * Geospatial Spline & Railway Trajectory Utilities.
 * Implements Catmull-Rom spline interpolation and geographic bearing calculations.
 */

/**
 * Calculates the forward azimuth/bearing (in degrees 0-360) from coordinate A to coordinate B.
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Bearing in degrees
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
    return 0;
  }

  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  return (toDeg(θ) + 360) % 360;
}

/**
 * Catmull-Rom cubic interpolation between four 2D points with tension parameter.
 */
function catmullRomPoint(p0, p1, p2, p3, t, alpha = 0.5) {
  // Centripetal / Uniform Catmull-Rom
  const t2 = t * t;
  const t3 = t2 * t;

  const lat = 0.5 * (
    (2 * p1[0]) +
    (-p0[0] + p2[0]) * t +
    (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
    (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3
  );

  const lon = 0.5 * (
    (2 * p1[1]) +
    (-p0[1] + p2[1]) * t +
    (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
    (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3
  );

  return [lat, lon];
}

/**
 * Generates a smooth curved railway trajectory through a set of [lat, lon] waypoints.
 * Eliminates harsh jagged chords while strictly passing through all actual milestone points.
 * 
 * @param {Array<[number, number]>} points Array of [lat, lon] coordinates
 * @param {number} subdivisions Number of smooth sub-segments per inter-station link (default 8)
 * @returns {Array<[number, number]>} Smoothed track polyline
 */
export function generateCurvedRailwayPath(points, subdivisions = 8) {
  if (!Array.isArray(points) || points.length < 2) {
    return points || [];
  }

  if (points.length === 2) {
    // Generate slight subtle curvature for 2-point routes
    const p1 = points[0];
    const p2 = points[1];
    const midLat = (p1[0] + p2[0]) / 2;
    const midLon = (p1[1] + p2[1]) / 2;
    const offsetLat = (p2[1] - p1[1]) * 0.05;
    const offsetLon = -(p2[0] - p1[0]) * 0.05;
    const controlPoint = [midLat + offsetLat, midLon + offsetLon];
    
    const result = [];
    for (let i = 0; i <= subdivisions; i++) {
      const t = i / subdivisions;
      const lat = (1 - t) * (1 - t) * p1[0] + 2 * (1 - t) * t * controlPoint[0] + t * t * p2[0];
      const lon = (1 - t) * (1 - t) * p1[1] + 2 * (1 - t) * t * controlPoint[1] + t * t * p2[1];
      result.push([lat, lon]);
    }
    return result;
  }

  const smoothed = [];
  const n = points.length;

  for (let i = 0; i < n - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < n - 2 ? points[i + 2] : points[i + 1];

    for (let step = 0; step < subdivisions; step++) {
      const t = step / subdivisions;
      smoothed.push(catmullRomPoint(p0, p1, p2, p3, t));
    }
  }

  // Include the exact final destination point
  smoothed.push(points[n - 1]);

  return smoothed;
}
