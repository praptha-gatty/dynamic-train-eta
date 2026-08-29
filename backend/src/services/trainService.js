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
// GET TRAIN BY TRAIN NUMBER
// ============================================================
export async function getTrainByNumber(trainNumber) {
  const { data, error } = await supabase
    .from('trains')
    .select('*')
    .eq('train_number', trainNumber)
    .maybeSingle();

  if (error) {
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
    .select('*', {
      count: 'exact'
    });

  if (filters.trainNumber) {
    query = query.eq(
      'train_number',
      filters.trainNumber
    );
  }

  if (filters.journeyDate) {
    query = query.eq(
      'journey_date',
      filters.journeyDate
    );
  }

  if (filters.status) {
    query = query.eq(
      'status',
      filters.status
    );
  }

  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 50;

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query
    .order('captured_at', {
      ascending: false,
      nullsFirst: false
    })
    .range(from, to);

  const {
    data,
    error,
    count
  } = await query;

  if (error) {
    logger.error(
      'getCurrentStatus error:',
      error
    );

    throw error;
  }

  return {
    data: data || [],
    count: count || 0
  };
}

// ============================================================
// GET REALTIME STATUS FOR ONE TRAIN
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
    .maybeSingle();

  if (error) {
    logger.error(
      'getCurrentStatusByTrain error:',
      error
    );

    throw error;
  }

  return data;
}

// ============================================================
// UPSERT CURRENT STATUS
// ============================================================
export async function upsertCurrentStatus(
  statusData
) {
  const { data, error } = await supabaseAdmin
    .from('train_current_status')
    .upsert(statusData, {
      onConflict:
        'train_number,journey_date'
    })
    .select()
    .single();

  if (error) {
    logger.error(
      'upsertCurrentStatus error:',
      error
    );

    throw error;
  }

  return data;
}

// ============================================================
// GET TRAIN HISTORY
// ============================================================
export async function getTrainHistory(
  filters = {}
) {
  let query = supabase
    .from('train_history')
    .select('*', {
      count: 'exact'
    });

  if (filters.trainNumber) {
    query = query.eq(
      'train_number',
      filters.trainNumber
    );
  }

  if (filters.journeyDate) {
    query = query.eq(
      'journey_date',
      filters.journeyDate
    );
  }

  if (filters.stationCode) {
    query = query.eq(
      'station_code',
      filters.stationCode
    );
  }

  if (filters.startDate) {
    query = query.gte(
      'journey_date',
      filters.startDate
    );
  }

  if (filters.endDate) {
    query = query.lte(
      'journey_date',
      filters.endDate
    );
  }

  if (
    filters.isCurrentLocation !== undefined &&
    filters.isCurrentLocation !== null
  ) {
    query = query.eq(
      'is_current_location',
      filters.isCurrentLocation
    );
  }

  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 50;

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  query = query
    .order('captured_at', {
      ascending: false,
      nullsFirst: false
    })
    .range(from, to);

  const {
    data,
    error,
    count
  } = await query;

  if (error) {
    logger.error(
      'getTrainHistory error:',
      error
    );

    throw error;
  }

  return {
    data: data || [],
    count: count || 0
  };
}

// ============================================================
// GET HISTORY FOR SPECIFIC TRAIN + JOURNEY
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
    .order('station_sequence', {
      ascending: true
    })
    .order('captured_at', {
      ascending: false,
      nullsFirst: false
    });

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
export async function upsertTrainHistory(
  records
) {
  if (
    !Array.isArray(records) ||
    records.length === 0
  ) {
    return {
      count: 0,
      data: []
    };
  }

  const { data, error } =
    await supabaseAdmin
      .from('train_history')
      .upsert(records, {
        onConflict:
          'train_number,journey_date,station_sequence,captured_at',
        ignoreDuplicates: true
      })
      .select();

  if (error) {
    logger.error(
      'upsertTrainHistory error:',
      error
    );

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
//
// IMPORTANT:
// station_name is NOT selected because it does not exist
// in your train_history table.
//
// The API creates station_name using:
// current_station -> station_code -> Station <sequence>
//
// ============================================================
export async function getStationsByRoute(
  trainNumber,
  journeyDate
) {
  try {
    const PAGE_SIZE = 1000;

    let from = 0;
    let allRecords = [];

    // --------------------------------------------------------
    // Fetch history records in batches
    // --------------------------------------------------------
    while (true) {
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
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
        .eq(
          'train_number',
          trainNumber
        )
        .eq(
          'journey_date',
          journeyDate
        )
        .order('station_sequence', {
          ascending: true
        })
        .order('captured_at', {
          ascending: false,
          nullsFirst: false
        })
        .range(from, to);

      if (error) {
        logger.error(
          'getStationsByRoute batch error:',
          error
        );

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

    // --------------------------------------------------------
    // Remove invalid station sequences
    // --------------------------------------------------------
    const validRecords =
      allRecords.filter(
        station =>
          station.station_sequence !== null &&
          station.station_sequence !== undefined
      );

    // --------------------------------------------------------
    // Keep latest snapshot for each station sequence
    // --------------------------------------------------------
    const stationMap = new Map();

    for (const station of validRecords) {
      const sequence = Number(
        station.station_sequence
      );

      if (!stationMap.has(sequence)) {
        stationMap.set(
          sequence,
          {
            ...station,
            station_sequence: sequence
          }
        );
      }
    }

    // --------------------------------------------------------
    // Sort route by station sequence
    // --------------------------------------------------------
    const stations = Array.from(
      stationMap.values()
    ).sort(
      (a, b) =>
        a.station_sequence -
        b.station_sequence
    );

    // --------------------------------------------------------
    // Add station_name for frontend
    //
    // IMPORTANT:
    // This does NOT require a station_name database column.
    // --------------------------------------------------------
    const normalizedStations =
      stations.map(station => ({
        ...station,

        station_name:
          station.current_station ||
          station.station_code ||
          `Station ${station.station_sequence}`
      }));

    logger.info(
      `Route loaded for train ${trainNumber} ` +
      `on ${journeyDate}: ` +
      `${allRecords.length} history records -> ` +
      `${normalizedStations.length} unique stations`
    );

    return normalizedStations;

  } catch (error) {
    logger.error(
      `getStationsByRoute failed for train ${trainNumber} ` +
      `on ${journeyDate}:`,
      error
    );

    throw error;
  }
}
