/**
 * Geospatial utilities for Dynamic Train ETA.
 * Implements Haversine distance, Great-Circle bearing, Cross-track & Along-track distance,
 * and track-snapped polyline projections for train routes.
 */

export const EARTH_RADIUS_KM = 6371.0088;

/**
 * Converts degrees to radians.
 * @param {number} deg 
 * @returns {number}
 */
export function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Converts radians to degrees.
 * @param {number} rad 
 * @returns {number}
 */
export function toDegrees(rad) {
  return (rad * 180) / Math.PI;
}

/**
 * Calculates the Haversine great-circle distance between two geographic coordinates in kilometers.
 * @param {number} lat1 Latitude of point 1
 * @param {number} lon1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lon2 Longitude of point 2
 * @returns {number} Distance in kilometers
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const p1Lat = Number(lat1);
  const p1Lon = Number(lon1);
  const p2Lat = Number(lat2);
  const p2Lon = Number(lon2);

  if (
    !Number.isFinite(p1Lat) || !Number.isFinite(p1Lon) ||
    !Number.isFinite(p2Lat) || !Number.isFinite(p2Lon)
  ) {
    return 0;
  }

  // Exact same point
  if (p1Lat === p2Lat && p1Lon === p2Lon) {
    return 0;
  }

  const phi1 = toRadians(p1Lat);
  const phi2 = toRadians(p2Lat);
  const deltaPhi = toRadians(p2Lat - p1Lat);
  const deltaLambda = toRadians(p2Lon - p1Lon);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((EARTH_RADIUS_KM * c).toFixed(4));
}

/**
 * Calculates initial compass bearing from point 1 to point 2 in radians.
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Bearing in radians [0, 2*PI)
 */
export function calculateBearingRadians(lat1, lon1, lat2, lon2) {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaLambda = toRadians(lon2 - lon1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) -
            Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  return (theta + 2 * Math.PI) % (2 * Math.PI);
}

/**
 * Projects a train's GPS coordinate onto a route segment (A -> B)
 * and returns cross-track error (km) and along-track progress (0 to 1 fraction).
 * @param {{lat: number, lon: number}} point Train GPS point
 * @param {{lat: number, lon: number}} start Segment start station (A)
 * @param {{lat: number, lon: number}} end Segment end station (B)
 * @returns {{ crossTrackKm: number, alongTrackKm: number, fraction: number, segmentLengthKm: number }}
 */
export function projectPointOnSegment(point, start, end) {
  const segmentLength = calculateHaversineDistance(start.lat, start.lon, end.lat, end.lon);
  if (segmentLength <= 0.001) {
    const dist = calculateHaversineDistance(point.lat, point.lon, start.lat, start.lon);
    return { crossTrackKm: dist, alongTrackKm: 0, fraction: 0, segmentLengthKm: 0 };
  }

  const distToStart = calculateHaversineDistance(start.lat, start.lon, point.lat, point.lon);
  if (distToStart <= 0.001) {
    return { crossTrackKm: 0, alongTrackKm: 0, fraction: 0, segmentLengthKm: segmentLength };
  }

  const bearingAB = calculateBearingRadians(start.lat, start.lon, end.lat, end.lon);
  const bearingAP = calculateBearingRadians(start.lat, start.lon, point.lat, point.lon);

  const deltaAngle = bearingAP - bearingAB;
  const angularDistAP = distToStart / EARTH_RADIUS_KM;

  // Cross-track distance (perpendicular distance to track)
  const crossTrackAngular = Math.asin(Math.sin(angularDistAP) * Math.sin(deltaAngle));
  const crossTrackKm = Math.abs(crossTrackAngular * EARTH_RADIUS_KM);

  // Along-track distance from start station A
  let alongTrackKm = 0;
  const cosCross = Math.cos(crossTrackAngular);
  if (Math.abs(cosCross) > 1e-10) {
    const cosAlong = Math.cos(angularDistAP) / cosCross;
    const clampedCosAlong = Math.max(-1, Math.min(1, cosAlong));
    alongTrackKm = Math.acos(clampedCosAlong) * EARTH_RADIUS_KM;
  }

  // Check if projection is reversed (behind start)
  if (Math.cos(deltaAngle) < 0) {
    alongTrackKm = -alongTrackKm;
  }

  const fraction = Math.max(0, Math.min(1, alongTrackKm / segmentLength));

  return {
    crossTrackKm: Number(crossTrackKm.toFixed(3)),
    alongTrackKm: Number(alongTrackKm.toFixed(3)),
    fraction: Number(fraction.toFixed(4)),
    segmentLengthKm: Number(segmentLength.toFixed(3))
  };
}

/**
 * Snaps a train's GPS coordinates to an ordered polyline route of stations.
 * Computes exact remaining distance to target station, accounting for along-track progress.
 * @param {{lat: number, lon: number}} trainLocation Current GPS coordinate
 * @param {Array<{lat: number, lon: number, sequence: number, distance: number, station_code: string}>} routeStations
 * @param {string|number} targetStationIdentifier Target station code or sequence
 * @returns {{ distanceRemainingKm: number, snappedSegmentIndex: number, currentProgressFraction: number, crossTrackErrorKm: number, method: string }}
 */
export function calculateTrackSnappedDistance(trainLocation, routeStations, targetStationIdentifier) {
  if (!Array.isArray(routeStations) || routeStations.length < 2) {
    return {
      distanceRemainingKm: 0,
      snappedSegmentIndex: -1,
      currentProgressFraction: 0,
      crossTrackErrorKm: 0,
      method: 'insufficient_route_points'
    };
  }

  const targetIdx = routeStations.findIndex(s => 
    (typeof targetStationIdentifier === 'string' && s.station_code && s.station_code.toUpperCase() === targetStationIdentifier.toUpperCase()) ||
    (Number(s.sequence) === Number(targetStationIdentifier))
  );

  const effectiveTargetIdx = targetIdx !== -1 ? targetIdx : routeStations.length - 1;
  const targetStation = routeStations[effectiveTargetIdx];

  // If no GPS coordinates provided, fall back to timetable distance markers
  if (!trainLocation || !Number.isFinite(trainLocation.lat) || !Number.isFinite(trainLocation.lon)) {
    const originDist = Number(routeStations[0].distance) || 0;
    const targetDist = Number(targetStation.distance) || 0;
    return {
      distanceRemainingKm: Math.max(0, targetDist - originDist),
      snappedSegmentIndex: 0,
      currentProgressFraction: 0,
      crossTrackErrorKm: 0,
      method: 'timetable_distance_marker'
    };
  }

  // Find the closest route segment
  let minCrossTrack = Infinity;
  let bestSegmentIdx = 0;
  let bestProjection = null;

  for (let i = 0; i < effectiveTargetIdx; i++) {
    const startStn = routeStations[i];
    const endStn = routeStations[i + 1];

    if (
      !Number.isFinite(Number(startStn.lat)) || !Number.isFinite(Number(startStn.lon)) ||
      !Number.isFinite(Number(endStn.lat)) || !Number.isFinite(Number(endStn.lon))
    ) {
      continue;
    }

    const proj = projectPointOnSegment(
      { lat: Number(trainLocation.lat), lon: Number(trainLocation.lon) },
      { lat: Number(startStn.lat), lon: Number(startStn.lon) },
      { lat: Number(endStn.lat), lon: Number(endStn.lon) }
    );

    // Distance from point to segment endpoints for proximity weighting
    const distToStart = calculateHaversineDistance(trainLocation.lat, trainLocation.lon, startStn.lat, startStn.lon);
    const distToEnd = calculateHaversineDistance(trainLocation.lat, trainLocation.lon, endStn.lat, endStn.lon);
    const score = proj.crossTrackKm + Math.min(distToStart, distToEnd) * 0.1;

    if (score < minCrossTrack) {
      minCrossTrack = score;
      bestSegmentIdx = i;
      bestProjection = proj;
    }
  }

  if (!bestProjection) {
    // Fallback to direct Haversine to target
    const directDist = calculateHaversineDistance(
      trainLocation.lat, trainLocation.lon,
      targetStation.lat, targetStation.lon
    );
    return {
      distanceRemainingKm: directDist,
      snappedSegmentIndex: 0,
      currentProgressFraction: 0,
      crossTrackErrorKm: 0,
      method: 'direct_haversine_fallback'
    };
  }

  // Compute remaining distance along track:
  // 1. Distance remaining on current segment (endStn.distance - (startStn.distance + alongTrackKm))
  // 2. Sum of all intermediate segments up to target station
  const currentSegmentStart = routeStations[bestSegmentIdx];
  const currentSegmentEnd = routeStations[bestSegmentIdx + 1];

  let currentDistFromOrigin = 0;
  if (Number.isFinite(Number(currentSegmentStart.distance)) && Number.isFinite(Number(currentSegmentEnd.distance))) {
    const segmentSpan = Number(currentSegmentEnd.distance) - Number(currentSegmentStart.distance);
    currentDistFromOrigin = Number(currentSegmentStart.distance) + (bestProjection.fraction * segmentSpan);
  } else {
    currentDistFromOrigin = Number(currentSegmentStart.distance || 0) + bestProjection.alongTrackKm;
  }

  const targetDistFromOrigin = Number(targetStation.distance) || 0;
  let distanceRemaining = Math.max(0, targetDistFromOrigin - currentDistFromOrigin);

  // If distance markers were not populated, sum segment Haversine lengths
  if (distanceRemaining <= 0 && bestSegmentIdx < effectiveTargetIdx) {
    const remainingOnCurrent = bestProjection.segmentLengthKm * (1 - bestProjection.fraction);
    let subsequentSum = 0;
    for (let k = bestSegmentIdx + 1; k < effectiveTargetIdx; k++) {
      subsequentSum += calculateHaversineDistance(
        routeStations[k].lat, routeStations[k].lon,
        routeStations[k + 1].lat, routeStations[k + 1].lon
      );
    }
    distanceRemaining = remainingOnCurrent + subsequentSum;
  }

  return {
    distanceRemainingKm: Number(distanceRemaining.toFixed(2)),
    snappedSegmentIndex: bestSegmentIdx,
    currentProgressFraction: bestProjection.fraction,
    crossTrackErrorKm: bestProjection.crossTrackKm,
    method: 'track_snapped_polyline'
  };
}
