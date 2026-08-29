import React from 'react';
import { Clock, MapPin, Gauge, Navigation, Sparkles, AlertCircle, ShieldCheck } from 'lucide-react';
import { formatTime, formatDelay, formatDistance, formatSpeed } from '../utils/formatters.js';

export function EtaPredictionCard({
  trainData,
  selectedTargetCode,
  onTargetChange,
  etaLoading
}) {
  if (!trainData) return null;

  const stations = trainData.stations || [];
  const currentStn = trainData.current_status || {};
  const currentSeq = currentStn.station_sequence || 1;
  const prediction = trainData.prediction;

  // Filter stations for target selector (upcoming stations preferred, or all after origin)
  const targetOptions = stations.filter(s => s.sequence >= 1);
  const selectedTarget = stations.find(s => s.station_code === selectedTargetCode) || stations[stations.length - 1];

  const estimatedTime = prediction?.estimated_arrival ? formatTime(prediction.estimated_arrival) : (selectedTarget?.actual_arrival ? formatTime(selectedTarget.actual_arrival) : '--');
  const scheduledTime = selectedTarget?.scheduled_arrival ? formatTime(selectedTarget.scheduled_arrival) : (prediction?.scheduled_arrival ? formatTime(prediction.scheduled_arrival) : '--');

  const delayInfo = formatDelay(prediction?.estimated_delay_minutes ?? currentStn.delay_minutes);
  const distanceRemaining = prediction?.distance_remaining_km ?? currentStn.distance_remaining_km;
  const stationsRemaining = prediction?.stations_remaining ?? Math.max(0, (selectedTarget?.sequence || 0) - currentSeq);
  const confidence = prediction?.confidence || (currentStn.speed_kmph > 60 ? 'high' : 'medium');

  return (
    <article className="eta-prediction-card">
      <div className="card-header">
        <div className="header-badge-group">
          <span className="ai-tag">
            <Sparkles size={13} className="spark-icon" /> DYNAMIC ETA
          </span>
          <span className={`confidence-badge ${confidence}`}>
            <ShieldCheck size={12} /> {confidence.toUpperCase()} CONFIDENCE
          </span>
        </div>

        {/* Target station dropdown */}
        <div className="target-station-picker">
          <label htmlFor="target-select">
            <MapPin size={13} /> Destination / Target:
          </label>
          <select
            id="target-select"
            value={selectedTargetCode || selectedTarget?.station_code || ''}
            onChange={(e) => onTargetChange(e.target.value)}
            disabled={etaLoading}
            className="target-select-dropdown"
          >
            {targetOptions.map((stn) => (
              <option key={`${stn.station_code}-${stn.sequence}`} value={stn.station_code}>
                {stn.station_name} ({stn.station_code}) - {stn.distance ? `${stn.distance} km` : 'Stop'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="eta-main-content">
        <div className="eta-primary-display">
          <span className="eta-caption">Predicted Arrival Time</span>
          <div className="eta-time-row">
            <h2 className="eta-time-value">{estimatedTime}</h2>
            {etaLoading && <span className="eta-recalc-badge">Updating...</span>}
          </div>
          <p className="eta-target-summary">
            At <strong>{selectedTarget?.station_name || selectedTargetCode}</strong> ({selectedTarget?.station_code || '--'})
          </p>
        </div>

        <div className="eta-comparison-block">
          <div className="compare-item">
            <span className="compare-label">Scheduled Time</span>
            <span className="compare-val scheduled">{scheduledTime}</span>
          </div>
          <div className="compare-divider" />
          <div className="compare-item">
            <span className="compare-label">Expected Delay</span>
            <span className={`compare-val delay ${delayInfo.statusClass}`}>
              {delayInfo.text}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic ETA Telemetry Grid */}
      <div className="eta-telemetry-grid">
        <div className="telemetry-box">
          <div className="telemetry-icon-wrapper">
            <Navigation size={16} />
          </div>
          <div>
            <span className="telemetry-title">Remaining Distance</span>
            <strong className="telemetry-metric">{formatDistance(distanceRemaining)}</strong>
          </div>
        </div>

        <div className="telemetry-box">
          <div className="telemetry-icon-wrapper">
            <Clock size={16} />
          </div>
          <div>
            <span className="telemetry-title">Stations Remaining</span>
            <strong className="telemetry-metric">{stationsRemaining} stops</strong>
          </div>
        </div>

        <div className="telemetry-box">
          <div className="telemetry-icon-wrapper">
            <Gauge size={16} />
          </div>
          <div>
            <span className="telemetry-title">Current Speed</span>
            <strong className="telemetry-metric">{formatSpeed(currentStn.speed_kmph)}</strong>
          </div>
        </div>
      </div>

      <div className="eta-disclaimer-footer">
        <AlertCircle size={13} className="disclaimer-icon" />
        <span>
          ETA is dynamically computed using live telemetry, current track speed ({formatSpeed(currentStn.speed_kmph)}), and historical delay progression.
        </span>
      </div>
    </article>
  );
}
