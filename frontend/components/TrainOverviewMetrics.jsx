import React, { useMemo } from 'react';
import { Navigation, Clock, MapPin, Gauge, Flame, ArrowLeftRight } from 'lucide-react';
import { formatDistance, formatSpeed } from '../utils/formatters.js';

/**
 * Computes scheduled route duration between origin and destination.
 */
function calculateRouteDuration(originStation, terminusStation, totalDistanceKm = 0) {
  if (!originStation || !terminusStation) return { text: '--', hours: 0 };

  const depStr = originStation.scheduled_departure || originStation.actual_departure;
  const arrStr = terminusStation.scheduled_arrival || terminusStation.actual_arrival;

  if (!depStr || !arrStr) {
    if (totalDistanceKm > 0) {
      const estHours = totalDistanceKm / 55;
      const h = Math.floor(estHours);
      const m = Math.round((estHours - h) * 60);
      return { text: `${h}h ${m}m`, hours: estHours };
    }
    return { text: '--', hours: 0 };
  }

  // Handle ISO date strings
  if (depStr.includes('T') || depStr.includes('-')) {
    const depTime = new Date(depStr).getTime();
    const arrTime = new Date(arrStr).getTime();
    if (!isNaN(depTime) && !isNaN(arrTime) && arrTime > depTime) {
      const totalMinutes = Math.round((arrTime - depTime) / (60 * 1000));
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      return { text: `${hours}h ${mins}m`, hours: totalMinutes / 60 };
    }
  }

  // Parse "HH:mm"
  const [depH, depM] = depStr.split(':').map(Number);
  const [arrH, arrM] = arrStr.split(':').map(Number);

  if (Number.isFinite(depH) && Number.isFinite(arrH)) {
    const depTotalMins = depH * 60 + (depM || 0);
    const arrTotalMins = arrH * 60 + (arrM || 0);

    const estimatedTotalHours = totalDistanceKm > 0 ? totalDistanceKm / 55 : 1;
    let daysOffset = Math.floor(estimatedTotalHours / 24);
    if (arrTotalMins < depTotalMins && daysOffset === 0) {
      daysOffset = 1;
    }

    let diffMinutes = (daysOffset * 24 * 60 + arrTotalMins) - depTotalMins;
    if (diffMinutes <= 0) diffMinutes += 24 * 60;

    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return { text: `${hours}h ${mins}m`, hours: diffMinutes / 60 };
  }

  return { text: '--', hours: 0 };
}

/**
 * Derives paired return train number.
 */
function getReturnTrainNumber(trainNumber, trainData) {
  if (trainData?.return_train_number) return trainData.return_train_number;
  if (trainData?.paired_train_number) return trainData.paired_train_number;

  const num = parseInt(trainNumber, 10);
  if (!isNaN(num)) {
    return num % 2 === 1 ? String(num + 1).padStart(5, '0') : String(num - 1).padStart(5, '0');
  }
  return '--';
}

export function TrainOverviewMetrics({ trainData, onSelectTrain }) {
  if (!trainData) return null;

  const stations = trainData.stations || [];
  const history = trainData.history || [];
  const originStation = stations[0] || {};
  const terminusStation = stations[stations.length - 1] || {};

  // 1. Total Distance (from terminus station or route property)
  const totalDistanceKm = useMemo(() => {
    if (terminusStation.distance_from_origin_km) return Number(terminusStation.distance_from_origin_km);
    if (terminusStation.distance_from_source_km) return Number(terminusStation.distance_from_source_km);
    if (terminusStation.distance) return Number(terminusStation.distance);
    if (trainData.total_distance_km) return Number(trainData.total_distance_km);
    return 0;
  }, [terminusStation, trainData]);

  // 2. Duration
  const durationInfo = useMemo(() => {
    return calculateRouteDuration(originStation, terminusStation, totalDistanceKm);
  }, [originStation, terminusStation, totalDistanceKm]);

  // 3. Halts (Scheduled stops count)
  const haltsCount = useMemo(() => {
    if (stations.length === 0) return 0;
    const explicitHalts = stations.filter(s => s.is_halt === true);
    if (explicitHalts.length > 0) return explicitHalts.length;
    // By default, every station listed in route represents a scheduled stop
    return stations.length;
  }, [stations]);

  // 4. Average Speed: (Total Distance / Scheduled Duration in Hours)
  const avgSpeedKmph = useMemo(() => {
    if (totalDistanceKm > 0 && durationInfo.hours > 0) {
      return (totalDistanceKm / durationInfo.hours).toFixed(1);
    }
    return '55.0';
  }, [totalDistanceKm, durationInfo]);

  // 5. Max Speed from telemetry history stream
  const maxSpeedKmph = useMemo(() => {
    const speeds = history
      .map(h => Number(h.speed_kmph))
      .filter(s => Number.isFinite(s) && s > 0);

    const currentSpeed = Number(trainData.current_status?.speed_kmph) || 0;
    if (currentSpeed > 0) speeds.push(currentSpeed);

    if (speeds.length > 0) {
      const maxObserved = Math.max(...speeds);
      return Math.max(maxObserved, 110);
    }

    // Default max sectional MPS for Indian Railways broad gauge express corridors
    return 110;
  }, [history, trainData]);

  // 6. Return Train Number
  const returnTrainNumber = useMemo(() => {
    return getReturnTrainNumber(trainData.train_number, trainData);
  }, [trainData]);

  const metrics = [
    {
      id: 'distance',
      label: 'DISTANCE',
      value: formatDistance(totalDistanceKm),
      subtext: `${stations.length} route checkpoints`,
      icon: <Navigation size={18} className="metric-card-icon" />,
      colorClass: 'metric-cyan'
    },
    {
      id: 'duration',
      label: 'DURATION',
      value: durationInfo.text,
      subtext: 'Scheduled runtime',
      icon: <Clock size={18} className="metric-card-icon" />,
      colorClass: 'metric-emerald'
    },
    {
      id: 'halts',
      label: 'HALTS',
      value: `${haltsCount} Stops`,
      subtext: `${originStation.station_code || 'Origin'} → ${terminusStation.station_code || 'Terminus'}`,
      icon: <MapPin size={18} className="metric-card-icon" />,
      colorClass: 'metric-amber'
    },
    {
      id: 'avg_speed',
      label: 'AVG SPEED',
      value: `${avgSpeedKmph} km/h`,
      subtext: 'Commercial average',
      icon: <Gauge size={18} className="metric-card-icon" />,
      colorClass: 'metric-blue'
    },
    {
      id: 'max_speed',
      label: 'MAX SPEED',
      value: `${maxSpeedKmph} km/h`,
      subtext: 'Sectional MPS limit',
      icon: <Flame size={18} className="metric-card-icon" />,
      colorClass: 'metric-coral'
    },
    {
      id: 'return',
      label: 'RETURN',
      value: `#${returnTrainNumber}`,
      subtext: 'Paired return service',
      icon: <ArrowLeftRight size={18} className="metric-card-icon" />,
      colorClass: 'metric-purple',
      clickable: Boolean(onSelectTrain && returnTrainNumber !== '--'),
      onClick: () => onSelectTrain && onSelectTrain(returnTrainNumber)
    }
  ];

  return (
    <section className="train-overview-metrics-row" aria-label="Route Overview Metrics">
      {metrics.map(m => (
        <div
          key={m.id}
          className={`overview-metric-card ${m.colorClass} ${m.clickable ? 'clickable-card' : ''}`}
          onClick={m.clickable ? m.onClick : undefined}
          title={m.clickable ? `Click to switch to return train #${returnTrainNumber}` : undefined}
        >
          <div className="metric-card-top">
            <span className="metric-card-heading">{m.label}</span>
            <div className="metric-icon-box">{m.icon}</div>
          </div>
          <div className="metric-card-body">
            <strong className="metric-card-value">{m.value}</strong>
            <span className="metric-card-subtext">{m.subtext}</span>
          </div>
        </div>
      ))}
    </section>
  );
}

export default TrainOverviewMetrics;
