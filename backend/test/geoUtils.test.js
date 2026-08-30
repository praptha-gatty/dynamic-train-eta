import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHaversineDistance,
  calculateBearingRadians,
  projectPointOnSegment,
  calculateTrackSnappedDistance
} from '../src/utils/geoUtils.js';

describe('Geospatial Utilities (geoUtils)', () => {
  it('calculates accurate Haversine distance between known coordinates', () => {
    // New Delhi (NDLS: 28.6427, 77.2195) to Agra Cantt (AGC: 27.1585, 78.0098)
    const dist = calculateHaversineDistance(28.6427, 77.2195, 27.1585, 78.0098);
    // Great circle distance is approx ~182.5 km
    assert.ok(dist >= 180 && dist <= 185, `Distance was ${dist} km, expected ~182.5 km`);
  });

  it('returns 0 distance for identical coordinates', () => {
    const dist = calculateHaversineDistance(28.6427, 77.2195, 28.6427, 77.2195);
    assert.equal(dist, 0);
  });

  it('handles invalid / non-finite coordinates gracefully without throwing', () => {
    const dist1 = calculateHaversineDistance(null, undefined, 27.1585, 78.0098);
    const dist2 = calculateHaversineDistance('abc', 'def', 27.1585, 78.0098);
    assert.equal(dist1, 0);
    assert.equal(dist2, 0);
  });

  it('projects a point on a route segment and computes along/cross track metrics', () => {
    const start = { lat: 28.0, lon: 77.0 };
    const end = { lat: 28.0, lon: 78.0 };
    const midpoint = { lat: 28.01, lon: 77.5 }; // slightly north of segment midpoint

    const proj = projectPointOnSegment(midpoint, start, end);
    assert.ok(proj.fraction >= 0.45 && proj.fraction <= 0.55, `Fraction was ${proj.fraction}`);
    assert.ok(proj.crossTrackKm >= 1.0 && proj.crossTrackKm <= 1.2, `Cross track error was ${proj.crossTrackKm}`);
    assert.ok(proj.segmentLengthKm > 95, `Segment length was ${proj.segmentLengthKm}`);
  });

  it('computes track-snapped polyline distance along multi-station route', () => {
    const route = [
      { sequence: 1, station_code: 'INDB', lat: 22.7196, lon: 75.8577, distance: 0 },
      { sequence: 2, station_code: 'UJN', lat: 23.1765, lon: 75.7885, distance: 79 },
      { sequence: 3, station_code: 'BPL', lat: 23.2599, lon: 77.4126, distance: 263 },
      { sequence: 4, station_code: 'GWL', lat: 26.2183, lon: 78.1828, distance: 651 },
      { sequence: 5, station_code: 'NDLS', lat: 28.6427, lon: 77.2195, distance: 965 }
    ];

    // Train located near Bhopal (between Ujjain and Bhopal)
    const trainGps = { lat: 23.22, lon: 77.20 };
    const result = calculateTrackSnappedDistance(trainGps, route, 'NDLS');

    assert.equal(result.method, 'track_snapped_polyline');
    assert.ok(result.distanceRemainingKm > 650 && result.distanceRemainingKm < 750, `Distance remaining was ${result.distanceRemainingKm}`);
  });
});
