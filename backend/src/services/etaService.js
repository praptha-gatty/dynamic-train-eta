import { fetchWithRetry } from '../utils/apiClient.js';
import logger from '../utils/logger.js';
import { getISTTimeFeatures } from '../utils/timeUtils.js';

const RAILRADAR_API_KEY = process.env.RAILRADAR_API_KEY;
const RAILRADAR_BASE_URL = 'https://railradar.in/api/v1';

// Default average speed in km/h for stationary trains or missing telemetry
const DEFAULT_AVG_SPEED_KMPH = 45.0;

async function fetchLiveTrainData(trainNumber) {
  if (!RAILRADAR_API_KEY) {
    throw new Error('RAILRADAR_API_KEY not configured');
  }
  
  try {
    const response = await fetchWithRetry(`${RAILRADAR_BASE_URL}/trains/${trainNumber}/live`, {
      headers: {
        Authorization: `Bearer ${RAILRADAR_API_KEY}`
      },
      timeout: 5000,
      retries: 3
    });
    return response.data?.data;
  } catch (error) {
    logger.error(`RailRadar API error for train ${trainNumber}:`, error.message);
    if (error.response) {
      throw new Error(`API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Calculates train ETA with robust speed smoothing and non-zero division guarantees.
 */
function calculateETA(currentStation, targetStation, currentDelay, speed, distanceRemaining) {
  if (!targetStation || !currentStation) return null;
  
  const currentSeq = Number(currentStation.sequence ?? currentStation.station_sequence);
  const targetSeq = Number(targetStation.sequence ?? targetStation.station_sequence);
  
  if (isNaN(currentSeq) || isNaN(targetSeq)) return null;
  
  const sequenceDiff = targetSeq - currentSeq;
  if (sequenceDiff <= 0) return null;
  
  // Speed Smoothing: Fall back to 45 km/h default when train is stationary (speed === 0) or speed is invalid
  const numericSpeed = Number(speed);
  const effectiveSpeed = (Number.isFinite(numericSpeed) && numericSpeed > 0) ? numericSpeed : DEFAULT_AVG_SPEED_KMPH;
  
  const dist = Math.max(0, Number(distanceRemaining) || 0);
  const estimatedTravelTimeMinutes = (dist / effectiveSpeed) * 60;
  const estimatedArrival = new Date(Date.now() + estimatedTravelTimeMinutes * 60000);
  const istFeatures = getISTTimeFeatures(estimatedArrival);
  
  return {
    estimated_arrival: estimatedArrival.toISOString(),
    estimated_arrival_ist: estimatedArrival.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    estimated_delay_minutes: Math.round((Number(currentDelay) || 0) + (estimatedTravelTimeMinutes / 60)),
    distance_remaining_km: dist,
    stations_remaining: sequenceDiff,
    effective_speed_kmph: effectiveSpeed,
    confidence: (Number.isFinite(numericSpeed) && numericSpeed > 0) ? 'high' : 'medium (smoothed speed fallback)',
    time_features: istFeatures
  };
}

export async function predictETA(trainNumber, journeyDate, targetStationCode, targetStationSequence) {
  const liveData = await fetchLiveTrainData(trainNumber);
  
  if (!liveData) {
    throw new Error('No live data available for this train');
  }
  
  const route = Array.isArray(liveData.route) ? liveData.route : [];
  const currentLocation = liveData.currentLocation || {};
  
  const currentStation = route.find(s => 
    (s.stationCode && currentLocation.stationCode && String(s.stationCode).trim().toUpperCase() === String(currentLocation.stationCode).trim().toUpperCase()) ||
    (Number(s.sequence ?? s.station_sequence) === Number(currentLocation.sequence))
  );
  
  const targetStation = route.find(s => 
    (targetStationCode && s.stationCode && String(s.stationCode).trim().toUpperCase() === String(targetStationCode).trim().toUpperCase()) ||
    (targetStationSequence !== undefined && Number(s.sequence ?? s.station_sequence) === Number(targetStationSequence))
  );
  
  if (!currentStation || !targetStation) {
    throw new Error('Current or target station not found in route');
  }
  
  const currentDelay = Number(liveData.delayMinutes ?? currentLocation.delayMinutes ?? 0);
  const speed = currentLocation.speedToNextStationKmph ?? currentStation.speedToNextStationKmph;
  
  const currentDist = Number(currentLocation.distanceFromOriginKm ?? currentStation.distance ?? 0);
  const targetDist = Number(targetStation.distance ?? targetStation.distanceFromOriginKm ?? 0);
  const distanceRemaining = Math.max(0, targetDist - currentDist);
  
  const eta = calculateETA(currentStation, targetStation, currentDelay, speed, distanceRemaining);
  
  return {
    train_number: trainNumber,
    journey_date: journeyDate,
    current_station: {
      code: currentStation.stationCode,
      name: currentStation.stationName,
      sequence: currentStation.sequence ?? currentStation.station_sequence
    },
    target_station: {
      code: targetStation.stationCode,
      name: targetStation.stationName,
      sequence: targetStation.sequence ?? targetStation.station_sequence
    },
    current_delay_minutes: currentDelay,
    current_speed_kmph: Number(speed) || 0,
    ...eta
  };
}

export async function getTrainLiveData(trainNumber) {
  return fetchLiveTrainData(trainNumber);
}