/**
 * High-Precision Physics & Machine Learning ETA Calculation Engine (SIH 2026).
 * 
 * Implements:
 * 1. Random Forest ML model inference bridge (Node.js <-> Python) with kinematic fallback
 * 2. "Why Delayed?" root-cause explanation generator based on telemetry heuristics
 * 3. Dynamic dwell time estimation based on station hierarchy & platform congestion
 * 4. Cascading delay propagation and timetable buffer recovery modeling
 * 5. Track-snapped geospatial progress and signal hold detection
 * 6. Slice-based remaining stations count and source distance delta
 */

import { calculateHaversineDistance, calculateTrackSnappedDistance } from '../utils/geoUtils.js';
import { getISTTimeFeatures, formatToIST, parseDateTime } from '../utils/timeUtils.js';
import { runMLInference } from './mlInferenceService.js';

// Station Category Classifications
export const STATION_HIERARCHY = {
  TERMINUS: 'TERMINUS',
  MEGA_JUNCTION: 'MEGA_JUNCTION',
  MAJOR_JUNCTION: 'MAJOR_JUNCTION',
  STANDARD_STATION: 'STANDARD_STATION',
  FLAG_HALT: 'FLAG_HALT'
};

// Known Major Junction and Terminal Codes in Indian Railways
const KNOWN_MEGA_JUNCTIONS = new Set([
  'NDLS', 'HWH', 'CSMT', 'MAS', 'SBC', 'BPL', 'AGC', 'GWL', 'BINA',
  'VGLB', 'KOTA', 'UMB', 'LDH', 'BRC', 'ST', 'RTM', 'CNB', 'PNBE',
  'DLI', 'NZM', 'ANVT', 'PUNE', 'ADI', 'LKO', 'BSB', 'GKP', 'MGS',
  'DDU', 'JAT', 'SVDK', 'ASR', 'INDB', 'UJN', 'JP', 'NGP', 'BZA'
]);

// Kinematic Acceleration & Deceleration Constants (in m/s^2)
const ACCELERATION_RATE = 0.45; // ~0.45 m/s^2 for broad gauge electric locomotives
const DECELERATION_RATE = 0.65; // ~0.65 m/s^2 service braking deceleration

// Default cruising speeds by train category
const DEFAULT_CRUISING_SPEED_KMPH = 75.0;
const MIN_CRUISING_SPEED_KMPH = 25.0;
const MAX_CRUISING_SPEED_KMPH = 130.0;

/**
 * Classifies a station into hierarchy tier based on code, name, and timetable stop duration.
 * @param {object} station 
 * @returns {string} Hierarchy tier
 */
export function classifyStationHierarchy(station) {
  if (!station) return STATION_HIERARCHY.STANDARD_STATION;

  const code = String(station.station_code || station.stationCode || '').trim().toUpperCase();
  const name = String(station.station_name || station.stationName || '').trim().toUpperCase();

  if (KNOWN_MEGA_JUNCTIONS.has(code)) {
    return STATION_HIERARCHY.MEGA_JUNCTION;
  }

  if (name.includes('TERMINUS') || name.includes('CENTRAL')) {
    return STATION_HIERARCHY.TERMINUS;
  }

  if (name.includes('JUNCTION') || name.includes('JN') || name.includes('CANTT')) {
    return STATION_HIERARCHY.MAJOR_JUNCTION;
  }

  if (name.includes('HALT') || name.includes('PH') || station.is_halt === false) {
    return STATION_HIERARCHY.FLAG_HALT;
  }

  return STATION_HIERARCHY.STANDARD_STATION;
}

/**
 * Computes dynamic dwell time in minutes for a station halt,
 * factoring station hierarchy, scheduled timetable buffer, and congestion multipliers.
 * @param {object} station 
 * @param {number} currentDelayMinutes 
 * @returns {{ dwellMinutes: number, hierarchy: string, scheduledDwellMinutes: number }}
 */
export function calculateDynamicDwellTime(station, currentDelayMinutes = 0) {
  const hierarchy = classifyStationHierarchy(station);

  const baseDwellByTier = {
    [STATION_HIERARCHY.TERMINUS]: 15,
    [STATION_HIERARCHY.MEGA_JUNCTION]: 10,
    [STATION_HIERARCHY.MAJOR_JUNCTION]: 5,
    [STATION_HIERARCHY.STANDARD_STATION]: 2,
    [STATION_HIERARCHY.FLAG_HALT]: 1
  };

  let baseDwell = baseDwellByTier[hierarchy] || 2;

  let scheduledDwell = baseDwell;
  if (station.scheduled_arrival && station.scheduled_departure) {
    const arr = parseDateTime(station.scheduled_arrival);
    const dep = parseDateTime(station.scheduled_departure);
    if (arr && dep) {
      let diff = Math.round((dep.getTime() - arr.getTime()) / 60000);
      if (diff < 0) diff += 1440;
      if (diff > 0 && diff < 120) {
        scheduledDwell = diff;
      }
    }
  }

  const effectiveBase = Math.max(baseDwell, scheduledDwell);

  let congestionMultiplier = 1.0;
  if (currentDelayMinutes > 20 && (hierarchy === STATION_HIERARCHY.MEGA_JUNCTION || hierarchy === STATION_HIERARCHY.TERMINUS)) {
    congestionMultiplier = 1.0 + Math.min(0.35, (currentDelayMinutes / 120) * 0.35);
  }

  const dynamicDwell = Number((effectiveBase * congestionMultiplier).toFixed(2));

  return {
    dwellMinutes: dynamicDwell,
    hierarchy,
    scheduledDwellMinutes: scheduledDwell
  };
}

/**
 * Calculates kinematic time loss in minutes for acceleration and deceleration at a station halt.
 * @param {number} cruisingSpeedKmph Train cruising speed in km/h
 * @returns {{ accelLossMinutes: number, decelLossMinutes: number, totalKinematicLossMinutes: number }}
 */
export function calculateKinematicLoss(cruisingSpeedKmph) {
  const vCruising = Math.max(10, Math.min(130, Number(cruisingSpeedKmph) || DEFAULT_CRUISING_SPEED_KMPH)) / 3.6;

  const decelLossSec = vCruising / (2 * DECELERATION_RATE);
  const accelLossSec = vCruising / (2 * ACCELERATION_RATE);

  const decelLossMinutes = decelLossSec / 60;
  const accelLossMinutes = accelLossSec / 60;
  const totalKinematicLossMinutes = (decelLossSec + accelLossSec) / 60;

  return {
    accelLossMinutes: Number(accelLossMinutes.toFixed(2)),
    decelLossMinutes: Number(decelLossMinutes.toFixed(2)),
    totalKinematicLossMinutes: Number(totalKinematicLossMinutes.toFixed(2))
  };
}

/**
 * Generates structured "Why Delayed?" root-cause explanation based on telemetry factors.
 * @param {object} params
 * @returns {{ root_cause: string, explanation: string, severity: string, summary: string }}
 */
export function generateDelayExplanation({
  currentDelay = 0,
  effectiveSpeed = DEFAULT_CRUISING_SPEED_KMPH,
  isHalt = false,
  isSignalHold = false,
  intermediateJunctionCount = 0
}) {
  const delay = Math.max(0, Number(currentDelay) || 0);
  const speed = Number(effectiveSpeed) || 0;

  if (isSignalHold) {
    return {
      root_cause: 'Signal Queuing',
      explanation: 'Unscheduled outer signal hold awaiting platform clearance.',
      severity: 'high',
      summary: `Train stopped on section (0 km/h) awaiting signal clearance. Penalty +8 min added.`
    };
  }

  if (delay >= 20 && speed < 35) {
    return {
      root_cause: 'Junction Congestion',
      explanation: 'Severe junction congestion and signal queuing ahead.',
      severity: 'high',
      summary: `Heavy delay (${Math.round(delay)} mins) combined with low velocity (${Math.round(speed)} km/h) indicates junction bottleneck.`
    };
  }

  if (delay >= 15 && speed >= 50) {
    return {
      root_cause: 'Section Recovery',
      explanation: 'Cascading delay recovery in progress across intermediate section.',
      severity: 'medium',
      summary: `Train maintaining healthy section speed (${Math.round(speed)} km/h), recovering timetable buffer slack.`
    };
  }

  if (delay >= 5 && delay < 20) {
    return {
      root_cause: 'Speed Restriction',
      explanation: 'Speed restriction or approach caution block.',
      severity: 'low',
      summary: `Moderate delay (${Math.round(delay)} mins) with caution orders in effect along the block section.`
    };
  }

  return {
    root_cause: 'Optimal Clearance',
    explanation: 'Optimal track section clearance.',
    severity: 'nominal',
    summary: 'Train operating with nominal headway and track clearance.'
  };
}

/**
 * Calculates cascading delay propagation and timetable buffer recovery.
 * @param {number} currentDelayMinutes Current delay in minutes
 * @param {number} distanceRemainingKm Total track distance remaining
 * @param {number} intermediateJunctionCount Number of major junctions ahead
 * @returns {{ predictedDelayMinutes: number, cascadingPenaltyMinutes: number, bufferRecoveryMinutes: number }}
 */
export function calculateDelayPropagation(currentDelayMinutes, distanceRemainingKm, intermediateJunctionCount = 0) {
  const delay = Math.max(0, Number(currentDelayMinutes) || 0);
  const dist = Math.max(0, Number(distanceRemainingKm) || 0);

  if (delay === 0) {
    return {
      predictedDelayMinutes: 0,
      cascadingPenaltyMinutes: 0,
      bufferRecoveryMinutes: 0
    };
  }

  let cascadingPenalty = 0;
  if (delay >= 15 && intermediateJunctionCount > 0) {
    cascadingPenalty = Math.min(45, delay * 0.04 * intermediateJunctionCount);
  }

  const maxPossibleRecovery = Math.min(delay * 0.4, (dist / 100) * 2.5);
  const bufferRecovery = Number(maxPossibleRecovery.toFixed(1));

  const netPredictedDelay = Math.max(0, Math.round(delay + cascadingPenalty - bufferRecovery));

  return {
    predictedDelayMinutes: netPredictedDelay,
    cascadingPenaltyMinutes: Number(cascadingPenalty.toFixed(1)),
    bufferRecoveryMinutes: bufferRecovery
  };
}

/**
 * Main Dynamic ETA calculation function.
 * Computes physics-informed arrival times, evaluates ML models, and generates root cause explanations.
 * 
 * @param {object} params
 * @param {object} params.currentStation Snapshot or location of current position
 * @param {object} [params.targetStation] Destination/future target station (defaults to final terminus if null/missing)
 * @param {Array<object>} [params.routeStations=[]] Complete ordered array of route stations
 * @param {number} [params.currentSpeedKmph] Instantaneous GPS or telemetry speed
 * @param {number} [params.currentDelayMinutes=0] Current recorded delay
 * @param {{lat: number, lon: number}} [params.trainGpsLocation] Live GPS coordinates
 * @param {boolean} [params.isHalt=false] Whether train is currently stopped at a platform
 * @param {string|Date} [params.referenceTime=new Date()] Reference baseline timestamp
 * @param {object} [params.mlInferenceResult] Optional precomputed ML result
 * @returns {object} Detailed ETA prediction result
 */
export function calculateDynamicETA({
  currentStation,
  targetStation = null,
  routeStations = [],
  currentSpeedKmph = null,
  currentDelayMinutes = 0,
  trainGpsLocation = null,
  isHalt = false,
  referenceTime = new Date(),
  mlInferenceResult = null
}) {
  const baseTime = parseDateTime(referenceTime) || new Date();
  const currentDelay = Number(currentDelayMinutes) || 0;

  if (!currentStation) {
    return null;
  }

  // 1. Default targetStation to the route's final terminus station if missing or null
  let effectiveTargetStation = targetStation;
  if (!effectiveTargetStation && Array.isArray(routeStations) && routeStations.length > 0) {
    effectiveTargetStation = routeStations[routeStations.length - 1];
  }

  if (!effectiveTargetStation) {
    return null;
  }

  // Find station indices in routeStations
  let currentStationIndex = -1;
  let targetStationIndex = -1;

  if (Array.isArray(routeStations) && routeStations.length > 0) {
    currentStationIndex = routeStations.findIndex(s =>
      (s.station_code && currentStation.station_code && String(s.station_code).trim().toUpperCase() === String(currentStation.station_code).trim().toUpperCase()) ||
      (s.stationCode && currentStation.stationCode && String(s.stationCode).trim().toUpperCase() === String(currentStation.stationCode).trim().toUpperCase()) ||
      (Number(s.sequence ?? s.station_sequence) === Number(currentStation.sequence ?? currentStation.station_sequence))
    );

    targetStationIndex = routeStations.findIndex(s =>
      (s.station_code && effectiveTargetStation.station_code && String(s.station_code).trim().toUpperCase() === String(effectiveTargetStation.station_code).trim().toUpperCase()) ||
      (s.stationCode && effectiveTargetStation.stationCode && String(s.stationCode).trim().toUpperCase() === String(effectiveTargetStation.stationCode).trim().toUpperCase()) ||
      (Number(s.sequence ?? s.station_sequence) === Number(effectiveTargetStation.sequence ?? effectiveTargetStation.station_sequence))
    );
  }

  const currentSeq = Number(currentStation.sequence ?? currentStation.station_sequence ?? (currentStationIndex + 1));
  const targetSeq = Number(effectiveTargetStation.sequence ?? effectiveTargetStation.station_sequence ?? (targetStationIndex + 1));

  if (targetStationIndex !== -1 && currentStationIndex !== -1) {
    if (targetStationIndex <= currentStationIndex) {
      return {
        error: 'Target station must be downstream of current location',
        is_reachable: false,
        distance_remaining_km: 0,
        stations_remaining: 0
      };
    }
  } else if (targetSeq <= currentSeq) {
    return {
      error: 'Target station must be downstream of current location',
      is_reachable: false,
      distance_remaining_km: 0,
      stations_remaining: 0
    };
  }

  // 2. Ensure remaining stations are calculated using routeStations.slice(currentStationIndex + 1, targetStationIndex + 1).length
  let stationsRemaining = 0;
  let intermediateStations = [];

  if (currentStationIndex !== -1 && targetStationIndex !== -1 && Array.isArray(routeStations)) {
    const remainingStationsSlice = routeStations.slice(currentStationIndex + 1, targetStationIndex + 1);
    stationsRemaining = remainingStationsSlice.length;
    intermediateStations = routeStations.slice(currentStationIndex + 1, targetStationIndex);
  } else if (Array.isArray(routeStations) && routeStations.length > 0) {
    intermediateStations = routeStations.filter(s => {
      const seq = Number(s.sequence ?? s.station_sequence ?? 0);
      return seq > currentSeq && seq < targetSeq;
    });
    stationsRemaining = Math.max(0, targetSeq - currentSeq);
  } else {
    stationsRemaining = Math.max(0, targetSeq - currentSeq);
  }

  // 3. Calculate remaining distance as targetStation.distance_from_source_km - currentStation.distance_from_source_km
  const currentDistSource = Number(
    currentStation.distance_from_source_km ??
    currentStation.distance_from_origin_km ??
    currentStation.distance ??
    0
  );

  const targetDistSource = Number(
    effectiveTargetStation.distance_from_source_km ??
    effectiveTargetStation.distance_from_origin_km ??
    effectiveTargetStation.distance ??
    0
  );

  let distanceRemainingKm = Math.max(0, targetDistSource - currentDistSource);
  let distanceMethod = 'station_source_distance_delta';

  if (trainGpsLocation && Number.isFinite(trainGpsLocation.lat) && Number.isFinite(trainGpsLocation.lon) && routeStations.length >= 2) {
    const snapped = calculateTrackSnappedDistance(
      trainGpsLocation,
      routeStations.map(s => ({
        lat: Number(s.latitude || s.lat),
        lon: Number(s.longitude || s.lon),
        sequence: Number(s.sequence ?? s.station_sequence),
        distance: Number(s.distance_from_source_km ?? s.distance_from_origin_km ?? s.distance),
        station_code: s.station_code || s.stationCode
      })),
      effectiveTargetStation.station_code || effectiveTargetStation.stationCode || targetSeq
    );
    distanceRemainingKm = snapped.distanceRemainingKm;
    distanceMethod = snapped.method;
  }

  // 4. Effective Speed Smoothing & Signal Hold Detection
  const rawSpeed = Number(currentSpeedKmph);
  let effectiveSpeed = DEFAULT_CRUISING_SPEED_KMPH;
  let isSignalHold = false;
  let signalHoldPenaltyMinutes = 0;

  if (Number.isFinite(rawSpeed) && rawSpeed > 0) {
    effectiveSpeed = Math.max(MIN_CRUISING_SPEED_KMPH, Math.min(MAX_CRUISING_SPEED_KMPH, rawSpeed));
  } else {
    if (isHalt) {
      effectiveSpeed = DEFAULT_CRUISING_SPEED_KMPH;
    } else {
      isSignalHold = true;
      signalHoldPenaltyMinutes = 8;
      effectiveSpeed = DEFAULT_CRUISING_SPEED_KMPH;
    }
  }

  // 5. Cruising Travel Time (hours to minutes)
  const pureCruisingTimeMinutes = (distanceRemainingKm / effectiveSpeed) * 60;

  // 6. Intermediate Dwell Time & Kinematics Calculation
  let totalIntermediateDwellMinutes = 0;
  let totalKinematicLossMinutes = 0;
  let intermediateJunctionCount = 0;

  const kinematicLossPerStop = calculateKinematicLoss(effectiveSpeed);

  for (const stn of intermediateStations) {
    const dwell = calculateDynamicDwellTime(stn, currentDelay);
    totalIntermediateDwellMinutes += dwell.dwellMinutes;
    totalKinematicLossMinutes += kinematicLossPerStop.totalKinematicLossMinutes;

    if (dwell.hierarchy === STATION_HIERARCHY.MEGA_JUNCTION || dwell.hierarchy === STATION_HIERARCHY.MAJOR_JUNCTION) {
      intermediateJunctionCount++;
    }
  }

  const targetApproachDecelMinutes = kinematicLossPerStop.decelLossMinutes;

  // 7. Cascading Delay & Buffer Slack Recovery (with ML Integration)
  let delayModel = calculateDelayPropagation(currentDelay, distanceRemainingKm, intermediateJunctionCount);
  let confidence = 'high (kinematic physics model)';

  if (mlInferenceResult && mlInferenceResult.success && Number.isFinite(mlInferenceResult.predictedAddedDelay)) {
    const netMlDelay = Math.max(0, Math.round(currentDelay + mlInferenceResult.predictedAddedDelay));
    delayModel = {
      predictedDelayMinutes: netMlDelay,
      cascadingPenaltyMinutes: Number(Math.max(0, mlInferenceResult.predictedAddedDelay).toFixed(1)),
      bufferRecoveryMinutes: Number(Math.max(0, -mlInferenceResult.predictedAddedDelay).toFixed(1)),
      ml_model_used: mlInferenceResult.model || 'RandomForestRegressor'
    };
    confidence = 'high (Random Forest ML model)';
  } else if (isSignalHold) {
    confidence = 'medium (active signal wait detected)';
  } else if (!Number.isFinite(rawSpeed) || rawSpeed <= 0) {
    confidence = 'medium (kinematic physics fallback)';
  } else if (distanceRemainingKm > 500) {
    confidence = 'medium (long horizon prediction)';
  }

  // 8. "Why Delayed?" Root Cause Explanation
  const delayExplanation = generateDelayExplanation({
    currentDelay,
    effectiveSpeed,
    isHalt,
    isSignalHold,
    intermediateJunctionCount
  });

  // 9. Total Transit Horizon
  const totalTravelTimeMinutes = Math.round(
    pureCruisingTimeMinutes +
    totalIntermediateDwellMinutes +
    totalKinematicLossMinutes +
    targetApproachDecelMinutes +
    signalHoldPenaltyMinutes
  );

  const estimatedArrivalUtc = new Date(baseTime.getTime() + totalTravelTimeMinutes * 60000);
  const istFeatures = getISTTimeFeatures(estimatedArrivalUtc);

  return {
    train_number: currentStation.train_number || effectiveTargetStation.train_number,
    current_station: {
      code: currentStation.station_code || currentStation.stationCode,
      name: currentStation.station_name || currentStation.stationName,
      sequence: currentSeq,
      distance_from_source_km: currentDistSource,
      distance_from_origin_km: currentDistSource
    },
    target_station: {
      code: effectiveTargetStation.station_code || effectiveTargetStation.stationCode,
      name: effectiveTargetStation.station_name || effectiveTargetStation.stationName,
      sequence: targetSeq,
      distance_from_source_km: targetDistSource,
      distance_from_origin_km: targetDistSource
    },
    distance_remaining_km: Number(distanceRemainingKm.toFixed(2)),
    stations_remaining: stationsRemaining,
    intermediate_stops_count: intermediateStations.length,
    effective_speed_kmph: Number(effectiveSpeed.toFixed(1)),
    
    // Time estimates
    travel_time_minutes: totalTravelTimeMinutes,
    estimated_arrival: estimatedArrivalUtc.toISOString(),
    estimated_arrival_ist: formatToIST(estimatedArrivalUtc),
    
    // Delay estimates
    current_delay_minutes: currentDelay,
    predicted_delay_minutes: delayModel.predictedDelayMinutes,
    cascading_penalty_minutes: delayModel.cascadingPenaltyMinutes,
    buffer_recovery_minutes: delayModel.bufferRecoveryMinutes,
    
    // "Why Delayed?" Explanation (SIH 2026)
    delay_explanation: delayExplanation,
    
    // Components breakdown
    breakdown: {
      pure_cruising_minutes: Number(pureCruisingTimeMinutes.toFixed(1)),
      intermediate_dwell_minutes: Number(totalIntermediateDwellMinutes.toFixed(1)),
      kinematic_loss_minutes: Number((totalKinematicLossMinutes + targetApproachDecelMinutes).toFixed(1)),
      signal_hold_penalty_minutes: signalHoldPenaltyMinutes,
      distance_calculation_method: distanceMethod
    },
    
    confidence,
    time_features: istFeatures
  };
}
