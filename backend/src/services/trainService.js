import { supabase, supabaseAdmin } from './supabase.js';

import logger from '../utils/logger.js';

// ============================================================
// GET ALL TRAINS
// ============================================================
export async function getAllTrains() {
  const { data, error } = await supabase
    .from('trains')
    .select('*')
    .order('train_number');

  if (error) {
    logger.error('getAllTrains error:', error);
    throw error;
  }

  return data || [];
}

// ============================================================
// GET TRAIN BY NUMBER
// ============================================================
export async function getTrainByNumber(trainNumber) {
  const { data, error } = await supabase
    .from('trains')
    .select('*')
    .eq('train_number', trainNumber)
    .single();

  if (error && error.code !== 'PGRST116') {
    logger.error('getTrainByNumber error:', error);
    throw error;
  }

  return data;
}

// ============================================================
// UPSERT TRAIN
// ============================================================
export async function upsertTrain(trainData) {
  const { data, error } = await supabaseAdmin
    .from('trains')
    .upsert(trainData, { onConflict: 'train_number' })
    .select()
    .single();

  if (error) {
    logger.error('upsertTrain error:', error);
    throw error;
  }

  return data;
}

// ============================================================
// GET CURRENT REALTIME STATUS
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

  if (filters.page && filters.limit) {
    const from = (filters.page - 1) * filters.limit;
    const to = from + filters.limit - 1;

    query = query.range(from, to);
  }

  query = query.order('captured_at', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    logger.error('getCurrentStatus error:', error);
    throw error;
  }

  return {
    data: data || [],
    count: count ?? 0
  };
}

// ============================================================
// GET CURRENT STATUS FOR SPECIFIC TRAIN
// ============================================================
export async function getCurrentStatusByTrain(
  trainNumber,
  journeyDate
) {
  const { data, error } = await supabase
    .from('train_current_status')
    .select('*')
    .eq('train_number', trainNumber)
    .eq('journey_date', journeyDate)
    .single();

  if (error && error.code !== 'PGRST116') {
    logger.error('getCurrentStatusByTrain error:', error);
    throw error;
  }

  return data;
}

// ============================================================
// UPSERT CURRENT STATUS
// ============================================================
export async function upsertCurrentStatus(statusData) {
  const { data, error } = await supabaseAdmin
    .from('train_current_status')
    .upsert(statusData, {
      onConflict: 'train_number,journey_date'
    })
    .select()
    .single();

  if (error) {
    logger.error('upsertCurrentStatus error:', error);
    throw error;
  }

  return data;
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

  if (filters.isCurrentLocation !== undefined) {
    query = query.eq(
      'is_current_location',
      filters.isCurrentLocation
    );
  }

  if (filters.page && filters.limit) {
    const from = (filters.page - 1) * filters.limit;
    const to = from + filters.limit - 1;

    query = query.range(from, to);
  }

  query = query.order('captured_at', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    logger.error('getTrainHistory error:', error);
    throw error;
  }

  return {
    data: data || [],
    count: count ?? 0
  };
}

// ============================================================
// GET TRAIN HISTORY FOR SPECIFIC JOURNEY
// ============================================================
export async function getTrainHistoryForJourney(
  trainNumber,
  journeyDate
) {
  const { data, error } = await supabase
    .from('train_history')
    .select('*')
    .eq('train_number', trainNumber)
    .eq('journey_date', journeyDate)
    .order('station_sequence');

  if (error) {
    logger.error(
      'getTrainHistoryForJourney error:',
      error
    );
    throw error;
  }

  return data || [];
}

// ============================================================
// UPSERT TRAIN HISTORY
// ============================================================
export async function upsertTrainHistory(records) {
  if (!records.length) {
    return {
      count: 0
    };
  }

  const { data, error } = await supabaseAdmin
    .from('train_history')
    .upsert(records, {
      onConflict:
        'train_number,journey_date,station_sequence,captured_at',
      ignoreDuplicates: true
    })
    .select();

  if (error) {
    logger.error('upsertTrainHistory error:', error);
    throw error;
  }

  return {
    count: data?.length || 0,
    data
  };
}

// ============================================================
// GET STATIONS BY ROUTE
// ============================================================
export async function getStationsByRoute(
  trainNumber,
  journeyDate
) {
  const { data, error } = await supabase
    .from('train_history')
    .select(
      'station_sequence, station_code, station_name, distance_from_origin_km, scheduled_arrival, scheduled_departure'
    )
    .eq('train_number', trainNumber)
    .eq('journey_date', journeyDate)
    .order('station_sequence');

  if (error) {
    logger.error('getStationsByRoute error:', error);
    throw error;
  }

  const uniqueStations = [];
  const seen = new Set();

  for (const station of data || []) {
    const key = station.station_sequence;

    if (!seen.has(key)) {
      seen.add(key);
      uniqueStations.push(station);
    }
  }

  return uniqueStations;
}
