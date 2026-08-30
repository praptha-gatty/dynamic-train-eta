import React from 'react';
import { ArrowRight, MapPin, Radio, Calendar, History, CalendarClock, Compass, Activity, Navigation } from 'lucide-react';
import { formatTime, formatDate, formatDistance } from '../utils/formatters.js';
import { StatusBadge } from './StatusBadge.jsx';

export function TrainStatusCard({ trainData }) {
  if (!trainData) return null;

  const isYetToStart = trainData.running_status === 'YET_TO_START' ||
    trainData.current_status?.status === 'SCHEDULED' ||
    Boolean(trainData.journey_date && trainData.journey_date > new Date().toISOString().split('T')[0]);

  const current = trainData.current_status || {};
  const stations = trainData.stations || [];
  const origin = stations[0] || {};
  const destination = stations[stations.length - 1] || {};

  // Compute Next Halt & Distance to Next
  const nextHalt = React.useMemo(() => {
    if (isYetToStart) {
      const secondStn = stations[1] || stations[0];
      const dist = secondStn ? Math.max(0, (secondStn.distance || secondStn.distance_from_source_km || 0) - (origin.distance || origin.distance_from_source_km || 0)) : 0;
      return {
        name: secondStn?.station_name || secondStn?.station_code || 'Next Scheduled Stop',
        distance: dist
      };
    }
    const currentCode = (current.station_code || '').toUpperCase().trim();
    const currentIdx = stations.findIndex(s => (s.station_code || '').toUpperCase().trim() === currentCode);
    const nextStn = (currentIdx !== -1 && currentIdx < stations.length - 1) ? stations[currentIdx + 1] : stations[stations.length - 1];
    const currentDist = Number(current.distance_from_origin_km || current.distance_from_source_km || 0);
    const nextDist = Number(nextStn?.distance || nextStn?.distance_from_source_km || 0);
    const distanceToNext = Math.max(0, nextDist - currentDist);
    return {
      name: nextStn?.station_name || nextStn?.station_code || destination.station_name || 'Terminus',
      distance: distanceToNext
    };
  }, [stations, current, isYetToStart, origin, destination]);

  // Compute Corridor Punctuality Descriptor
  const punctualityText = React.useMemo(() => {
    const delay = Number(current.delay_minutes || 0);
    if (isYetToStart) return 'Scheduled Run';
    if (delay <= 5) return 'High Punctuality Run';
    if (delay <= 25) return 'Minor Delay Corridor';
    if (delay <= 60) return 'Moderate Delay Corridor';
    return 'Severe Delay Corridor';
  }, [current.delay_minutes, isYetToStart]);

  return (
    <article className="train-status-card">
      {/* Top Row: Train Badge (Left) + Delay Pill (Right) */}
      <div className="status-card-top">
        <div className="train-meta-pill">
          <span className="pill-badge">TRAIN</span>
          <span className="train-no">{trainData.train_number}</span>
        </div>
        <StatusBadge
          status={isYetToStart ? 'SCHEDULED' : current.status}
          delayMinutes={isYetToStart ? 0 : current.delay_minutes}
        />
      </div>

      {/* Train Name Title */}
      <div className="train-name-block">
        <h3 className="train-title">{trainData.train_name || `Train ${trainData.train_number}`}</h3>
        
        {/* Active Location Pill */}
        <div className="active-location-pill">
          <MapPin size={13} className="loc-pin-icon" />
          <span>
            {isYetToStart
              ? `Origin: ${origin.station_name || origin.station_code || 'Origin'} • Scheduled Departure`
              : `Currently passing ${current.station_name || current.station_code || 'En Route'} • Track Main Line`}
          </span>
        </div>
      </div>

      {/* Compact 2-Column Operational Sub-Card */}
      <div className="train-operational-grid">
        <div className="op-stat-box">
          <span className="op-stat-label">Next Halt</span>
          <strong className="op-stat-val" title={nextHalt.name}>
            {nextHalt.name} <span className="op-stat-sub">({nextHalt.distance} km)</span>
          </strong>
        </div>
        <div className="op-stat-box">
          <span className="op-stat-label">Today's Punctuality</span>
          <strong className="op-stat-val punctuality">
            {punctualityText}
          </strong>
        </div>
      </div>

      {/* Origin -> Destination Visual Track Strip */}
      <div className="journey-endpoints-bar">
        <div className="endpoint origin">
          <span className="station-code">{origin.station_code || trainData.origin_code || '--'}</span>
          <span className="station-city">{origin.station_name || trainData.origin_name || 'Origin'}</span>
        </div>

        <div className="endpoint-connector">
          <span className="connector-dot origin-dot" />
          <div className="connector-line">
            <div className="train-indicator-icon">🚆</div>
          </div>
          <span className="connector-dot dest-dot" />
        </div>

        <div className="endpoint destination">
          <span className="station-code">{destination.station_code || trainData.destination_code || '--'}</span>
          <span className="station-city">{destination.station_name || trainData.destination_name || 'Destination'}</span>
        </div>
      </div>

      {/* Current Position & Distance Traveled Detail Box */}
      <div className="current-location-box">
        <div className="location-item">
          <span className="loc-label">{isYetToStart ? 'Origin Departure' : 'Current Position'}</span>
          <strong className="loc-value">
            {isYetToStart ? (origin.station_name || origin.station_code || 'Origin') : (current.station_name || current.station_code || 'In Transit')}
            {(isYetToStart ? origin.station_code : current.station_code) && (
              <span className="stn-code-badge">{isYetToStart ? origin.station_code : current.station_code}</span>
            )}
          </strong>
        </div>
        <div className="location-item align-right">
          <span className="loc-label">Distance Traveled</span>
          <strong className="loc-value">
            {isYetToStart ? '0 km (Not Started)' : formatDistance(current.distance_from_origin_km || current.distance_from_source_km)}
          </strong>
        </div>
      </div>

      <div className="status-card-footer">
        <span className="footer-stat">
          <Calendar size={12} /> {formatDate(trainData.journey_date)}
        </span>
        <span className="footer-stat">
          <History size={12} /> {isYetToStart ? 'Timetable Schedule' : `Telemetry ${formatTime(trainData.captured_at)}`}
        </span>
      </div>
    </article>
  );
}

export default TrainStatusCard;
