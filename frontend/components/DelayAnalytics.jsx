import React from 'react';
import { AlertTriangle, Gauge, TrendingDown, TrendingUp, Info } from 'lucide-react';
import { formatDelay, formatSpeed, formatDistance } from '../utils/formatters.js';

export function DelayAnalytics({ trainData }) {
  if (!trainData) return null;

  const current = trainData.current_status || {};
  const delayMinutes = current.delay_minutes || 0;
  const speed = current.speed_kmph || 0;
  const delayInfo = formatDelay(delayMinutes);

  // Speed bar normalization (max 130 km/h)
  const speedBarWidth = Math.min(100, Math.max(0, (speed / 130) * 100));
  // Delay bar normalization (max 120 mins)
  const delayBarWidth = Math.min(100, Math.max(0, (delayMinutes / 120) * 100));

  return (
    <div className="delay-analytics-container">
      {/* Recorded Delay Card */}
      <article className="panel delay-stat-panel">
        <div className="panel-heading">
          <span className="panel-eyebrow">Delay Telemetry</span>
          <AlertTriangle size={16} className={`delay-alert-icon ${delayMinutes > 0 ? 'delayed' : 'on-time'}`} />
        </div>

        <div className="delay-stat-body">
          <div className="delay-numeric-row">
            <span className="delay-huge-number">{Math.abs(delayMinutes)}</span>
            <div className="delay-unit-col">
              <span className="delay-unit">MINS</span>
              <span className={`delay-sub-text ${delayInfo.statusClass}`}>
                {delayMinutes > 0 ? 'LATE' : delayMinutes < 0 ? 'EARLY' : 'ON TIME'}
              </span>
            </div>
          </div>
          <p className="delay-station-recorded">
            Observed at <strong>{current.station_name || current.station_code || 'Current Section'}</strong>
          </p>
        </div>

        <div className="delay-progress-bar-wrap">
          <div className="factor-label-row">
            <span>Delay Severity</span>
            <strong>{delayMinutes > 45 ? 'High' : delayMinutes > 15 ? 'Moderate' : 'Low / Normal'}</strong>
          </div>
          <div className="bar-track">
            <div className={`bar-fill delay-fill ${delayMinutes > 30 ? 'red' : 'amber'}`} style={{ width: `${delayBarWidth}%` }} />
          </div>
        </div>
      </article>

      {/* Speed & Delay Context Panel */}
      <article className="panel context-panel">
        <div className="panel-heading">
          <span className="panel-eyebrow">Real-Time Dynamics</span>
          <Gauge size={16} className="gauge-icon" />
        </div>

        <div className="context-metrics-grid">
          <div className="context-metric">
            <span className="c-label">Section Speed</span>
            <strong className="c-value">{formatSpeed(speed)}</strong>
            <div className="bar-track speed-track">
              <div className="bar-fill speed-fill" style={{ width: `${speedBarWidth}%` }} />
            </div>
          </div>

          <div className="context-metric">
            <span className="c-label">Distance from Origin</span>
            <strong className="c-value">{formatDistance(current.distance_from_origin_km)}</strong>
          </div>
        </div>

        <div className="explanation-bubble">
          <Info size={14} className="info-icon" />
          <p>
            {delayMinutes === 0
              ? 'Train is operating on scheduled time with normal section speeds.'
              : delayMinutes > 0
              ? `Currently running ${delayMinutes} minutes behind schedule. Dynamic ETA factors in current speed (${formatSpeed(speed)}) for expected arrival times.`
              : `Running ${Math.abs(delayMinutes)} minutes ahead of scheduled time.`}
          </p>
        </div>
      </article>
    </div>
  );
}
