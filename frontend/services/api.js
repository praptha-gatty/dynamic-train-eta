/**
 * API Service Layer for Dynamic Train ETA Platform.
 * Communicates with backend endpoints (/api/v1) and handles graceful fallbacks.
 */

import { FALLBACK_TRAIN_DATA, POPULAR_TRAINS, calculateLocalPrediction } from './fallbackData.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Helper to perform fetch requests with timeouts and JSON parsing
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const timeoutMs = options.timeout || 12000;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      signal: controller.signal
    });

    clearTimeout(id);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `Server responded with HTTP ${response.status}` };
      }
      throw new Error(errorData.error || errorData.message || `Request failed (${response.status})`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('API request timed out. Please check backend connection.');
    }
    throw error;
  }
}

/**
 * Check backend health status
 */
export async function checkBackendHealth() {
  try {
    const data = await apiRequest('/health', { timeout: 3000 });
    return { isOnline: true, data };
  } catch (error) {
    return { isOnline: false, error: error.message };
  }
}

/**
 * Get list of all available trains
 */
export async function getTrainsList() {
  try {
    const res = await apiRequest('/api/v1/trains');
    if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    console.warn('API getTrainsList fallback to popular trains:', err.message);
  }
  return POPULAR_TRAINS;
}

/**
 * Get real-time status for a train journey
 */
export async function getRealtimeStatus(trainNumber, journeyDate) {
  const query = journeyDate ? `?journeyDate=${encodeURIComponent(journeyDate)}` : '';
  return await apiRequest(`/api/v1/trains/realtime/${encodeURIComponent(trainNumber)}${query}`);
}

/**
 * Get historical station telemetry for a train journey
 */
export async function getTrainHistory(trainNumber, journeyDate) {
  const query = journeyDate ? `?journeyDate=${encodeURIComponent(journeyDate)}` : '';
  return await apiRequest(`/api/v1/trains/history/${encodeURIComponent(trainNumber)}${query}`);
}

/**
 * Get ordered route stations for a train journey
 */
export async function getTrainRoute(trainNumber, journeyDate) {
  const query = journeyDate ? `?journeyDate=${encodeURIComponent(journeyDate)}` : '';
  return await apiRequest(`/api/v1/trains/route/${encodeURIComponent(trainNumber)}${query}`);
}

/**
 * Predict ETA to a target station using backend dynamic prediction API
 */
export async function predictETA({ trainNumber, journeyDate, targetStationCode, targetStationSequence }) {
  const params = new URLSearchParams({
    trainNumber,
    journeyDate,
    ...(targetStationCode ? { targetStationCode } : {}),
    ...(targetStationSequence ? { targetStationSequence: String(targetStationSequence) } : {})
  });

  return await apiRequest(`/api/v1/eta/predict?${params.toString()}`);
}

/**
 * Get raw live telemetry data from RailRadar
 */
export async function getTrainLiveData(trainNumber) {
  return await apiRequest(`/api/v1/eta/live/${encodeURIComponent(trainNumber)}`);
}

/**
 * Unified high-level function to fetch all train data, route, status, and ETA prediction
 */
export async function fetchCompleteTrainData(trainNumber, journeyDate, selectedTargetStationCode = null) {
  const cleanTrainNo = String(trainNumber).trim();
  
  // 1. Try backend live API / routes first
  try {
    // Parallel requests for optimal speed
    const [liveDataRes, realtimeRes, routeRes] = await Promise.allSettled([
      getTrainLiveData(cleanTrainNo),
      getRealtimeStatus(cleanTrainNo, journeyDate),
      getTrainRoute(cleanTrainNo, journeyDate)
    ]);

    const liveData = liveDataRes.status === 'fulfilled' ? liveDataRes.value?.data : null;
    const realtime = realtimeRes.status === 'fulfilled' ? realtimeRes.value?.data : null;
    const routeData = routeRes.status === 'fulfilled' ? routeRes.value?.data : null;

    // If we have live data from backend
    if (liveData && liveData.route && Array.isArray(liveData.route)) {
      const stations = liveData.route.map((stn, idx) => ({
        sequence: stn.sequence || idx + 1,
        station_code: stn.stationCode || stn.station_code,
        station_name: stn.stationName || stn.station_name,
        distance: stn.distance || stn.distance_from_origin_km || 0,
        scheduled_arrival: stn.scheduledArrival || stn.scheduled_arrival,
        actual_arrival: stn.actualArrival || stn.actual_arrival,
        scheduled_departure: stn.scheduledDeparture || stn.scheduled_departure,
        actual_departure: stn.actualDeparture || stn.actual_departure,
        delay_minutes: stn.delayMinutes ?? stn.delay_minutes ?? null,
        status: stn.stationStatus || (stn.hasDeparted ? 'passed' : stn.isCurrent ? 'current' : 'upcoming')
      }));

      const currentLoc = liveData.currentLocation || {};
      const currentStationCode = currentLoc.stationCode || realtime?.current_station_code;
      const currentStn = stations.find(s => s.station_code === currentStationCode) || stations.find(s => s.status === 'current') || stations[0];

      // Determine default target station (last station or user chosen)
      const upcomingStations = stations.filter(s => s.sequence > (currentStn?.sequence || 0));
      const targetCode = selectedTargetStationCode || (upcomingStations.length > 0 ? upcomingStations[upcomingStations.length - 1].station_code : stations[stations.length - 1].station_code);

      // Fetch dynamic ETA prediction
      let prediction = null;
      try {
        const predRes = await predictETA({
          trainNumber: cleanTrainNo,
          journeyDate,
          targetStationCode: targetCode
        });
        prediction = predRes?.data;
      } catch (predErr) {
        console.warn('Backend predictETA fallback to local calculation:', predErr.message);
      }

      const trainPayload = {
        isLive: true,
        train_number: cleanTrainNo,
        train_name: liveData.trainName || realtime?.train_name || `Train ${cleanTrainNo}`,
        origin_code: stations[0]?.station_code || '--',
        origin_name: stations[0]?.station_name || 'Origin',
        destination_code: stations[stations.length - 1]?.station_code || '--',
        destination_name: stations[stations.length - 1]?.station_name || 'Destination',
        captured_at: liveData.updatedAt || new Date().toISOString(),
        journey_date: journeyDate,
        current_status: {
          station_code: currentStn?.station_code || '--',
          station_name: currentStn?.station_name || 'In Transit',
          station_sequence: currentStn?.sequence || 1,
          status: realtime?.status || 'IN_TRANSIT',
          delay_minutes: liveData.delayMinutes ?? currentLoc.delayMinutes ?? realtime?.delay_minutes ?? 0,
          speed_kmph: currentLoc.speedToNextStationKmph ?? realtime?.speed_kmph ?? 70,
          distance_from_origin_km: currentLoc.distanceFromOriginKm ?? currentStn?.distance ?? 0,
          distance_remaining_km: (stations[stations.length - 1]?.distance || 0) - (currentLoc.distanceFromOriginKm || currentStn?.distance || 0),
          running_status: liveData.runningStatusMessage || (currentStn ? `Near ${currentStn.station_name}` : 'In Transit')
        },
        stations,
        target_station_code: targetCode,
        prediction: prediction || calculateLocalPrediction({
          train_number: cleanTrainNo,
          journey_date: journeyDate,
          stations,
          current_status: {
            station_code: currentStn?.station_code,
            speed_kmph: currentLoc.speedToNextStationKmph || 70,
            delay_minutes: liveData.delayMinutes || 0
          }
        }, targetCode)
      };

      return trainPayload;
    }
  } catch (err) {
    console.warn(`Could not reach live backend API for train ${cleanTrainNo}:`, err.message);
  }

  // 2. Fallback to rich realistic dataset if offline or demo train
  const fallback = FALLBACK_TRAIN_DATA[cleanTrainNo] || FALLBACK_TRAIN_DATA['12919'];
  const stations = fallback.stations;
  const currentStn = fallback.current_status;
  const targetCode = selectedTargetStationCode || stations[stations.length - 1].station_code;
  
  const prediction = calculateLocalPrediction({
    ...fallback,
    train_number: cleanTrainNo,
    journey_date: journeyDate
  }, targetCode);

  return {
    ...fallback,
    isLive: false,
    train_number: cleanTrainNo,
    journey_date: journeyDate,
    target_station_code: targetCode,
    prediction
  };
}
