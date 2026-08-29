import React from 'react';
import { ArrowRight, MapPin, Radio, Calendar, History } from 'lucide-react';
import { formatTime, formatDate, formatDistance } from '../utils/formatters.js';
import { StatusBadge } from './StatusBadge.jsx';

export function TrainStatusCard({ trainData }) {
  if (!trainData) return null;

  const current = trainData.current_status || {};
  const stations = trainData.stations || [];
  const origin = stations[0] || {};
  const destination = stations[stations.length - 1] || {};

  return (
    <article className="train-status-card">
      <div className="status-card-top">
        <div className="train-meta-pill">
          <span className="pill-badge">TRAIN</span>
          <span className="train-no">{trainData.train_number}</span>
        </div>
        <StatusBadge status={current.status} delayMinutes={current.delay_minutes} />
      </div>

      <div className="train-name-block">
        <h3 className="train-title">{trainData.train_name || `Train ${trainData.train_number}`}</h3>
        <p className="train-running-summary">
          <Radio size={14} className="live-pulse-icon" />
          <span>{current.running_status || `Near ${current.station_name || 'En Route'}`}</span>
        </p>
      </div>

      {/* Origin -> Destination Visual Line */}
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

      {/* Live Location Detail Box */}
      <div className="current-location-box">
        <div className="location-item">
          <span className="loc-label">Current Position</span>
          <strong className="loc-value">
            {current.station_name || current.station_code || 'In Transit'}
            {current.station_code && <span className="stn-code-badge">{current.station_code}</span>}
          </strong>
        </div>
        <div className="location-item align-right">
          <span className="loc-label">Distance Traveled</span>
          <strong className="loc-value">{formatDistance(current.distance_from_origin_km)}</strong>
        </div>
      </div>

      <div className="status-card-footer">
        <span className="footer-stat">
          <Calendar size={12} /> {formatDate(trainData.journey_date)}
        </span>
        <span className="footer-stat">
          <History size={12} /> Captured {formatTime(trainData.captured_at)}
        </span>
      </div>
    </article>
  );
}
