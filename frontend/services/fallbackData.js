/**
 * Realistic fallback datasets for trains with route stops and observation telemetry.
 * Used when backend credentials or external live APIs are temporarily offline.
 */

export const POPULAR_TRAINS = [
  { trainNumber: '12919', trainName: 'MALWA EXPRESS', origin: 'INDB', destination: 'SVDK', type: 'Superfast' },
  { trainNumber: '12920', trainName: 'MALWA EXPRESS (Return)', origin: 'SVDK', destination: 'INDB', type: 'Superfast' },
  { trainNumber: '12925', trainName: 'PASCHIM EXPRESS', origin: 'MMCT', destination: 'ASR', type: 'Superfast' },
  { trainNumber: '12903', trainName: 'GOLDEN TEMPLE MAIL', origin: 'MMCT', destination: 'ASR', type: 'Superfast Mail' },
  { trainNumber: '12002', trainName: 'BHOPAL SHATABDI', origin: 'NDLS', destination: 'RKMP', type: 'Shatabdi Express' },
  { trainNumber: '12951', trainName: 'MUMBAI RAJDHANI', origin: 'MMCT', destination: 'NDLS', type: 'Rajdhani Express' }
];

export const FALLBACK_TRAIN_DATA = {
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
      distance_from_origin_km: 708,
      distance_remaining_km: 855,
      is_halt: false,
      running_status: 'Departed Agra Cantt 24 mins late'
    },
    stations: [
      { sequence: 1, station_code: 'INDB', station_name: 'Indore Junction', distance: 0, scheduled_arrival: '12:15', actual_arrival: '12:15', scheduled_departure: '12:15', actual_departure: '12:15', delay_minutes: 0, status: 'passed' },
      { sequence: 2, station_code: 'DWX', station_name: 'Dewas Junction', distance: 39, scheduled_arrival: '12:56', actual_arrival: '12:58', scheduled_departure: '12:58', actual_departure: '13:00', delay_minutes: 2, status: 'passed' },
      { sequence: 3, station_code: 'UJN', station_name: 'Ujjain Junction', distance: 79, scheduled_arrival: '13:50', actual_arrival: '13:55', scheduled_departure: '14:05', actual_departure: '14:12', delay_minutes: 7, status: 'passed' },
      { sequence: 4, station_code: 'BPL', station_name: 'Bhopal Junction', distance: 263, scheduled_arrival: '17:25', actual_arrival: '17:35', scheduled_departure: '17:30', actual_departure: '17:42', delay_minutes: 12, status: 'passed' },
      { sequence: 5, station_code: 'BHS', station_name: 'Vidisha', distance: 316, scheduled_arrival: '18:16', actual_arrival: '18:28', scheduled_departure: '18:18', actual_departure: '18:30', delay_minutes: 12, status: 'passed' },
      { sequence: 6, station_code: 'BAQ', station_name: 'Ganj Basoda', distance: 356, scheduled_arrival: '18:48', actual_arrival: '19:03', scheduled_departure: '18:50', actual_departure: '19:05', delay_minutes: 15, status: 'passed' },
      { sequence: 7, station_code: 'BINA', station_name: 'Bina Junction', distance: 401, scheduled_arrival: '19:50', actual_arrival: '20:10', scheduled_departure: '19:55', actual_departure: '20:15', delay_minutes: 20, status: 'passed' },
      { sequence: 8, station_code: 'LAR', station_name: 'Lalitpur', distance: 464, scheduled_arrival: '20:40', actual_arrival: '21:02', scheduled_departure: '20:42', actual_departure: '21:04', delay_minutes: 22, status: 'passed' },
      { sequence: 9, station_code: 'BAB', station_name: 'Babina', distance: 529, scheduled_arrival: '21:30', actual_arrival: '21:50', scheduled_departure: '21:32', actual_departure: '21:52', delay_minutes: 20, status: 'passed' },
      { sequence: 10, station_code: 'VGLB', station_name: 'Virangana Lakshmibai Jhansi', distance: 554, scheduled_arrival: '22:05', actual_arrival: '22:30', scheduled_departure: '22:15', actual_departure: '22:42', delay_minutes: 27, status: 'passed' },
      { sequence: 11, station_code: 'DBA', station_name: 'Dabra', distance: 609, scheduled_arrival: '23:18', actual_arrival: '23:44', scheduled_departure: '23:20', actual_departure: '23:46', delay_minutes: 26, status: 'passed' },
      { sequence: 12, station_code: 'GWL', station_name: 'Gwalior Junction', distance: 651, scheduled_arrival: '00:03', actual_arrival: '00:30', scheduled_departure: '00:05', actual_departure: '00:33', delay_minutes: 28, status: 'passed' },
      { sequence: 13, station_code: 'MRA', station_name: 'Morena', distance: 690, scheduled_arrival: '00:35', actual_arrival: '01:01', scheduled_departure: '00:37', actual_departure: '01:03', delay_minutes: 26, status: 'passed' },
      { sequence: 14, station_code: 'AGC', station_name: 'Agra Cantt', distance: 770, scheduled_arrival: '01:20', actual_arrival: '01:44', scheduled_departure: '01:25', actual_departure: '01:49', delay_minutes: 24, status: 'current' },
      { sequence: 15, station_code: 'MTJ', station_name: 'Mathura Junction', distance: 824, scheduled_arrival: '02:00', actual_arrival: null, scheduled_departure: '02:05', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 16, station_code: 'PWL', station_name: 'Palwal', distance: 908, scheduled_arrival: '03:18', actual_arrival: null, scheduled_departure: '03:20', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 17, station_code: 'FDB', station_name: 'Faridabad', distance: 937, scheduled_arrival: '03:41', actual_arrival: null, scheduled_departure: '03:43', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 18, station_code: 'NZM', station_name: 'Hazrat Nizamuddin', distance: 958, scheduled_arrival: '04:15', actual_arrival: null, scheduled_departure: '04:30', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 19, station_code: 'NDLS', station_name: 'New Delhi', distance: 965, scheduled_arrival: '04:50', actual_arrival: null, scheduled_departure: '05:05', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 20, station_code: 'PNP', station_name: 'Panipat Junction', distance: 1055, scheduled_arrival: '06:16', actual_arrival: null, scheduled_departure: '06:18', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 21, station_code: 'KUN', station_name: 'Karnal', distance: 1089, scheduled_arrival: '06:42', actual_arrival: null, scheduled_departure: '06:44', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 22, station_code: 'KKDE', station_name: 'Kurukshetra Junction', distance: 1122, scheduled_arrival: '07:08', actual_arrival: null, scheduled_departure: '07:10', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 23, station_code: 'UMB', station_name: 'Ambala Cantt Junction', distance: 1164, scheduled_arrival: '07:55', actual_arrival: null, scheduled_departure: '08:05', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 24, station_code: 'LDH', station_name: 'Ludhiana Junction', distance: 1278, scheduled_arrival: '09:40', actual_arrival: null, scheduled_departure: '09:50', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 25, station_code: 'JRC', station_name: 'Jalandhar Cantt Junction', distance: 1330, scheduled_arrival: '10:45', actual_arrival: null, scheduled_departure: '10:50', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 26, station_code: 'PTKC', station_name: 'Pathankot Cantt', distance: 1443, scheduled_arrival: '12:35', actual_arrival: null, scheduled_departure: '12:40', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 27, station_code: 'KTHU', station_name: 'Kathua', distance: 1466, scheduled_arrival: '13:08', actual_arrival: null, scheduled_departure: '13:10', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 28, station_code: 'JAT', station_name: 'Jammu Tawi', distance: 1542, scheduled_arrival: '14:35', actual_arrival: null, scheduled_departure: '14:45', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 29, station_code: 'MCTM', station_name: 'MCTM Udhampur', distance: 1595, scheduled_arrival: '15:48', actual_arrival: null, scheduled_departure: '15:50', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 30, station_code: 'SVDK', station_name: 'Shri Mata Vaishno Devi Katra', distance: 1620, scheduled_arrival: '16:40', actual_arrival: null, scheduled_departure: '16:40', actual_departure: null, delay_minutes: null, status: 'upcoming' }
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
      station_sequence: 12,
      status: 'IN_TRANSIT',
      delay_minutes: 18,
      speed_kmph: 95,
      distance_from_origin_km: 924,
      distance_remaining_km: 896,
      is_halt: true,
      running_status: 'Halted at Kota Junction on Platform 1'
    },
    stations: [
      { sequence: 1, station_code: 'MMCT', station_name: 'Mumbai Central', distance: 0, scheduled_arrival: '11:25', actual_arrival: '11:25', scheduled_departure: '11:25', actual_departure: '11:25', delay_minutes: 0, status: 'passed' },
      { sequence: 2, station_code: 'BVI', station_name: 'Borivali', distance: 30, scheduled_arrival: '11:55', actual_arrival: '11:58', scheduled_departure: '11:58', actual_departure: '12:01', delay_minutes: 3, status: 'passed' },
      { sequence: 3, station_code: 'VAPI', station_name: 'Vapi', distance: 168, scheduled_arrival: '13:27', actual_arrival: '13:35', scheduled_departure: '13:29', actual_departure: '13:37', delay_minutes: 8, status: 'passed' },
      { sequence: 4, station_code: 'BL', station_name: 'Valsad', distance: 194, scheduled_arrival: '13:51', actual_arrival: '14:02', scheduled_departure: '13:53', actual_departure: '14:04', delay_minutes: 11, status: 'passed' },
      { sequence: 5, station_code: 'ST', station_name: 'Surat', distance: 263, scheduled_arrival: '14:48', actual_arrival: '15:02', scheduled_departure: '14:53', actual_departure: '15:08', delay_minutes: 15, status: 'passed' },
      { sequence: 6, station_code: 'BRC', station_name: 'Vadodara Junction', distance: 393, scheduled_arrival: '16:28', actual_arrival: '16:45', scheduled_departure: '16:38', actual_departure: '16:55', delay_minutes: 17, status: 'passed' },
      { sequence: 7, station_code: 'RTM', station_name: 'Ratlam Junction', distance: 654, scheduled_arrival: '20:15', actual_arrival: '20:35', scheduled_departure: '20:25', actual_departure: '20:45', delay_minutes: 20, status: 'passed' },
      { sequence: 8, station_code: 'NAD', station_name: 'Nagda Junction', distance: 695, scheduled_arrival: '21:12', actual_arrival: '21:30', scheduled_departure: '21:17', actual_departure: '21:35', delay_minutes: 18, status: 'passed' },
      { sequence: 9, station_code: 'KOTA', station_name: 'Kota Junction', distance: 920, scheduled_arrival: '00:05', actual_arrival: '00:23', scheduled_departure: '00:15', actual_departure: null, delay_minutes: 18, status: 'current' },
      { sequence: 10, station_code: 'SWM', station_name: 'Sawai Madhopur Junction', distance: 1028, scheduled_arrival: '01:33', actual_arrival: null, scheduled_departure: '01:35', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 11, station_code: 'BTE', station_name: 'Bharatpur Junction', distance: 1211, scheduled_arrival: '03:48', actual_arrival: null, scheduled_departure: '03:50', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 12, station_code: 'MTJ', station_name: 'Mathura Junction', distance: 1245, scheduled_arrival: '04:35', actual_arrival: null, scheduled_departure: '04:40', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 13, station_code: 'NZM', station_name: 'Hazrat Nizamuddin', distance: 1379, scheduled_arrival: '06:40', actual_arrival: null, scheduled_departure: '06:55', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 14, station_code: 'NDLS', station_name: 'New Delhi', distance: 1386, scheduled_arrival: '07:25', actual_arrival: null, scheduled_departure: '07:40', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 15, station_code: 'PNP', station_name: 'Panipat Junction', distance: 1476, scheduled_arrival: '08:50', actual_arrival: null, scheduled_departure: '08:52', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 16, station_code: 'UMB', station_name: 'Ambala Cantt Junction', distance: 1585, scheduled_arrival: '10:40', actual_arrival: null, scheduled_departure: '10:50', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 17, station_code: 'LDH', station_name: 'Ludhiana Junction', distance: 1699, scheduled_arrival: '12:25', actual_arrival: null, scheduled_departure: '12:35', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 18, station_code: 'JUC', station_name: 'Jalandhar City Junction', distance: 1756, scheduled_arrival: '13:30', actual_arrival: null, scheduled_departure: '13:35', actual_departure: null, delay_minutes: null, status: 'upcoming' },
      { sequence: 19, station_code: 'ASR', station_name: 'Amritsar Junction', distance: 1820, scheduled_arrival: '14:55', actual_arrival: null, scheduled_departure: '14:55', actual_departure: null, delay_minutes: null, status: 'upcoming' }
    ]
  }
};

/**
 * Calculates a dynamic ETA between current position and target station based on speed, distance, and delay
 */
export function calculateLocalPrediction(trainData, targetStationCode) {
  if (!trainData || !trainData.stations) return null;
  
  const stations = trainData.stations;
  const currentStation = trainData.current_status || stations.find(s => s.status === 'current') || stations[Math.floor(stations.length / 2)];
  
  const currentIdx = stations.findIndex(s => s.station_code === (currentStation.station_code || currentStation.stationCode));
  const targetIdx = stations.findIndex(s => s.station_code === targetStationCode);
  
  if (currentIdx === -1 || targetIdx === -1 || targetIdx <= currentIdx) {
    return null;
  }
  
  const currStn = stations[currentIdx];
  const tgtStn = stations[targetIdx];
  
  const currentDist = currStn.distance || currentStation.distance_from_origin_km || 0;
  const targetDist = tgtStn.distance || 0;
  const distanceRemaining = Math.max(0, targetDist - currentDist);
  const stationsRemaining = targetIdx - currentIdx;
  
  const speed = currentStation.speed_kmph || 75;
  const travelTimeHours = distanceRemaining / speed;
  const travelTimeMinutes = Math.round(travelTimeHours * 60);
  
  const currentDelay = Number(currentStation.delay_minutes || 0);
  // Expected delay at target (considering buffer recovery or minor progression)
  const estimatedDelayMinutes = Math.max(0, Math.round(currentDelay * 0.95));
  
  const estimatedArrivalDate = new Date(Date.now() + travelTimeMinutes * 60000);
  
  return {
    train_number: trainData.train_number,
    journey_date: trainData.journey_date,
    current_station: {
      code: currStn.station_code,
      name: currStn.station_name,
      sequence: currStn.sequence
    },
    target_station: {
      code: tgtStn.station_code,
      name: tgtStn.station_name,
      sequence: tgtStn.sequence
    },
    current_delay_minutes: currentDelay,
    current_speed_kmph: speed,
    distance_remaining_km: distanceRemaining,
    stations_remaining: stationsRemaining,
    estimated_arrival: estimatedArrivalDate.toISOString(),
    estimated_delay_minutes: estimatedDelayMinutes,
    scheduled_arrival: tgtStn.scheduled_arrival,
    confidence: speed > 60 ? 'high' : 'medium'
  };
}
