/**
 * Realistic fallback datasets for trains with route stops and observation telemetry.
 * Used when backend credentials or external live APIs are temporarily offline.
 */

export const POPULAR_TRAINS = [
  { trainNumber: '06489', trainName: 'MAQ-SBHR EXP SPL', origin: 'MAQ', destination: 'SBHR', type: 'Express Special' },
  { trainNumber: '12919', trainName: 'MALWA EXPRESS', origin: 'INDB', destination: 'SVDK', type: 'Superfast' },
  { trainNumber: '12920', trainName: 'MALWA EXPRESS (Return)', origin: 'SVDK', destination: 'INDB', type: 'Superfast' },
  { trainNumber: '12925', trainName: 'PASCHIM EXPRESS', origin: 'MMCT', destination: 'ASR', type: 'Superfast' },
  { trainNumber: '12903', trainName: 'GOLDEN TEMPLE MAIL', origin: 'MMCT', destination: 'ASR', type: 'Superfast Mail' },
  { trainNumber: '12002', trainName: 'BHOPAL SHATABDI', origin: 'NDLS', destination: 'RKMP', type: 'Shatabdi Express' },
  { trainNumber: '12951', trainName: 'MUMBAI RAJDHANI', origin: 'MMCT', destination: 'NDLS', type: 'Rajdhani Express' }
];

export const FALLBACK_TRAIN_DATA = {
  '06489': {
    train_number: '06489',
    train_name: 'MAQ-SBHR EXP SPL',
    origin_code: 'MAQ',
    origin_name: 'Mangaluru Central',
    destination_code: 'SBHR',
    destination_name: 'Subrahmanya Road',
    captured_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    journey_date: new Date().toISOString().split('T')[0],
    current_status: {
      station_code: 'NRJ',
      station_name: 'Narimogaru',
      station_sequence: 5,
      status: 'IN_TRANSIT',
      delay_minutes: 5,
      speed_kmph: 68,
      distance_from_origin_km: 59,
      distance_from_source_km: 59,
      distance_remaining_km: 32,
      latitude: 12.7210,
      longitude: 75.2530,
      is_halt: false,
      running_status: 'Departed Narimogaru 5 mins late'
    },
    stations: [
      { sequence: 1, station_code: 'MAQ', station_name: 'Mangaluru Central', distance: 0, distance_from_source_km: 0, scheduled_arrival: '06:00', actual_arrival: '06:00', scheduled_departure: '06:00', actual_departure: '06:00', latitude: 12.8645, longitude: 74.8431, delay_minutes: 0, status: 'passed' },
      { sequence: 2, station_code: 'MAJN', station_name: 'Mangaluru Junction', distance: 6, distance_from_source_km: 6, scheduled_arrival: '06:12', actual_arrival: '06:14', scheduled_departure: '06:14', actual_departure: '06:16', latitude: 12.8698, longitude: 74.8727, delay_minutes: 2, status: 'passed' },
      { sequence: 3, station_code: 'BNTL', station_name: 'Bantawala', distance: 25, distance_from_source_km: 25, scheduled_arrival: '06:40', actual_arrival: '06:44', scheduled_departure: '06:42', actual_departure: '06:46', latitude: 12.8876, longitude: 75.0345, delay_minutes: 4, status: 'passed' },
      { sequence: 4, station_code: 'KBPR', station_name: 'Kabaka Puttur', distance: 49, distance_from_source_km: 49, scheduled_arrival: '07:08', actual_arrival: '07:14', scheduled_departure: '07:10', actual_departure: '07:16', latitude: 12.7667, longitude: 75.2014, delay_minutes: 6, status: 'passed' },
      { sequence: 5, station_code: 'NRJ', station_name: 'Narimogaru', distance: 59, distance_from_source_km: 59, scheduled_arrival: '07:22', actual_arrival: '07:27', scheduled_departure: '07:24', actual_departure: '07:29', latitude: 12.7210, longitude: 75.2530, delay_minutes: 5, status: 'current' },
      { sequence: 6, station_code: 'KNYR', station_name: 'Kaniuru', distance: 69, distance_from_source_km: 69, scheduled_arrival: '07:38', actual_arrival: null, scheduled_departure: '07:40', actual_departure: null, latitude: 12.7540, longitude: 75.3012, delay_minutes: null, status: 'upcoming' },
      { sequence: 7, station_code: 'SBHR', station_name: 'Subrahmanya Road', distance: 91, distance_from_source_km: 91, scheduled_arrival: '08:15', actual_arrival: null, scheduled_departure: '08:15', actual_departure: null, latitude: 12.6780, longitude: 75.3610, delay_minutes: null, status: 'upcoming' }
    ]
  },
  '12919': {
    train_number: '12919',
    train_name: 'MALWA EXPRESS',
    origin_code: 'INDB',
    origin_name: 'Indore Junction',
    destination_code: 'SVDK',
    destination_name: 'Shri Mata Vaishno Devi Katra',
    captured_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    journey_date: new Date().toISOString().split('T')[0],
    current_status: {
      station_code: 'AGC',
      station_name: 'Agra Cantt',
      station_sequence: 14,
      status: 'IN_TRANSIT',
      delay_minutes: 24,
      speed_kmph: 82,
      distance_from_origin_km: 770,
      distance_from_source_km: 770,
      distance_remaining_km: 850,
      is_halt: false,
      running_status: 'Departed Agra Cantt 24 mins late'
    },
    stations: [
      { sequence: 1, station_code: 'INDB', station_name: 'Indore Junction', distance: 0, distance_from_source_km: 0, scheduled_arrival: '12:15', actual_arrival: '12:15', scheduled_departure: '12:15', actual_departure: '12:15', delay_minutes: 0, status: 'passed' },
      { sequence: 2, station_code: 'DWX', station_name: 'Dewas Junction', distance: 39, distance_from_source_km: 39, scheduled_arrival: '12:56', actual_arrival: '12:58', scheduled_departure: '12:58', actual_departure: '13:00', delay_minutes: 2, status: 'passed' },
      { sequence: 3, station_code: 'UJN', station_name: 'Ujjain Junction', distance: 79, distance_from_source_km: 79, scheduled_arrival: '13:50', actual_arrival: '13:55', scheduled_departure: '14:05', actual_departure: '14:12', delay_minutes: 7, status: 'passed' },
      { sequence: 4, station_code: 'BPL', station_name: 'Bhopal Junction', distance: 263, distance_from_source_km: 263, scheduled_arrival: '17:25', actual_arrival: '17:35', scheduled_departure: '17:30', actual_departure: '17:42', delay_minutes: 12, status: 'passed' },
      { sequence: 5, station_code: 'BHS', station_name: 'Vidisha', distance: 316, distance_from_source_km: 316, scheduled_arrival: '18:16', actual_arrival: '18:28', scheduled_departure: '18:18', actual_departure: '18:30', delay_minutes: 12, status: 'passed' },
      { sequence: 6, station_code: 'BAQ', station_name: 'Ganj Basoda', distance: 356, distance_from_source_km: 356, scheduled_arrival: '18:48', actual_arrival: '19:03', scheduled_departure: '18:50', actual_departure: '19:05', delay_minutes: 15, status: 'passed' },
      { sequence: 7, station_code: 'BINA', station_name: 'Bina Junction', distance: 401, distance_from_source_km: 401, scheduled_arrival: '19:50', actual_arrival: '20:10', scheduled_departure: '19:55', actual_departure: '20:15', delay_minutes: 20, status: 'passed' },
      { sequence: 8, station_code: 'LAR', station_name: 'Lalitpur', distance: 464, distance_from_source_km: 464, scheduled_arrival: '20:40', actual_arrival: '21:02', scheduled_departure: '20:42', actual_departure: '21:04', delay_minutes: 22, status: 'passed' },
      { sequence: 9, station_code: 'BAB', station_name: 'Babina', distance: 529, distance_from_source_km: 529, scheduled_arrival: '21:30', actual_arrival: '21:50', scheduled_departure: '21:32', actual_departure: '21:52', delay_minutes: 20, status: 'passed' },
      { sequence: 10, station_code: 'VGLB', station_name: 'Virangana Lakshmibai Jhansi', distance: 554, distance_from_source_km: 554, scheduled_arrival: '22:05', actual_arrival: '22:30', scheduled_departure: '22:15', actual_departure: '22:42', delay_minutes: 27, status: 'passed' },
      { sequence: 11, station_code: 'DBA', station_name: 'Dabra', distance: 609, distance_from_source_km: 609, scheduled_arrival: '23:18', actual_arrival: '23:44', scheduled_departure: '23:20', actual_departure: '23:46', delay_minutes: 26, status: 'passed' },
      { sequence: 12, station_code: 'GWL', station_name: 'Gwalior Junction', distance: 651, distance_from_source_km: 651, scheduled_arrival: '00:03', actual_arrival: '00:30', scheduled_departure: '00:05', actual_departure: '00:33', delay_minutes: 28, status: 'passed' },
      { sequence: 13, station_code: 'MRA', station_name: 'Morena', distance: 690, distance_from_source_km: 690, scheduled_arrival: '00:35', actual_arrival: '01:01', scheduled_departure: '00:37', actual_departure: '01:03', delay_minutes: 26, status: 'passed' },
      { sequence: 14, station_code: 'AGC', station_name: 'Agra Cantt', distance: 770, distance_from_source_km: 770, scheduled_arrival: '01:20', actual_arrival: '01:44', scheduled_departure: '01:25', actual_departure: '01:49', delay_minutes: 24, status: 'current' },
      { sequence: 15, station_code: 'MTJ', station_name: 'Mathura Junction', distance: 824, distance_from_source_km: 824, scheduled_arrival: '02:00', actual_arrival: null, scheduled_departure: '02:05', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 16, station_code: 'PWL', station_name: 'Palwal', distance: 908, distance_from_source_km: 908, scheduled_arrival: '03:18', actual_arrival: null, scheduled_departure: '03:20', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 17, station_code: 'FDB', station_name: 'Faridabad', distance: 937, distance_from_source_km: 937, scheduled_arrival: '03:41', actual_arrival: null, scheduled_departure: '03:43', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 18, station_code: 'NZM', station_name: 'Hazrat Nizamuddin', distance: 958, distance_from_source_km: 958, scheduled_arrival: '04:15', actual_arrival: null, scheduled_departure: '04:30', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 19, station_code: 'NDLS', station_name: 'New Delhi', distance: 965, distance_from_source_km: 965, scheduled_arrival: '04:50', actual_arrival: null, scheduled_departure: '05:05', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 20, station_code: 'PNP', station_name: 'Panipat Junction', distance: 1055, distance_from_source_km: 1055, scheduled_arrival: '06:16', actual_arrival: null, scheduled_departure: '06:18', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 21, station_code: 'KUN', station_name: 'Karnal', distance: 1089, distance_from_source_km: 1089, scheduled_arrival: '06:42', actual_arrival: null, scheduled_departure: '06:44', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 22, station_code: 'KKDE', station_name: 'Kurukshetra Junction', distance: 1122, distance_from_source_km: 1122, scheduled_arrival: '07:08', actual_arrival: null, scheduled_departure: '07:10', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 23, station_code: 'UMB', station_name: 'Ambala Cantt Junction', distance: 1164, distance_from_source_km: 1164, scheduled_arrival: '07:55', actual_arrival: null, scheduled_departure: '08:05', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 24, station_code: 'LDH', station_name: 'Ludhiana Junction', distance: 1278, distance_from_source_km: 1278, scheduled_arrival: '09:40', actual_arrival: null, scheduled_departure: '09:50', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 25, station_code: 'JRC', station_name: 'Jalandhar Cantt Junction', distance: 1330, distance_from_source_km: 1330, scheduled_arrival: '10:45', actual_arrival: null, scheduled_departure: '10:50', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 26, station_code: 'PTKC', station_name: 'Pathankot Cantt', distance: 1443, distance_from_source_km: 1443, scheduled_arrival: '12:35', actual_arrival: null, scheduled_departure: '12:40', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 27, station_code: 'KTHU', station_name: 'Kathua', distance: 1466, distance_from_source_km: 1466, scheduled_arrival: '13:08', actual_arrival: null, scheduled_departure: '13:10', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 28, station_code: 'JAT', station_name: 'Jammu Tawi', distance: 1542, distance_from_source_km: 1542, scheduled_arrival: '14:35', actual_arrival: null, scheduled_departure: '14:45', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 29, station_code: 'MCTM', station_name: 'MCTM Udhampur', distance: 1595, distance_from_source_km: 1595, scheduled_arrival: '15:48', actual_arrival: null, scheduled_departure: '15:50', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 30, station_code: 'SVDK', station_name: 'Shri Mata Vaishno Devi Katra', distance: 1620, distance_from_source_km: 1620, scheduled_arrival: '16:40', actual_arrival: null, scheduled_departure: '16:40', actual_departure: null, delay_minutes: null, status: 'upcoming' }
    ]
  },
  '12925': {
    train_number: '12925',
    train_name: 'PASCHIM EXPRESS',
    origin_code: 'MMCT',
    origin_name: 'Mumbai Central',
    destination_code: 'ASR',
    destination_name: 'Amritsar Junction',
    captured_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    journey_date: new Date().toISOString().split('T')[0],
    current_status: {
      station_code: 'KOTA',
      station_name: 'Kota Junction',
      station_sequence: 9,
      status: 'IN_TRANSIT',
      delay_minutes: 18,
      speed_kmph: 95,
      distance_from_origin_km: 920,
      distance_from_source_km: 920,
      distance_remaining_km: 900,
      is_halt: true,
      running_status: 'Halted at Kota Junction on Platform 1'
    },
    stations: [
      { sequence: 1, station_code: 'MMCT', station_name: 'Mumbai Central', distance: 0, distance_from_source_km: 0, scheduled_arrival: '11:25', actual_arrival: '11:25', scheduled_departure: '11:25', actual_departure: '11:25', delay_minutes: 0, status: 'passed' },
      { sequence: 2, station_code: 'BVI', station_name: 'Borivali', distance: 30, distance_from_source_km: 30, scheduled_arrival: '11:55', actual_arrival: '11:58', scheduled_departure: '11:58', actual_departure: '12:01', delay_minutes: 3, status: 'passed' },
      { sequence: 3, station_code: 'VAPI', station_name: 'Vapi', distance: 168, distance_from_source_km: 168, scheduled_arrival: '13:27', actual_arrival: '13:35', scheduled_departure: '13:29', actual_departure: '13:37', delay_minutes: 8, status: 'passed' },
      { sequence: 4, station_code: 'BL', station_name: 'Valsad', distance: 194, distance_from_source_km: 194, scheduled_arrival: '13:51', actual_arrival: '14:02', scheduled_departure: '13:53', actual_departure: '14:04', delay_minutes: 11, status: 'passed' },
      { sequence: 5, station_code: 'ST', station_name: 'Surat', distance: 263, distance_from_source_km: 263, scheduled_arrival: '14:48', actual_arrival: '15:02', scheduled_departure: '14:53', actual_departure: '15:08', delay_minutes: 15, status: 'passed' },
      { sequence: 6, station_code: 'BRC', station_name: 'Vadodara Junction', distance: 393, distance_from_source_km: 393, scheduled_arrival: '16:28', actual_arrival: '16:45', scheduled_departure: '16:38', actual_departure: '16:55', delay_minutes: 17, status: 'passed' },
      { sequence: 7, station_code: 'RTM', station_name: 'Ratlam Junction', distance: 654, distance_from_source_km: 654, scheduled_arrival: '20:15', actual_arrival: '20:35', scheduled_departure: '20:25', actual_departure: '20:45', delay_minutes: 20, status: 'passed' },
      { sequence: 8, station_code: 'NAD', station_name: 'Nagda Junction', distance: 695, distance_from_source_km: 695, scheduled_arrival: '21:12', actual_arrival: '21:30', scheduled_departure: '21:17', actual_departure: '21:35', delay_minutes: 18, status: 'passed' },
      { sequence: 9, station_code: 'KOTA', station_name: 'Kota Junction', distance: 920, distance_from_source_km: 920, scheduled_arrival: '00:05', actual_arrival: '00:23', scheduled_departure: '00:15', actual_departure: null, delay_minutes: 18, status: 'current' },
      { sequence: 10, station_code: 'SWM', station_name: 'Sawai Madhopur Junction', distance: 1028, distance_from_source_km: 1028, scheduled_arrival: '01:33', actual_arrival: null, scheduled_departure: '01:35', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 11, station_code: 'BTE', station_name: 'Bharatpur Junction', distance: 1211, distance_from_source_km: 1211, scheduled_arrival: '03:48', actual_arrival: null, scheduled_departure: '03:50', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 12, station_code: 'MTJ', station_name: 'Mathura Junction', distance: 1245, distance_from_source_km: 1245, scheduled_arrival: '04:35', actual_arrival: null, scheduled_departure: '04:40', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 13, station_code: 'NZM', station_name: 'Hazrat Nizamuddin', distance: 1379, distance_from_source_km: 1379, scheduled_arrival: '06:40', actual_arrival: null, scheduled_departure: '06:55', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 14, station_code: 'NDLS', station_name: 'New Delhi', distance: 1386, distance_from_source_km: 1386, scheduled_arrival: '07:25', actual_arrival: null, scheduled_departure: '07:40', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 15, station_code: 'PNP', station_name: 'Panipat Junction', distance: 1476, distance_from_source_km: 1476, scheduled_arrival: '08:50', actual_arrival: null, scheduled_departure: '08:52', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 16, station_code: 'UMB', station_name: 'Ambala Cantt Junction', distance: 1585, distance_from_source_km: 1585, scheduled_arrival: '10:40', actual_arrival: null, scheduled_departure: '10:50', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 17, station_code: 'LDH', station_name: 'Ludhiana Junction', distance: 1699, distance_from_source_km: 1699, scheduled_arrival: '12:25', actual_arrival: null, scheduled_departure: '12:35', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 18, station_code: 'JUC', station_name: 'Jalandhar City Junction', distance: 1756, distance_from_source_km: 1756, scheduled_arrival: '13:30', actual_arrival: null, scheduled_departure: '13:35', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 19, station_code: 'ASR', station_name: 'Amritsar Junction', distance: 1820, distance_from_source_km: 1820, scheduled_arrival: '14:55', actual_arrival: null, scheduled_departure: '14:55', actual_departure: null, delay_minutes: null, status: 'upcoming' }
    ]
  }
};

/**
 * Calculates a dynamic ETA between current position and target station (defaulting to terminus).
 */
export function calculateLocalPrediction(trainData, targetStationCode = null) {
  if (!trainData || !trainData.stations || trainData.stations.length === 0) return null;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const isFuture = Boolean(trainData.journey_date && trainData.journey_date > todayStr);
  const isYetToStart = trainData.running_status === 'YET_TO_START' || isFuture;

  const stations = trainData.stations;
  const originStation = stations[0] || {};
  const terminusStation = stations[stations.length - 1] || {};
  const effectiveTargetCode = targetStationCode || terminusStation.station_code;
  const targetIdx = stations.findIndex(s => s.station_code === effectiveTargetCode);
  const tgtStn = targetIdx !== -1 ? stations[targetIdx] : terminusStation;

  if (isYetToStart) {
    const totalDist = Number(tgtStn.distance_from_source_km ?? tgtStn.distance ?? 0);
    return {
      train_number: trainData.train_number,
      journey_date: trainData.journey_date,
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
        code: tgtStn.station_code,
        name: tgtStn.station_name,
        sequence: tgtStn.sequence || stations.length,
        distance_from_source_km: totalDist
      },
      current_delay_minutes: 0,
      predicted_delay_minutes: 0,
      current_speed_kmph: 0,
      effective_speed_kmph: 0,
      distance_remaining_km: totalDist,
      stations_remaining: targetIdx !== -1 ? targetIdx : stations.length - 1,
      travel_time_minutes: 0,
      estimated_arrival: tgtStn.scheduled_arrival || '00:00',
      scheduled_arrival: tgtStn.scheduled_arrival || '00:00',
      formatted_eta: tgtStn.scheduled_arrival || '--:--',
      status_message: `Scheduled to depart from ${originStation.station_name || originStation.station_code} on ${originStation.scheduled_departure || 'Scheduled Time'}`,
      delay_explanation: {
        root_cause: 'Scheduled Run',
        explanation: `Train journey is scheduled for ${trainData.journey_date}. Official timetable schedule active.`,
        severity: 'nominal',
        summary: 'Future schedule.'
      },
      confidence: 'high (timetable projection)'
    };
  }

  const currentStation = trainData.current_status || stations.find(s => s.status === 'current') || stations[0];
  const currentIdx = stations.findIndex(s => s.station_code === (currentStation.station_code || currentStation.stationCode));
  
  if (currentIdx === -1 || targetIdx === -1 || targetIdx <= currentIdx) {
    return null;
  }
  
  const currStn = stations[currentIdx];
  
  // Calculate remaining distance: targetStation.distance_from_source_km - currentStation.distance_from_source_km
  const currentDistSource = Number(currStn.distance_from_source_km ?? currStn.distance ?? currentStation.distance_from_origin_km ?? 0);
  const targetDistSource = Number(tgtStn.distance_from_source_km ?? tgtStn.distance ?? 0);
  const distanceRemaining = Math.max(0, targetDistSource - currentDistSource);
  
  // Calculate remaining stations: routeStations.slice(currentStationIndex + 1, targetStationIndex + 1).length
  const remainingStationsSlice = stations.slice(currentIdx + 1, targetIdx + 1);
  const stationsRemaining = remainingStationsSlice.length;
  
  const speed = currentStation.speed_kmph || 75;
  const travelTimeHours = distanceRemaining / Math.max(25, speed);
  const travelTimeMinutes = Math.round(travelTimeHours * 60);
  
  const currentDelay = Number(currentStation.delay_minutes || 0);
  const predictedDelayMinutes = Math.max(0, Math.round(currentDelay * 0.95));
  
  const estimatedArrivalDate = new Date(Date.now() + travelTimeMinutes * 60000);

  // SIH 2026 "Why Delayed?" root-cause explanation
  const delayExplanation = {
    root_cause: currentDelay >= 20 && speed < 35
      ? 'Junction Congestion'
      : currentDelay >= 15 && speed >= 50
      ? 'Section Recovery'
      : currentDelay >= 5
      ? 'Speed Restriction'
      : 'Optimal Clearance',
    explanation: currentDelay >= 20 && speed < 35
      ? 'Severe junction congestion and signal queuing ahead.'
      : currentDelay >= 15 && speed >= 50
      ? 'Cascading delay recovery in progress across intermediate section.'
      : currentDelay >= 5
      ? 'Speed restriction or approach caution block.'
      : 'Optimal track section clearance.',
    severity: currentDelay >= 20 ? 'high' : currentDelay >= 10 ? 'medium' : 'nominal',
    summary: `Observed at ${currStn.station_name || currStn.station_code}.`
  };
  
  return {
    train_number: trainData.train_number,
    journey_date: trainData.journey_date,
    current_station: {
      code: currStn.station_code,
      name: currStn.station_name,
      sequence: currStn.sequence,
      distance_from_source_km: currentDistSource
    },
    target_station: {
      code: tgtStn.station_code,
      name: tgtStn.station_name,
      sequence: tgtStn.sequence,
      distance_from_source_km: targetDistSource
    },
    current_delay_minutes: currentDelay,
    predicted_delay_minutes: predictedDelayMinutes,
    current_speed_kmph: speed,
    effective_speed_kmph: speed,
    distance_remaining_km: distanceRemaining,
    stations_remaining: stationsRemaining,
    travel_time_minutes: travelTimeMinutes,
    estimated_arrival: estimatedArrivalDate.toISOString(),
    scheduled_arrival: tgtStn.scheduled_arrival,
    delay_explanation: delayExplanation,
    confidence: 'high (kinematic physics model)'
  };
}
