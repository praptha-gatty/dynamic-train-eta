import axios from 'axios';
import logger from '../utils/logger.js';

const RAILRADAR_API_KEY = process.env.RAILRADAR_API_KEY;
const RAILRADAR_BASE_URL = 'https://railradar.in/api/v1';

async function fetchLiveTrainData(trainNumber) {
  if (!RAILRADAR_API_KEY) {
    throw new Error('RAILRADAR_API_KEY not configured');
  }
  
  try {
    const response = await axios.get(`${RAILRADAR_BASE_URL}/trains/${trainNumber}/live`, {
      headers: {
        Authorization: `Bearer ${RAILRADAR_API_KEY}`
      },
      timeout: 30000
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

function calculateETA(currentStation, targetStation, currentDelay, speed, distanceRemaining) {
  if (!targetStation || !currentStation) return null;
  
  const sequenceDiff = targetStation.station_sequence - currentStation.station_sequence;
  if (sequenceDiff <= 0) return null;
  
  const avgSpeed = speed || 50;
  const estimatedTravelTime = distanceRemaining / avgSpeed * 60;
  const estimatedArrival = new Date(Date.now() + estimatedTravelTime * 60000);
  
  return {
    estimated_arrival: estimatedArrival.toISOString(),
    estimated_delay_minutes: Math.round(currentDelay + (estimatedTravelTime / 60)),
    distance_remaining_km: distanceRemaining,
    stations_remaining: sequenceDiff,
    confidence: speed ? 'high' : 'low'
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
    s.stationCode === currentLocation.stationCode ||
    s.sequence === currentLocation.sequence
  );
  
  const targetStation = route.find(s => 
    s.stationCode === targetStationCode ||
    s.sequence === targetStationSequence
  );
  
  if (!currentStation || !targetStation) {
    throw new Error('Current or target station not found in route');
  }
  
  const currentDelay = liveData.delayMinutes || currentLocation.delayMinutes || 0;
  const speed = currentLocation.speedToNextStationKmph || 50;
  const distanceRemaining = targetStation.distance - (currentLocation.distanceFromOriginKm || currentStation.distance || 0);
  
  const eta = calculateETA(currentStation, targetStation, currentDelay, speed, Math.max(0, distanceRemaining));
  
  return {
    train_number: trainNumber,
    journey_date: journeyDate,
    current_station: {
      code: currentStation.stationCode,
      name: currentStation.stationName,
      sequence: currentStation.sequence
    },
    target_station: {
      code: targetStation.stationCode,
      name: targetStation.stationName,
      sequence: targetStation.sequence
    },
    current_delay_minutes: currentDelay,
    current_speed_kmph: speed,
    ...eta
  };
}

export async function getTrainLiveData(trainNumber) {
  return fetchLiveTrainData(trainNumber);
}