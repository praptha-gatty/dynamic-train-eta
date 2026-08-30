import { useState, useEffect, useCallback } from 'react';
import { fetchCompleteTrainData, predictETA, checkBackendHealth } from '../services/api.js';
import { getTodayDateString } from '../utils/formatters.js';
import { calculateLocalPrediction } from '../services/fallbackData.js';

export function useTrainData(initialTrainNumber = '12919') {
  const [trainNumber, setTrainNumber] = useState(initialTrainNumber);
  const [journeyDate, setJourneyDate] = useState(getTodayDateString());
  const [targetStationCode, setTargetStationCode] = useState(null);
  
  const [trainData, setTrainData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [etaLoading, setEtaLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [backendStatus, setBackendStatus] = useState({ isOnline: false, isConnected: false, isDemoMode: false, checked: false });

  // Check health on mount and keep polling periodically
  useEffect(() => {
    let mounted = true;
    const verifyHealth = async () => {
      const status = await checkBackendHealth();
      if (mounted) {
        setBackendStatus({
          isOnline: status.isOnline,
          isConnected: status.isConnected,
          isDemoMode: status.isDemoMode,
          checked: true,
          data: status.data
        });
      }
    };

    verifyHealth();
    const interval = setInterval(verifyHealth, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Main fetch function for entire train
  const loadTrain = useCallback(async (trainNum = trainNumber, date = journeyDate, targetCode = targetStationCode) => {
    if (!trainNum || !String(trainNum).trim()) {
      setError('Please enter a valid 5-digit train number.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchCompleteTrainData(trainNum, date, targetCode);
      setTrainData(data);
      if (data.isLive) {
        setBackendStatus(prev => ({ ...prev, isOnline: true, isConnected: true, isDemoMode: false, checked: true }));
      }
      if (data.target_station_code && !targetCode) {
        setTargetStationCode(data.target_station_code);
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load train:', err);
      setError(err.message || 'Unable to fetch train information. Please check the train number and try again.');
    } finally {
      setLoading(false);
    }
  }, [trainNumber, journeyDate, targetStationCode]);

  // Recalculate ETA prediction when target station changes
  const updateTargetStation = useCallback(async (newTargetCode) => {
    setTargetStationCode(newTargetCode);
    if (!trainData) return;

    setEtaLoading(true);
    try {
      // 1. Try backend predict API
      try {
        const res = await predictETA({
          trainNumber: trainData.train_number,
          journeyDate: trainData.journey_date,
          targetStationCode: newTargetCode
        });
        if (res?.data) {
          setTrainData(prev => ({
            ...prev,
            target_station_code: newTargetCode,
            prediction: res.data
          }));
          return;
        }
      } catch (e) {
        console.warn('Backend predictETA not reachable, using dynamic local prediction:', e.message);
      }

      // 2. Local dynamic prediction
      const localPred = calculateLocalPrediction(trainData, newTargetCode);
      if (localPred) {
        setTrainData(prev => ({
          ...prev,
          target_station_code: newTargetCode,
          prediction: localPred
        }));
      }
    } finally {
      setEtaLoading(false);
    }
  }, [trainData]);

  // Handle incoming live telemetry update (e.g. from WebSocket)
  const handleLiveTelemetry = useCallback((liveUpdate) => {
    if (!trainData) return;
    
    setTrainData(prev => {
      if (!prev) return null;
      const updatedStatus = {
        ...prev.current_status,
        ...(liveUpdate.currentLocation || {}),
        speed_kmph: liveUpdate.speed ?? prev.current_status.speed_kmph,
        delay_minutes: liveUpdate.delayMinutes ?? prev.current_status.delay_minutes
      };
      
      const newPrediction = calculateLocalPrediction({
        ...prev,
        current_status: updatedStatus
      }, prev.target_station_code);

      return {
        ...prev,
        captured_at: new Date().toISOString(),
        current_status: updatedStatus,
        prediction: newPrediction || prev.prediction
      };
    });
    setLastRefreshed(new Date());
  }, [trainData]);

  return {
    trainNumber,
    setTrainNumber,
    journeyDate,
    setJourneyDate,
    targetStationCode,
    updateTargetStation,
    trainData,
    loading,
    etaLoading,
    error,
    lastRefreshed,
    backendStatus,
    loadTrain,
    handleLiveTelemetry
  };
}
