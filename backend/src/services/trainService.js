/**
 * Train and Route Data Service.
 * Interfaces with Supabase database for trains, real-time status, predictions persistence, and route snapshots.
 * Ensures strict coordinate validation and non-null float returns.
 */

import { supabase, supabaseAdmin } from './supabase.js';
import { resolveCoordinates } from '../utils/stationMaster.js';
import logger from '../utils/logger.js';

// Popular catalog fallback for instant matching
const POPULAR_CATALOG = [
  { train_number: '06489', train_name: 'MAQ-SBHR EXP SPL', source_station: 'MAQ', destination_station: 'SBHR', train_type: 'Express Special' },
  { train_number: '12919', train_name: 'MALWA EXPRESS', source_station: 'INDB', destination_station: 'SVDK', train_type: 'Superfast' },
  { train_number: '12920', train_name: 'MALWA EXPRESS (Return)', source_station: 'SVDK', destination_station: 'INDB', train_type: 'Superfast' },
  { train_number: '12925', train_name: 'PASCHIM EXPRESS', source_station: 'MMCT', destination_station: 'ASR', train_type: 'Superfast' },
  { train_number: '12903', train_name: 'GOLDEN TEMPLE MAIL', source_station: 'MMCT', destination_station: 'ASR', train_type: 'Superfast Mail' },
  { train_number: '12002', train_name: 'BHOPAL SHATABDI', source_station: 'NDLS', destination_station: 'RKMP', train_type: 'Shatabdi Express' },
  { train_number: '12951', train_name: 'MUMBAI RAJDHANI', source_station: 'MMCT', destination_station: 'NDLS', train_type: 'Rajdhani Express' }
];

/**
 * Universal Global Station Coordinate Enricher.
 * Guarantees that every station in the route has valid non-null float coordinates.
 * @param {Array<object>} stations 
 * @returns {Array<object>}
 */
export function enrichStationsWithCoordinates(stations) {
  if (!Array.isArray(stations) || stations.length === 0) {
    return [];
  }

  return stations.map((stn, idx) => {
    const stationCode = stn.station_code || stn.stationCode || '';
    const coords = resolveCoordinates(stationCode, stn.latitude, stn.longitude);

    return {
      ...stn,
      sequence: Number(stn.sequence || stn.station_sequence || idx + 1),
      station_sequence: Number(stn.station_sequence || stn.sequence || idx + 1),
      station_code: stationCode,
      station_name: stn.station_name || stn.stationName || stn.current_station || stationCode || `Stop ${idx + 1}`,
      distance: Number(stn.distance ?? stn.distance_from_origin_km ?? stn.distance_from_source_km ?? stn.distanceFromOriginKm ?? 0),
      distance_from_origin_km: Number(stn.distance_from_origin_km ?? stn.distance ?? stn.distance_from_source_km ?? stn.distanceFromOriginKm ?? 0),
      distance_from_source_km: Number(stn.distance_from_source_km ?? stn.distance_from_origin_km ?? stn.distance ?? stn.distanceFromOriginKm ?? 0),
      latitude: coords.latitude,
      longitude: coords.longitude,
      is_halt: stn.is_halt !== undefined ? Boolean(stn.is_halt) : true
    };
  });
}

// ============================================================
// GET ALL TRAINS
// ============================================================
export async function getAllTrains() {
  try {
    const { data, error } = await supabase
      .from('trains')
      .select('*')
      .order('train_number');

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (error) {
    logger.warn('getAllTrains database query failed, using catalog fallback:', error.message);
  }

  return POPULAR_CATALOG;
}

// ============================================================
// SEARCH TRAINS (Case-insensitive partial substring matching)
// ============================================================
export async function searchTrains(queryString) {
  if (!queryString || !queryString.trim()) {
    return [];
  }

  const query = queryString.trim().toLowerCase();
  const resultsMap = new Map();

  try {
    const { data: dbTrains, error } = await supabase
      .from('trains')
      .select('*')
      .or(`train_number.ilike.%${query}%,train_name.ilike.%${query}%,source_station.ilike.%${query}%,destination_station.ilike.%${query}%`)
      .limit(25);

    if (!error && Array.isArray(dbTrains)) {
      for (const t of dbTrains) {
        resultsMap.set(t.train_number, t);
      }
    }
  } catch (err) {
    logger.debug(`Database trains search error: ${err.message}`);
  }

  try {
    const { data: histData } = await supabase
      .from('train_history')
      .select('train_number, train_name')
      .or(`train_number.ilike.%${query}%,train_name.ilike.%${query}%`)
      .limit(30);

    if (Array.isArray(histData)) {
      for (const item of histData) {
        if (item.train_number && !resultsMap.has(item.train_number)) {
          resultsMap.set(item.train_number, {
            train_number: item.train_number,
            train_name: item.train_name || `Train ${item.train_number}`,
            source_station: '--',
            destination_station: '--'
          });
        }
      }
    }
  } catch (err) {
    logger.debug(`History search error: ${err.message}`);
  }

  for (const item of POPULAR_CATALOG) {
    if (
      item.train_number.includes(query) ||
      item.train_name.toLowerCase().includes(query) ||
      item.source_station.toLowerCase().includes(query) ||
      item.destination_station.toLowerCase().includes(query)
    ) {
      if (!resultsMap.has(item.train_number)) {
        resultsMap.set(item.train_number, item);
      }
    }
  }

  return Array.from(resultsMap.values());
}

// ============================================================
// GET TRAIN BY TRAIN NUMBER
// ============================================================
export async function getTrainByNumber(trainNumber) {
  try {
    const { data, error } = await supabase
      .from('trains')
      .select('*')
      .eq('train_number', trainNumber)
      .maybeSingle();

    if (!error && data) {
      return data;
    }
  } catch (error) {
    logger.warn(`getTrainByNumber DB error for ${trainNumber}: ${error.message}`);
  }

  return POPULAR_CATALOG.find(t => t.train_number === trainNumber) || {
    train_number: trainNumber,
    train_name: `Train ${trainNumber}`,
    source_station: '--',
    destination_station: '--'
  };
}

// ============================================================
// UPSERT TRAIN
// ============================================================
export async function upsertTrain(trainData) {
  const { data, error } = await supabaseAdmin
    .from('trains')
    .upsert(trainData, {
      onConflict: 'train_number'
    })
    .select()
    .single();

  if (error) {
    logger.error('upsertTrain error:', error);
    throw error;
  }

  return data;
}

// ============================================================
// GET CURRENT / REALTIME STATUS
// ============================================================
export async function getCurrentStatus(filters = {}) {
  let query = supabase
    .from('train_current_status')
    .select('*', { count: 'exact' });

  if (filters.trainNumber) {
    query = query.eq('train_number', filters.trainNumber);
  }

  if (filters.journeyDate) {
    query = query.eq('journey_date', filters.journeyDate);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 50;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query
    .order('captured_at', { ascending: false, nullsFirst: false })
    .range(from, to);

  const { data, error, count } = await query;

  if (error) {
    logger.error('getCurrentStatus error:', error);
    throw error;
  }

  const normalized = (data || []).map(row => {
    const coords = resolveCoordinates(row.current_station_code, row.latitude, row.longitude);
    return {
      ...row,
      latitude: coords.latitude,
      longitude: coords.longitude
    };
  });

  return {
    data: normalized,
    count: count || 0
  };
}

// ============================================================
// GET REALTIME STATUS FOR ONE TRAIN
// ============================================================
export async function getCurrentStatusByTrain(trainNumber, journeyDate) {
  try {
    let query = supabase
      .from('train_current_status')
      .select('*')
      .eq('train_number', trainNumber);

    if (journeyDate) {
      query = query.eq('journey_date', journeyDate);
    }

    const { data, error } = await query
      .order('captured_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const coords = resolveCoordinates(data.current_station_code, data.latitude, data.longitude);
      return {
        ...data,
        latitude: coords.latitude,
        longitude: coords.longitude
      };
    }
  } catch (error) {
    logger.warn(`getCurrentStatusByTrain DB error for ${trainNumber}: ${error.message}`);
  }

  return null;
}

// ============================================================
// UPSERT CURRENT STATUS & LIVE STATUS (Supabase DB Persistence)
// ============================================================
export async function upsertCurrentStatus(statusData) {
  try {
    const { data, error } = await supabaseAdmin
      .from('train_current_status')
      .upsert(statusData, {
        onConflict: 'train_number,journey_date'
      })
      .select()
      .maybeSingle();

    if (error) {
      logger.debug(`upsertCurrentStatus error: ${error.message}`);
    }

    // Also attempt upsert to train_live_status if table exists
    try {
      await supabaseAdmin
        .from('train_live_status')
        .upsert(statusData, { onConflict: 'train_number,journey_date' });
    } catch {
      // Handled if table schema differs
    }

    return data || statusData;
  } catch (err) {
    logger.debug(`Status upsert error: ${err.message}`);
    return statusData;
  }
}

// ============================================================
// UPSERT PREDICTION (Supabase DB Persistence)
// ============================================================
export async function upsertPrediction(predictionRecord) {
  if (!predictionRecord || !predictionRecord.train_number) return null;

  try {
    const payload = {
      train_number: predictionRecord.train_number,
      journey_date: predictionRecord.journey_date || new Date().toISOString().split('T')[0],
      current_station_code: predictionRecord.current_station?.code,
      target_station_code: predictionRecord.target_station?.code,
      distance_remaining_km: predictionRecord.distance_remaining_km,
      stations_remaining: predictionRecord.stations_remaining,
      effective_speed_kmph: predictionRecord.effective_speed_kmph,
      travel_time_minutes: predictionRecord.travel_time_minutes,
      estimated_arrival: predictionRecord.estimated_arrival,
      current_delay_minutes: predictionRecord.current_delay_minutes,
      predicted_delay_minutes: predictionRecord.predicted_delay_minutes,
      delay_explanation: JSON.stringify(predictionRecord.delay_explanation || {}),
      confidence: predictionRecord.confidence,
      captured_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('predictions')
      .upsert(payload, {
        onConflict: 'train_number,journey_date,target_station_code'
      })
      .select()
      .maybeSingle();

    if (error) {
      logger.debug(`upsertPrediction table error: ${error.message}`);
    }
    return data || payload;
  } catch (err) {
    logger.debug(`upsertPrediction catch: ${err.message}`);
    return null;
  }
}

// ============================================================
// GET TRAIN HISTORY
// ============================================================
export async function getTrainHistory(filters = {}) {
  let query = supabase
    .from('train_history')
    .select('*', { count: 'exact' });

  if (filters.trainNumber) {
    query = query.eq('train_number', filters.trainNumber);
  }

  if (filters.journeyDate) {
    query = query.eq('journey_date', filters.journeyDate);
  }

  if (filters.stationCode) {
    query = query.eq('station_code', filters.stationCode);
  }

  if (filters.startDate) {
    query = query.gte('journey_date', filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte('journey_date', filters.endDate);
  }

  if (filters.isCurrentLocation !== undefined && filters.isCurrentLocation !== null) {
    query = query.eq('is_current_location', filters.isCurrentLocation);
  }

  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 50;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query
    .order('captured_at', { ascending: false, nullsFirst: false })
    .range(from, to);

  const { data, error, count } = await query;

  if (error) {
    logger.error('getTrainHistory error:', error);
    throw error;
  }

  const normalized = (data || []).map(row => {
    const coords = resolveCoordinates(row.station_code, row.latitude, row.longitude);
    return {
      ...row,
      latitude: coords.latitude,
      longitude: coords.longitude
    };
  });

  return {
    data: normalized,
    count: count || 0
  };
}

// ============================================================
// GET HISTORY FOR SPECIFIC TRAIN + JOURNEY
// ============================================================
export async function getTrainHistoryForJourney(trainNumber, journeyDate) {
  let query = supabase
    .from('train_history')
    .select('*')
    .eq('train_number', trainNumber);

  if (journeyDate) {
    query = query.eq('journey_date', journeyDate);
  }

  const { data, error } = await query
    .order('station_sequence', { ascending: true })
    .order('captured_at', { ascending: false, nullsFirst: false });

  if (error) {
    logger.error('getTrainHistoryForJourney error:', error);
    throw error;
  }

  return (data || []).map(row => {
    const coords = resolveCoordinates(row.station_code, row.latitude, row.longitude);
    return {
      ...row,
      latitude: coords.latitude,
      longitude: coords.longitude
    };
  });
}

// ============================================================
// UPSERT TRAIN HISTORY
// ============================================================
export async function upsertTrainHistory(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return { count: 0, data: [] };
  }

  const { data, error } = await supabaseAdmin
    .from('train_history')
    .upsert(records, {
      onConflict: 'train_number,journey_date,station_sequence,captured_at',
      ignoreDuplicates: true
    })
    .select();

  if (error) {
    logger.error('upsertTrainHistory error:', error);
    throw error;
  }

  return {
    count: data?.length || 0,
    data: data || []
  };
}

// ============================================================
// GET TRAIN ROUTE / STATIONS
// ============================================================
export async function getStationsByRoute(trainNumber, journeyDate) {
  try {
    const PAGE_SIZE = 1000;
    let from = 0;
    let allRecords = [];

    while (true) {
      const to = from + PAGE_SIZE - 1;
      let query = supabase
        .from('train_history')
        .select(`
          station_sequence,
          station_code,
          current_station,
          previous_station,
          next_station,
          next_station_code,
          next_station_sequence,
          distance_from_origin_km,
          distance_from_last_station_km,
          scheduled_arrival,
          actual_arrival,
          scheduled_departure,
          actual_departure,
          arrival_delay_minutes,
          departure_delay_minutes,
          delay_minutes,
          latitude,
          longitude,
          speed_kmph,
          running_status,
          is_halt,
          is_current_location,
          captured_at
        `)
        .eq('train_number', trainNumber);

      if (journeyDate) {
        query = query.eq('journey_date', journeyDate);
      }

      const { data, error } = await query
        .order('station_sequence', { ascending: true })
        .order('captured_at', { ascending: false, nullsFirst: false })
        .range(from, to);

      if (error) {
        logger.error('getStationsByRoute batch error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        break;
      }

      allRecords.push(...data);
      if (data.length < PAGE_SIZE) {
        break;
      }
      from += PAGE_SIZE;
    }

    const stationMap = new Map();

    for (const station of allRecords) {
      if (station.station_sequence === null || station.station_sequence === undefined) {
        continue;
      }

      const sequence = Number(station.station_sequence);
      if (!stationMap.has(sequence)) {
        const coords = resolveCoordinates(station.station_code, station.latitude, station.longitude);
        stationMap.set(sequence, {
          ...station,
          sequence,
          station_sequence: sequence,
          station_name:
            station.current_station ||
            station.station_code ||
            `Station ${sequence}`,
          distance: Number(station.distance_from_origin_km || 0),
          distance_from_source_km: Number(station.distance_from_origin_km || 0),
          latitude: coords.latitude,
          longitude: coords.longitude
        });
      }
    }

    const stations = Array.from(stationMap.values()).sort(
      (a, b) => a.station_sequence - b.station_sequence
    );

    return stations;
  } catch (error) {
    logger.error(`getStationsByRoute failed for train ${trainNumber}:`, error);
    throw error;
  }
}
