import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyStationHierarchy,
  calculateDynamicDwellTime,
  calculateKinematicLoss,
  calculateDelayPropagation,
  calculateDynamicETA,
  generateDelayExplanation,
  STATION_HIERARCHY
} from '../src/services/etaEngine.js';

describe('Physics-Based ETA Calculation Engine (etaEngine)', () => {
  it('classifies station hierarchy correctly', () => {
    assert.equal(classifyStationHierarchy({ station_code: 'NDLS', station_name: 'New Delhi' }), STATION_HIERARCHY.MEGA_JUNCTION);
    assert.equal(classifyStationHierarchy({ station_code: 'GWL', station_name: 'Gwalior Junction' }), STATION_HIERARCHY.MEGA_JUNCTION);
    assert.equal(classifyStationHierarchy({ station_code: 'DWX', station_name: 'Dewas Junction' }), STATION_HIERARCHY.MAJOR_JUNCTION);
    assert.equal(classifyStationHierarchy({ station_code: 'LAR', station_name: 'Lalitpur' }), STATION_HIERARCHY.STANDARD_STATION);
    assert.equal(classifyStationHierarchy({ station_code: 'MRA', station_name: 'Morena Passenger Halt' }), STATION_HIERARCHY.FLAG_HALT);
  });

  it('calculates dynamic dwell times including delay congestion penalties', () => {
    // On-time train at Mega Junction (NDLS)
    const onTimeDwell = calculateDynamicDwellTime({ station_code: 'NDLS' }, 0);
    assert.equal(onTimeDwell.dwellMinutes, 10);
    assert.equal(onTimeDwell.hierarchy, STATION_HIERARCHY.MEGA_JUNCTION);

    // Train with 60-minute delay approaching Mega Junction (NDLS)
    const delayedDwell = calculateDynamicDwellTime({ station_code: 'NDLS' }, 60);
    assert.ok(delayedDwell.dwellMinutes > 10, `Expected congestion-penalized dwell > 10 min, got ${delayedDwell.dwellMinutes}`);

    // Standard station
    const standardDwell = calculateDynamicDwellTime({ station_code: 'LAR', station_name: 'Lalitpur' }, 0);
    assert.equal(standardDwell.dwellMinutes, 2);
  });

  it('calculates kinematic acceleration and deceleration time loss', () => {
    const loss75 = calculateKinematicLoss(75);
    assert.ok(loss75.totalKinematicLossMinutes > 0.5 && loss75.totalKinematicLossMinutes < 2.0);
    assert.ok(loss75.accelLossMinutes > 0);
    assert.ok(loss75.decelLossMinutes > 0);

    const loss110 = calculateKinematicLoss(110);
    assert.ok(loss110.totalKinematicLossMinutes > loss75.totalKinematicLossMinutes);
  });

  it('models delay propagation: cascading junction penalties vs timetable buffer recovery', () => {
    const zeroDelay = calculateDelayPropagation(0, 500, 3);
    assert.equal(zeroDelay.predictedDelayMinutes, 0);

    const cascading = calculateDelayPropagation(40, 20, 3);
    assert.ok(cascading.cascadingPenaltyMinutes > 0);
    assert.ok(cascading.predictedDelayMinutes >= 40);

    const recovered = calculateDelayPropagation(30, 600, 0);
    assert.ok(recovered.bufferRecoveryMinutes > 0);
    assert.ok(recovered.predictedDelayMinutes < 30);
  });

  it('generates structured Why Delayed root-cause explanations matching SIH 2026', () => {
    // 1. Junction congestion: High delay + Low speed
    const congestion = generateDelayExplanation({ currentDelay: 25, effectiveSpeed: 20 });
    assert.equal(congestion.root_cause, 'Junction Congestion');
    assert.equal(congestion.severity, 'high');
    assert.ok(congestion.explanation.includes('Severe junction congestion'));

    // 2. Cascading section recovery: High delay + Normal speed
    const recovery = generateDelayExplanation({ currentDelay: 25, effectiveSpeed: 70 });
    assert.equal(recovery.root_cause, 'Section Recovery');
    assert.equal(recovery.severity, 'medium');
    assert.ok(recovery.explanation.includes('recovery in progress'));

    // 3. Normal clearance: On-time / low delay
    const normal = generateDelayExplanation({ currentDelay: 2, effectiveSpeed: 80 });
    assert.equal(normal.root_cause, 'Optimal Clearance');
    assert.equal(normal.severity, 'nominal');
    assert.ok(normal.explanation.includes('Optimal track section clearance'));

    // 4. Signal hold: speed = 0, isSignalHold = true
    const signal = generateDelayExplanation({ currentDelay: 10, effectiveSpeed: 0, isSignalHold: true });
    assert.equal(signal.root_cause, 'Signal Queuing');
    assert.equal(signal.severity, 'high');
    assert.ok(signal.explanation.includes('Unscheduled outer signal hold'));
  });

  it('integrates ML inference result and sets confidence flag appropriately', () => {
    const routeStations = [
      { sequence: 1, station_code: 'INDB', distance_from_source_km: 0 },
      { sequence: 2, station_code: 'NDLS', distance_from_source_km: 965 }
    ];

    const mlResult = {
      success: true,
      predictedAddedDelay: 8.5,
      model: 'RandomForestRegressor (SIH 2026)'
    };

    const res = calculateDynamicETA({
      currentStation: routeStations[0],
      targetStation: routeStations[1],
      routeStations,
      currentDelayMinutes: 20,
      mlInferenceResult: mlResult
    });

    assert.equal(res.predicted_delay_minutes, 29); // 20 + 8.5 rounded
    assert.equal(res.confidence, 'high (Random Forest ML model)');
    assert.ok(res.delay_explanation);
  });

  it('computes full dynamic ETA for downstream target station with intermediate halts', () => {
    const routeStations = [
      { sequence: 1, station_code: 'INDB', station_name: 'Indore Jn', distance_from_source_km: 0 },
      { sequence: 2, station_code: 'UJN', station_name: 'Ujjain Jn', distance_from_source_km: 79 },
      { sequence: 3, station_code: 'BPL', station_name: 'Bhopal Jn', distance_from_source_km: 263 },
      { sequence: 4, station_code: 'BINA', station_name: 'Bina Jn', distance_from_source_km: 401 },
      { sequence: 5, station_code: 'GWL', station_name: 'Gwalior Jn', distance_from_source_km: 651 },
      { sequence: 6, station_code: 'AGC', station_name: 'Agra Cantt', distance_from_source_km: 770 },
      { sequence: 7, station_code: 'NDLS', station_name: 'New Delhi', distance_from_source_km: 965 }
    ];

    const currentStation = routeStations[1]; // UJN
    const targetStation = routeStations[6]; // NDLS
    const currentDelay = 15;
    const speedKmph = 80;
    const refTime = new Date('2026-08-30T10:00:00.000Z');

    const result = calculateDynamicETA({
      currentStation,
      targetStation,
      routeStations,
      currentSpeedKmph: speedKmph,
      currentDelayMinutes: currentDelay,
      referenceTime: refTime
    });

    assert.equal(result.distance_remaining_km, 886);
    assert.equal(result.stations_remaining, 5);
    assert.equal(result.intermediate_stops_count, 4);
    assert.ok(result.travel_time_minutes > 664);
    assert.ok(result.estimated_arrival);
    assert.ok(result.estimated_arrival_ist);
    assert.ok(result.delay_explanation);
    assert.ok(result.breakdown.intermediate_dwell_minutes > 0);
    assert.ok(result.breakdown.kinematic_loss_minutes > 0);
  });

  it('defaults targetStation to route terminus when targetStation is null or missing', () => {
    const routeStations = [
      { sequence: 1, station_code: 'INDB', station_name: 'Indore Jn', distance_from_source_km: 0 },
      { sequence: 2, station_code: 'UJN', station_name: 'Ujjain Jn', distance_from_source_km: 79 },
      { sequence: 3, station_code: 'NDLS', station_name: 'New Delhi', distance_from_source_km: 965 }
    ];

    const currentStation = routeStations[0];
    const result = calculateDynamicETA({
      currentStation,
      targetStation: null,
      routeStations
    });

    assert.ok(result);
    assert.equal(result.target_station.code, 'NDLS');
    assert.equal(result.distance_remaining_km, 965);
    assert.equal(result.stations_remaining, 2);
  });

  it('calculates remaining stations slice accurately using routeStations.slice', () => {
    const routeStations = [
      { sequence: 1, station_code: 'A', distance_from_source_km: 0 },
      { sequence: 2, station_code: 'B', distance_from_source_km: 50 },
      { sequence: 3, station_code: 'C', distance_from_source_km: 120 },
      { sequence: 4, station_code: 'D', distance_from_source_km: 200 },
      { sequence: 5, station_code: 'E', distance_from_source_km: 300 }
    ];

    const result = calculateDynamicETA({
      currentStation: routeStations[1],
      targetStation: routeStations[3],
      routeStations
    });

    assert.equal(result.stations_remaining, 2);
    assert.equal(result.intermediate_stops_count, 1);
    assert.equal(result.distance_remaining_km, 150);
  });

  it('handles zero-speed signal hold edge case with unscheduled stop penalty', () => {
    const route = [
      { sequence: 1, station_code: 'AGC', distance_from_source_km: 770 },
      { sequence: 2, station_code: 'MTJ', distance_from_source_km: 824 }
    ];

    const result = calculateDynamicETA({
      currentStation: route[0],
      targetStation: route[1],
      routeStations: route,
      currentSpeedKmph: 0,
      isHalt: false
    });

    assert.ok(result.breakdown.signal_hold_penalty_minutes > 0);
    assert.ok(result.confidence.includes('signal wait'));
  });

  it('rejects target station that is upstream of current station', () => {
    const route = [
      { sequence: 1, station_code: 'AGC', distance_from_source_km: 770 },
      { sequence: 2, station_code: 'MTJ', distance_from_source_km: 824 }
    ];

    const result = calculateDynamicETA({
      currentStation: route[1],
      targetStation: route[0],
      routeStations: route
    });

    assert.equal(result.is_reachable, false);
  });
});
