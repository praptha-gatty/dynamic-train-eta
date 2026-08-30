/**
 * High-Level ETA Service with ML Integration, Caching, and Supabase Persistence.
 * Orchestrates live API telemetry, Python Random Forest inference, and DB state.
 */

import config from '../config/env.js';
import { fetchWithRetry } from '../utils/apiClient.js';
import logger from '../utils/logger.js';
import { etaCache, LRUCache } from '../utils/cache.js';
import { calculateDynamicETA } from './etaEngine.js';
import { runMLInference } from './mlInferenceService.js';
import * as trainService from './trainService.js';

const RAILRADAR_BASE_URL = 'https://railradar.in/api/v1';

/**
 * Fetches live telemetry data from RailRadar API.
 * @param {string} trainNumber 
 * @returns {Promise<object|null>}
 */
export async function fetchLiveTrainData(trainNumber) {
  const apiKey = config.RAILRADAR_API_KEY;
  if (!apiKey) {
    logger.debug('RAILRADAR_API_KEY not configured - skipping live external API');
    return null;
  }

  try {
    const response = await fetchWithRetry(`${RAILRADAR_BASE_URL}/trains/${trainNumber}/live`, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      timeout: 4000,
      retries: 2
    });
    return response.data?.data || null;
  } catch (error) {
    logger.warn(`RailRadar API unavailable for train ${trainNumber}: ${error.message}`);
    return null;
  }
}

/**
 * Predicts dynamic ETA for a specific target station or final terminus.
 * Integrates Python Random Forest ML model and persists results to Supabase.
 * 
 * @param {string} trainNumber 
 * @param {string} [journeyDate] 
 * @param {string} [targetStationCode] 
 * @param {number} [targetStationSequence] 
 * @returns {Promise<object>}
 */
export async function predictETA(trainNumber, journeyDate, targetStationCode, targetStationSequence) {
  const cleanTrainNo = String(trainNumber).trim();
  const todayStr = new Date().toISOString().split('T')[0];
  const today = journeyDate || todayStr;
  const isFuture = Boolean(journeyDate && journeyDate > todayStr);

  // 0. Future Journey Date: Return Scheduled Timetable Projection
  if (isFuture) {
    const dbRoute = await trainService.getStationsByRoute(cleanTrainNo, today);
    const route = trainService.enrichStationsWithCoordinates(dbRoute);
    const originStation = route[0] || {};
    const terminusStation = route[route.length - 1] || {};
    const totalDist = Number(terminusStation.distance_from_source_km || terminusStation.distance || 0);

    const targetStation = targetStationCode 
      ? (route.find(s => s.station_code?.toUpperCase() === targetStationCode.toUpperCase()) || terminusStation)
      : terminusStation;

    return {
      train_number: cleanTrainNo,
      journey_date: today,
      running_status: 'YET_TO_START',
      status: 'SCHEDULED',
      progress_percent: 0,
      current_station: {
        code: originStation.station_code,
        name: originStation.station_name,
        sequence: 1,
        distance_from_source_km: 0
      },
      target_station: {
        code: targetStation.station_code,
        name: targetStation.station_name,
        sequence: targetStation.sequence,
        distance_from_source_km: targetStation.distance_from_source_km || 0
      },
      current_delay_minutes: 0,
      predicted_delay_minutes: 0,
      current_speed_kmph: 0,
      effective_speed_kmph: 0,
      distance_remaining_km: totalDist,
      stations_remaining: route.length,
      travel_time_minutes: 0,
      estimated_arrival: targetStation.scheduled_arrival || '00:00',
      scheduled_arrival: targetStation.scheduled_arrival || '00:00',
      formatted_eta: targetStation.scheduled_arrival || '--:--',
      status_message: `Scheduled to depart from ${originStation.station_name || originStation.station_code} on ${originStation.scheduled_departure || 'Scheduled Time'}`,
      is_live_telemetry: false,
      is_future_schedule: true,
      confidence: 'HIGH (Timetable Projection)',
      delay_explanation: {
        root_cause: 'Scheduled Run',
        explanation: `Train is scheduled for a future run on ${today}. Official timetable schedule active.`,
        severity: 'nominal',
        summary: 'Future schedule.'
      }
    };
  }

  // 1. Check if live data is available from RailRadar API
  let liveData = await fetchLiveTrainData(cleanTrainNo);

  let route = [];
  let currentStation = null;
  let targetStation = null;
  let currentDelay = 0;
  let currentSpeed = 0;
  let isHalt = false;
  let trainGpsLocation = null;

  if (liveData && Array.isArray(liveData.route) && liveData.route.length > 0) {
    route = liveData.route.map((s, idx) => ({
      sequence: s.sequence || idx + 1,
      station_sequence: s.sequence || idx + 1,
      station_code: s.stationCode || s.station_code,
      station_name: s.stationName || s.station_name,
      distance: Number(s.distance ?? s.distanceFromOriginKm ?? s.distance_from_source_km ?? 0),
      distance_from_origin_km: Number(s.distance ?? s.distanceFromOriginKm ?? s.distance_from_source_km ?? 0),
      distance_from_source_km: Number(s.distance ?? s.distanceFromOriginKm ?? s.distance_from_source_km ?? 0),
      scheduled_arrival: s.scheduledArrival,
      scheduled_departure: s.scheduledDeparture,
      latitude: s.latitude,
      longitude: s.longitude,
      is_halt: s.isHalt
    }));

    const loc = liveData.currentLocation || {};
    currentDelay = Number(liveData.delayMinutes ?? loc.delayMinutes ?? 0);
    currentSpeed = Number(loc.speedToNextStationKmph ?? 0);
    isHalt = Boolean(loc.isHalt);

    if (loc.latitude && loc.longitude) {
      trainGpsLocation = { lat: Number(loc.latitude), lon: Number(loc.longitude) };
    }

    currentStation = route.find(s =>
      (s.station_code && loc.stationCode && s.station_code.toUpperCase() === String(loc.stationCode).toUpperCase()) ||
      (Number(s.sequence) === Number(loc.sequence))
    ) || route[0];

    // Persist live status to Supabase DB
    trainService.upsertCurrentStatus({
      train_number: cleanTrainNo,
      journey_date: today,
      current_station_code: currentStation.station_code,
      current_station_name: currentStation.station_name,
      current_station_sequence: currentStation.sequence,
      delay_minutes: currentDelay,
      speed_kmph: currentSpeed,
      latitude: loc.latitude,
      longitude: loc.longitude,
      is_halt: isHalt,
      captured_at: new Date().toISOString()
    }).catch(err => logger.debug(`Live status persist error: ${err.message}`));

  } else {
    // 2. Fallback to Supabase Database Realtime and Route Data
    const [realtimeStatus, dbRoute] = await Promise.all([
      trainService.getCurrentStatusByTrain(cleanTrainNo, today),
      trainService.getStationsByRoute(cleanTrainNo, today)
    ]);

    if (dbRoute && dbRoute.length > 0) {
      route = dbRoute.map(s => ({
        ...s,
        distance_from_source_km: Number(s.distance_from_source_km ?? s.distance_from_origin_km ?? s.distance ?? 0)
      }));
      currentDelay = Number(realtimeStatus?.delay_minutes || 0);
      currentSpeed = Number(realtimeStatus?.speed_kmph || 0);
      isHalt = Boolean(realtimeStatus?.is_halt);

      if (realtimeStatus?.latitude && realtimeStatus?.longitude) {
        trainGpsLocation = {
          lat: Number(realtimeStatus.latitude),
          lon: Number(realtimeStatus.longitude)
        };
      }

      if (realtimeStatus?.current_station_sequence) {
        currentStation = route.find(s => Number(s.sequence) === Number(realtimeStatus.current_station_sequence));
      }

      if (!currentStation && realtimeStatus?.current_station_code) {
        currentStation = route.find(s => s.station_code === realtimeStatus.current_station_code);
      }

      if (!currentStation) {
        currentStation = route.find(s => s.is_current_location) || route[0];
      }
    }
  }

  if (!route.length || !currentStation) {
    throw new Error(`No route or telemetry available for train ${cleanTrainNo}`);
  }

  // 3. Find target station or default to final terminus station
  if (targetStationCode) {
    const code = String(targetStationCode).trim().toUpperCase();
    targetStation = route.find(s => s.station_code && s.station_code.toUpperCase() === code);
  } else if (targetStationSequence !== undefined) {
    targetStation = route.find(s => Number(s.sequence) === Number(targetStationSequence));
  }

  if (!targetStation) {
    targetStation = route[route.length - 1];
  }

  // 4. In-Memory Cache Lookup
  const cacheKey = LRUCache.generateETAKey(
    cleanTrainNo,
    today,
    targetStation.station_code || targetStation.sequence,
    currentStation.station_code || currentStation.sequence,
    currentSpeed,
    currentDelay
  );

  const cachedETA = etaCache.get(cacheKey);
  if (cachedETA) {
    logger.debug(`Cache hit for ${cacheKey}`);
    return {
      ...cachedETA,
      cached: true
    };
  }

  // 5. ML Pipeline: Derive Feature Schema and run Random Forest Inference
  const now = new Date();
  const currentDist = Number(currentStation.distance_from_source_km ?? currentStation.distance ?? 0);
  const targetDist = Number(targetStation.distance_from_source_km ?? targetStation.distance ?? 0);
  const distRem = Math.max(0, targetDist - currentDist);

  const mlFeatureSchema = {
    current_delay: currentDelay,
    effective_speed: currentSpeed > 0 ? currentSpeed : 45.0,
    station_sequence: Number(currentStation.sequence || 1),
    distance_from_origin_km: currentDist,
    distance_remaining_km: distRem,
    hour_of_day: now.getHours(),
    day_of_week: now.getDay(),
    is_weekend: (now.getDay() === 0 || now.getDay() === 6) ? 1 : 0
  };

  const mlInferenceResult = await runMLInference(mlFeatureSchema);

  // 6. Compute Dynamic ETA using Physics-based Kinematic Engine + ML integration
  const etaResult = calculateDynamicETA({
    currentStation,
    targetStation,
    routeStations: route,
    currentSpeedKmph: currentSpeed,
    currentDelayMinutes: currentDelay,
    trainGpsLocation,
    isHalt,
    mlInferenceResult
  });

  const responsePayload = {
    train_number: cleanTrainNo,
    journey_date: today,
    is_live_telemetry: Boolean(liveData),
    cached: false,
    ...etaResult
  };

  // 7. Supabase DB Persistence for Historical Analytics
  trainService.upsertPrediction(responsePayload).catch(err => {
    logger.debug(`Supabase prediction upsert note: ${err.message}`);
  });

  // Cache computation in LRU
  etaCache.set(cacheKey, responsePayload, config.CACHE_TTL_MS);

  return responsePayload;
}

/**
 * Predicts dynamic ETA for ALL downstream stations along the route.
 * @param {string} trainNumber 
 * @param {string} [journeyDate] 
 * @returns {Promise<object>}
 */
export async function predictRouteETA(trainNumber, journeyDate) {
  const cleanTrainNo = String(trainNumber).trim();
  const today = journeyDate || new Date().toISOString().split('T')[0];

  let liveData = await fetchLiveTrainData(cleanTrainNo);
  let route = [];
  let currentStation = null;
  let currentDelay = 0;
  let currentSpeed = 0;
  let isHalt = false;
  let trainGpsLocation = null;

  if (liveData && Array.isArray(liveData.route) && liveData.route.length > 0) {
    route = liveData.route.map((s, idx) => ({
      sequence: s.sequence || idx + 1,
      station_sequence: s.sequence || idx + 1,
      station_code: s.stationCode || s.station_code,
      station_name: s.stationName || s.station_name,
      distance: Number(s.distance ?? s.distanceFromOriginKm ?? s.distance_from_source_km ?? 0),
      distance_from_origin_km: Number(s.distance ?? s.distanceFromOriginKm ?? s.distance_from_source_km ?? 0),
      distance_from_source_km: Number(s.distance ?? s.distanceFromOriginKm ?? s.distance_from_source_km ?? 0),
      scheduled_arrival: s.scheduledArrival,
      scheduled_departure: s.scheduledDeparture,
      latitude: s.latitude,
      longitude: s.longitude,
      is_halt: s.isHalt
    }));

    const loc = liveData.currentLocation || {};
    currentDelay = Number(liveData.delayMinutes ?? loc.delayMinutes ?? 0);
    currentSpeed = Number(loc.speedToNextStationKmph ?? 0);
    isHalt = Boolean(loc.isHalt);

    if (loc.latitude && loc.longitude) {
      trainGpsLocation = { lat: Number(loc.latitude), lon: Number(loc.longitude) };
    }

    currentStation = route.find(s =>
      (s.station_code && loc.stationCode && s.station_code.toUpperCase() === String(loc.stationCode).toUpperCase()) ||
      (Number(s.sequence) === Number(loc.sequence))
    ) || route[0];
  } else {
    const [realtimeStatus, dbRoute] = await Promise.all([
      trainService.getCurrentStatusByTrain(cleanTrainNo, today),
      trainService.getStationsByRoute(cleanTrainNo, today)
    ]);

    if (dbRoute && dbRoute.length > 0) {
      route = dbRoute.map(s => ({
        ...s,
        distance_from_source_km: Number(s.distance_from_source_km ?? s.distance_from_origin_km ?? s.distance ?? 0)
      }));
      currentDelay = Number(realtimeStatus?.delay_minutes || 0);
      currentSpeed = Number(realtimeStatus?.speed_kmph || 0);
      isHalt = Boolean(realtimeStatus?.is_halt);

      if (realtimeStatus?.latitude && realtimeStatus?.longitude) {
        trainGpsLocation = {
          lat: Number(realtimeStatus.latitude),
          lon: Number(realtimeStatus.longitude)
        };
      }

      if (realtimeStatus?.current_station_sequence) {
        currentStation = route.find(s => Number(s.sequence) === Number(realtimeStatus.current_station_sequence));
      }
      if (!currentStation) {
        currentStation = route.find(s => s.is_current_location) || route[0];
      }
    }
  }

  if (!route.length || !currentStation) {
    throw new Error(`No route found for train ${cleanTrainNo}`);
  }

  const currentSeq = Number(currentStation.sequence ?? currentStation.station_sequence);
  const downstreamStations = route.filter(s => Number(s.sequence ?? s.station_sequence) > currentSeq);

  const downstreamPredictions = downstreamStations.map(targetStation => {
    return calculateDynamicETA({
      currentStation,
      targetStation,
      routeStations: route,
      currentSpeedKmph: currentSpeed,
      currentDelayMinutes: currentDelay,
      trainGpsLocation,
      isHalt
    });
  });

  return {
    train_number: cleanTrainNo,
    journey_date: today,
    current_location: {
      station_code: currentStation.station_code,
      station_name: currentStation.station_name,
      sequence: currentSeq,
      current_delay_minutes: currentDelay,
      current_speed_kmph: currentSpeed,
      is_halt: isHalt
    },
    total_downstream_stations: downstreamPredictions.length,
    predictions: downstreamPredictions
  };
}

export async function getTrainLiveData(trainNumber, targetStationCode = null) {
  const liveData = await fetchLiveTrainData(trainNumber);
  if (liveData && targetStationCode && Array.isArray(liveData.route)) {
    const target = liveData.route.find(s => (s.stationCode || s.station_code)?.toUpperCase() === targetStationCode.toUpperCase());
    return {
      ...liveData,
      selected_target_station: target || null
    };
  }
  return liveData;
}