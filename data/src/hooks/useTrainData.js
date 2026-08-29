import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://rwkcsfdmfhaxsaetzuzj.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_i4cahjdwkuyHW0Ir4_vvEA_cRCmZp1b';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Custom React hook to fetch train status summary and ordered station timeline.
 * Strictly filters by train_number to prevent 1,000-row REST API truncation cutoffs.
 * 
 * @param {string} trainNumber The searched/active train number
 * @param {string} [journeyDate] Optional journey date filter
 * @returns {object} { trainStatus, stationTimeline, loading, error, isNotFound }
 */
export function useTrainData(trainNumber, journeyDate) {
  const [trainStatus, setTrainStatus] = useState(null);
  const [stationTimeline, setStationTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(() => {
    const cleanTrainNo = trainNumber ? String(trainNumber).trim() : '';

    if (!cleanTrainNo) {
      setTrainStatus(null);
      setStationTimeline([]);
      setLoading(false);
      setError(null);
      setIsNotFound(false);
      return;
    }

    let isSubscribed = true;

    async function fetchTrainTelemetry() {
      setLoading(true);
      setError(null);
      setIsNotFound(false);

      try {
        // 1. Fetch current active status summary from public.train_current_status (1 row)
        let statusQuery = supabase
          .from('train_current_status')
          .select('*')
          .eq('train_number', cleanTrainNo);

        if (journeyDate) {
          statusQuery = statusQuery.eq('journey_date', journeyDate);
        }

        const { data: statusData, error: statusErr } = await statusQuery.limit(1);

        if (statusErr) {
          console.warn(`useTrainData status error for ${cleanTrainNo}:`, statusErr.message);
        }

        const currentStatus = statusData && statusData.length > 0 ? statusData[0] : null;

        // 2. Fetch complete station timeline from public.train_history strictly filtered by train_number
        let historyQuery = supabase
          .from('train_history')
          .select('*')
          .eq('train_number', cleanTrainNo);

        if (journeyDate) {
          historyQuery = historyQuery.eq('journey_date', journeyDate);
        }

        const { data: historyData, error: historyErr } = await historyQuery
          .order('next_station_sequence', { ascending: true })
          .limit(500);

        if (historyErr) {
          throw new Error(`Failed to load station history: ${historyErr.message}`);
        }

        if (!isSubscribed) return;

        if (!historyData || historyData.length === 0) {
          setIsNotFound(true);
          setTrainStatus(null);
          setStationTimeline([]);
          setError(`No telemetry records found for Train ${cleanTrainNo}.`);
        } else {
          // Sort by next_station_sequence or station_sequence ascending
          const sortedTimeline = [...historyData].sort((a, b) => {
            const seqA = a.next_station_sequence ?? a.station_sequence ?? 0;
            const seqB = b.next_station_sequence ?? b.station_sequence ?? 0;
            return seqA - seqB;
          });

          const latestRecord = sortedTimeline[sortedTimeline.length - 1] || {};

          setTrainStatus(currentStatus || {
            train_number: cleanTrainNo,
            train_name: latestRecord.train_name || `Train ${cleanTrainNo}`,
            journey_date: latestRecord.journey_date || journeyDate,
            status: latestRecord.running_status || 'running',
            last_station_code: latestRecord.station_code,
            delay_minutes: latestRecord.delay_minutes || 0,
            captured_at: latestRecord.captured_at
          });

          setStationTimeline(sortedTimeline);
          setIsNotFound(false);
        }
      } catch (err) {
        if (isSubscribed) {
          console.error(`useTrainData error for ${cleanTrainNo}:`, err.message);
          setError(err.message);
          setIsNotFound(true);
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    }

    fetchTrainTelemetry();

    return () => {
      isSubscribed = false;
    };
  }, [trainNumber, journeyDate]);

  return { trainStatus, stationTimeline, loading, error, isNotFound };
}
