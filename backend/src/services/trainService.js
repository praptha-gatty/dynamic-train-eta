import { supabase, supabaseAdmin } from './supabase.js';
import { fetchWithRetry } from '../utils/apiClient.js';
import logger from '../utils/logger.js';

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

export async function getCurrentStatus(filters = {}) {
  let query = supabase
    .from('train_current_status')
    .select('*');
  
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
  
  return { data: data || [], count };
}

export async function getCurrentStatusByTrain(trainNumber, journeyDate) {
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

export async function upsertCurrentStatus(statusData) {
  const { data, error } = await supabaseAdmin
    .from('train_current_status')
    .upsert(statusData, { onConflict: 'train_number,journey_date' })
    .select()
    .single();
  
  if (error) {
    logger.error('upsertCurrentStatus error:', error);
    throw error;
  }
  return data;
}

export async function getTrainHistory(param = {}, page = 1, limit = 500) {
  let trainNum = null;
  let filters = {};

  if (typeof param === 'string' || typeof param === 'number') {
    trainNum = String(param).trim();
  } else if (typeof param === 'object' && param !== null) {
    filters = param;
    trainNum = filters.trainNumber ? String(filters.trainNumber).trim() : null;
    page = filters.page || page;
    limit = filters.limit || limit;
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from('train_history').select('*', { count: 'exact' });

  if (trainNum) {
    query = query.eq('train_number', trainNum);
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
    query = query.eq('is_current_location', filters.isCurrentLocation);
  }

  query = query.order('station_sequence', { ascending: true }).range(from, to);

  let { data, error, count } = await query;

  if (error) {
    logger.error('getTrainHistory error:', error);
    throw error;
  }

  // Fallback: If 0 records exist for a specific trainNumber, trigger live on-demand fetch
  if ((!data || data.length === 0) && trainNum) {
    logger.info(`0 history records found for train ${trainNum}. Triggering live on-demand fetch fallback...`);
    const saved = await fetchAndSaveLiveTrain(trainNum);
    if (saved && saved.length > 0) {
      const requery = await supabase
        .from('train_history')
        .select('*', { count: 'exact' })
        .eq('train_number', trainNum)
        .order('station_sequence', { ascending: true })
        .range(from, to);
      data = requery.data || saved;
      count = requery.count || saved.length;
    }
  }

  return { data: data || [], count: count || 0 };
}

export async function getTrainHistoryForJourney(trainNumber, journeyDate) {
  const { data, error } = await supabase
    .from('train_history')
    .select('*')
    .eq('train_number', trainNumber)
    .eq('journey_date', journeyDate)
    .order('station_sequence');
  
  if (error) {
    logger.error('getTrainHistoryForJourney error:', error);
    throw error;
  }
  return data || [];
}

export async function upsertTrainHistory(records) {
  if (!records.length) return { count: 0 };
  
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
  return { count: data?.length || 0, data };
}

export async function getStationsByRoute(trainNumber, journeyDate) {
  const { data, error } = await supabase
    .from('train_history')
    .select('station_sequence, station_code, station_name, distance_from_origin_km, scheduled_arrival, scheduled_departure')
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

export async function searchTrains(searchQuery = '') {
  const q = String(searchQuery).trim();
  if (!q) return [];

  // Query trains table by number or name
  const { data: dbTrains, error } = await supabase
    .from('trains')
    .select('*')
    .or(`train_number.ilike.%${q}%,train_name.ilike.%${q}%`)
    .limit(20);

  if (!error && dbTrains && dbTrains.length > 0) {
    return dbTrains;
  }

  // Fallback: search train_history for unique matching trains
  const { data: histTrains } = await supabase
    .from('train_history')
    .select('train_number, train_name')
    .or(`train_number.ilike.%${q}%,train_name.ilike.%${q}%`)
    .limit(50);

  if (histTrains && histTrains.length > 0) {
    const map = new Map();
    histTrains.forEach(t => {
      if (t.train_number && !map.has(t.train_number)) {
        map.set(t.train_number, { train_number: t.train_number, train_name: t.train_name || `Train ${t.train_number}` });
      }
    });
    return Array.from(map.values());
  }

  return [];
}

export async function getAvailableTrains() {
  // Query lightweight train_current_status table
  const { data: statusData, error: statusErr } = await supabase
    .from('train_current_status')
    .select('train_number, status, delay_minutes, captured_at')
    .order('captured_at', { ascending: false });

  // Query trains table for train names & route metadata
  const { data: trainsData } = await supabase
    .from('trains')
    .select('train_number, train_name, source_station, destination_station');

  const trainNameMap = new Map();
  (trainsData || []).forEach(t => {
    if (t.train_number) {
      trainNameMap.set(String(t.train_number).trim(), t);
    }
  });

  const resultMap = new Map();

  if (!statusErr && statusData && statusData.length > 0) {
    statusData.forEach(s => {
      const num = String(s.train_number || '').trim();
      if (num && !resultMap.has(num)) {
        const meta = trainNameMap.get(num) || {};
        resultMap.set(num, {
          train_number: num,
          train_name: meta.train_name || `Train ${num}`,
          source_station: meta.source_station || null,
          destination_station: meta.destination_station || null,
          running_status: s.status || 'running',
          delay_minutes: s.delay_minutes ?? 0,
          captured_at: s.captured_at
        });
      }
    });
  }

  // Fallback: If no current status rows exist, include trainsData items
  if (resultMap.size === 0 && trainsData && trainsData.length > 0) {
    trainsData.forEach(t => {
      const num = String(t.train_number || '').trim();
      if (num && !resultMap.has(num)) {
        resultMap.set(num, {
          train_number: num,
          train_name: t.train_name || `Train ${num}`,
          source_station: t.source_station || null,
          destination_station: t.destination_station || null,
          running_status: 'scheduled',
          delay_minutes: 0
        });
      }
    });
  }

  return Array.from(resultMap.values());
}

export async function fetchAndSaveLiveTrain(trainNumber) {
  const cleanNum = String(trainNumber || '').trim();
  if (!cleanNum) return [];

  logger.info(`⚡ Triggering live on-demand fetch for train ${cleanNum}...`);
  const url = `https://railradar.in/api/v1/trains/${encodeURIComponent(cleanNum)}/live`;

  try {
    const res = await fetchWithRetry(url, { timeout: 5000, retries: 2 });
    const data = res?.data?.data;
    if (!data || !data.route || !data.route.length) {
      logger.warn(`Live API returned no route data for train ${cleanNum}`);
      return [];
    }

    const trainName = data.trainName || data.train?.name || `Train ${cleanNum}`;
    const journeyDate = data.startDate || new Date().toISOString().substring(0, 10);
    const route = data.route || [];
    const currentLocation = data.currentLocation || {};

    const src = route[0]?.stationName || 'Origin';
    const dest = route[route.length - 1]?.stationName || 'Destination';
    await supabaseAdmin.from('trains').upsert({
      train_number: cleanNum,
      train_name: trainName,
      source_station: src,
      destination_station: dest
    }, { onConflict: 'train_number' });

    const routeTotalDist = parseFloat(route[route.length - 1]?.distance || 0);
    const totalDist = data.train?.distance ? parseFloat(data.train.distance) : routeTotalDist;
    const capturedAt = new Date().toISOString();
    const currentSeq = currentLocation.sequence;

    const records = route.map((station, index) => {
      const seq = parseInt(station.sequence || index + 1, 10);
      const code = station.stationCode ? String(station.stationCode).trim().toUpperCase() : null;
      const name = station.stationName ? String(station.stationName).trim() : null;
      const isCurrent = currentSeq != null && seq === currentSeq;

      const dist = station.distance != null ? parseFloat(station.distance) : null;
      const distRemaining = dist != null && totalDist >= dist ? Number((totalDist - dist).toFixed(2)) : null;

      let distFromLast = null;
      if (index > 0 && dist != null) {
        const prevDist = route[index - 1]?.distance != null ? parseFloat(route[index - 1].distance) : null;
        if (prevDist != null && dist >= prevDist) {
          distFromLast = Number((dist - prevDist).toFixed(2));
        }
      }
      if (distFromLast == null && isCurrent) {
        distFromLast = currentLocation.distanceFromLastStation;
      }

      const nextStation = route[index + 1];
      const prevStation = route[index - 1];

      return {
        train_number: cleanNum,
        train_name: trainName,
        journey_date: journeyDate,
        current_station: name,
        next_station: nextStation?.stationName || null,
        station_code: code,
        station_sequence: seq,
        previous_station: prevStation?.stationName || null,
        next_station_code: nextStation?.stationCode || null,
        next_station_sequence: nextStation?.sequence ? parseInt(nextStation.sequence, 10) : null,
        scheduled_arrival: station.scheduledArrival || null,
        actual_arrival: station.actualArrival || null,
        scheduled_departure: station.scheduledDeparture || null,
        actual_departure: station.actualDeparture || null,
        delay_minutes: station.delayArrival ?? station.delayDeparture ?? station.delay ?? 0,
        arrival_delay_minutes: station.delayArrival ?? null,
        departure_delay_minutes: station.delayDeparture ?? null,
        latitude: station.latitude ? parseFloat(station.latitude) : null,
        longitude: station.longitude ? parseFloat(station.longitude) : null,
        speed_kmph: station.speedToNextStationKmph ? parseFloat(station.speedToNextStationKmph) : 0,
        distance_remaining_km: distRemaining,
        distance_from_origin_km: dist,
        distance_from_last_station_km: distFromLast,
        running_status: data.status || null,
        is_halt: Boolean(station.isHalt),
        captured_at: capturedAt,
        api_updated_at: data.lastUpdatedAt || null,
        is_current_location: isCurrent
      };
    });

    if (records.length > 0) {
      await supabaseAdmin.from('train_history').insert(records);
      logger.info(`✅ On-demand fetch saved ${records.length} records into train_history for train ${cleanNum}`);
      return records;
    }
  } catch (err) {
    logger.error(`Error in fetchAndSaveLiveTrain for train ${cleanNum}:`, err.message);
  }
  return [];
}


export async function getTrainHistoryPaginated(trainNumber, page = 1, limit = 50) {
  const cleanNum = String(trainNumber || '').trim();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let { data, error, count } = await supabase
    .from('train_history')
    .select('*', { count: 'exact' })
    .eq('train_number', cleanNum)
    .order('captured_at', { ascending: false })
    .range(from, to);

  if (error) {
    logger.error('getTrainHistoryPaginated error:', error);
    throw error;
  }

  // Fallback: If 0 records exist for this train, trigger live on-demand fetch
  if (!data || data.length === 0) {
    logger.info(`0 history records found for train ${cleanNum}. Triggering live on-demand fetch fallback...`);
    const saved = await fetchAndSaveLiveTrain(cleanNum);
    if (saved && saved.length > 0) {
      const requery = await supabase
        .from('train_history')
        .select('*', { count: 'exact' })
        .eq('train_number', cleanNum)
        .order('captured_at', { ascending: false })
        .range(from, to);
      data = requery.data || saved;
      count = requery.count || saved.length;
    }
  }

  return { data: data || [], count: count || 0 };
}

export async function getTrainLiveETA(trainNumber) {
  const cleanNum = String(trainNumber || '').trim();

  // Fetch latest snapshot for the train
  let { data, error } = await supabase
    .from('train_history')
    .select('*')
    .eq('train_number', cleanNum)
    .order('captured_at', { ascending: false })
    .limit(100);

  // Fallback: If 0 records exist for this train, trigger live on-demand fetch
  if (error || !data || data.length === 0) {
    logger.info(`0 live ETA records found for train ${cleanNum}. Triggering live on-demand fetch fallback...`);
    const saved = await fetchAndSaveLiveTrain(cleanNum);
    if (saved && saved.length > 0) {
      data = saved;
    } else {
      return null;
    }
  }

  const latest = data[0];
  const currentStation = data.find(r => r.is_current_location) || latest;
  const currentSeq = Number(currentStation.station_sequence || 0);

  const nextStation = data.find(r => Number(r.station_sequence) === currentSeq + 1) || {
    station_name: latest.next_station,
    station_code: latest.next_station_code,
    station_sequence: latest.next_station_sequence
  };

  const delayMins = Number(latest.delay_minutes || 0);
  const effSpeed = Number(latest.speed_kmph && latest.speed_kmph > 0 ? latest.speed_kmph : 45);
  const distRemaining = Number(latest.distance_remaining_km || 0);

  const addedDelayMinutes = Math.round(delayMins * 0.8);
  const totalPredictedDelay = delayMins + addedDelayMinutes;

  return {
    train_number: latest.train_number,
    train_name: latest.train_name,
    journey_date: latest.journey_date,
    running_status: latest.running_status || 'running',
    captured_at: latest.captured_at,
    current: {
      station_name: latest.current_station,
      station_code: latest.station_code,
      station_sequence: latest.station_sequence,
      delay_minutes: delayMins,
      speed_kmph: effSpeed,
      distance_remaining_km: distRemaining,
      scheduled_arrival: latest.scheduled_arrival,
      actual_arrival: latest.actual_arrival,
      scheduled_departure: latest.scheduled_departure,
      actual_departure: latest.actual_departure
    },
    next_station: nextStation,
    prediction: {
      recorded_delay_minutes: delayMins,
      predicted_added_delay_minutes: addedDelayMinutes,
      total_predicted_delay_minutes: totalPredictedDelay,
      effective_speed_kmph: effSpeed,
      distance_remaining_km: distRemaining,
      explanation: `At ${latest.current_station || 'current station'}, train has ${delayMins} min recorded delay. Forecasted arrival delay over remaining ${distRemaining} km is ${totalPredictedDelay} mins.`
    },
    stations: data
  };
}

export async function getAllActiveTrainStatuses() {
  // Query 1 row per active train from train_current_status
  const { data: statusRows, error: sErr } = await supabase
    .from('train_current_status')
    .select('*')
    .order('captured_at', { ascending: false });

  // Query trains master table
  const { data: trainMaster } = await supabase
    .from('trains')
    .select('*');

  const masterMap = new Map();
  (trainMaster || []).forEach(t => {
    if (t.train_number) masterMap.set(String(t.train_number).trim(), t);
  });

  const activeMap = new Map();

  if (!sErr && statusRows && statusRows.length > 0) {
    statusRows.forEach(s => {
      const num = String(s.train_number || '').trim();
      if (num && !activeMap.has(num)) {
        const meta = masterMap.get(num) || {};
        activeMap.set(num, {
          train_number: num,
          train_name: meta.train_name || `Train ${num}`,
          source_station: meta.source_station || null,
          destination_station: meta.destination_station || null,
          running_status: s.status || 'running',
          last_station_code: s.last_station_code || null,
          delay_minutes: s.delay_minutes ?? 0,
          captured_at: s.captured_at
        });
      }
    });
  }

  // Include any active trains from trains table if status is missing
  (trainMaster || []).forEach(t => {
    const num = String(t.train_number || '').trim();
    if (num && !activeMap.has(num)) {
      activeMap.set(num, {
        train_number: num,
        train_name: t.train_name || `Train ${num}`,
        source_station: t.source_station || null,
        destination_station: t.destination_station || null,
        running_status: 'scheduled',
        last_station_code: null,
        delay_minutes: 0,
        captured_at: new Date().toISOString()
      });
    }
  });

  return Array.from(activeMap.values());
}