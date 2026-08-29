import React from 'react';
import { Clock, CheckCircle2, Radio, MapPin } from 'lucide-react';
import { formatTime, formatDelay } from '../utils/formatters.js';

export function JourneyTimeline({ stations = [], currentStationCode }) {
  if (!stations || stations.length === 0) return null;

  const currentIdx = stations.findIndex(s => s.station_code === currentStationCode);
  
  // Show key sequence around current location (or last 8 stations)
  const displayStations = stations.slice(
    Math.max(0, currentIdx - 3),
    Math.min(stations.length, currentIdx + 5)
  );

  return (
    <div className="panel timeline-panel">
      <div className="panel-heading">
        <div>
          <span className="panel-eyebrow">Milestone Progress</span>
          <h3 className="panel-title">Journey Observation Timeline</h3>
        </div>
        <span className="timeline-badge">
          <Clock size={12} /> Active Telemetry Flow
        </span>
      </div>

      <div className="timeline-flow-list">
        {displayStations.map((stn, idx) => {
          const isCurrent = stn.station_code === currentStationCode;
          const isPassed = currentIdx >= 0 && stn.sequence < (stations[currentIdx]?.sequence || 0);
          const delayInfo = formatDelay(stn.delay_minutes);

          return (
            <div
              key={`timeline-${stn.station_code}-${idx}`}
              className={`timeline-step-card ${isCurrent ? 'active-step' : isPassed ? 'passed-step' : 'upcoming-step'}`}
            >
              <div className="step-marker-col">
                <div className="step-circle">
                  {isCurrent ? (
                    <Radio size={14} className="timeline-pulse" />
                  ) : isPassed ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <span className="step-bullet" />
                  )}
                </div>
                <div className="step-stem" />
              </div>

              <div className="step-content-card">
                <div className="step-top-row">
                  <span className="step-time">
                    {formatTime(stn.actual_arrival || stn.scheduled_arrival || stn.actual_departure)}
                  </span>
                  <span className={`step-delay ${delayInfo.statusClass}`}>
                    {stn.delay_minutes != null ? delayInfo.text : 'Scheduled'}
                  </span>
                </div>

                <h4 className="step-station-name">
                  {stn.station_name} <span className="step-code">({stn.station_code})</span>
                </h4>

                <p className="step-desc">
                  {isCurrent
                    ? 'Current train location / section observation.'
                    : isPassed
                    ? `Passed station on schedule.`
                    : `Upcoming milestone (${stn.distance ? `${stn.distance} km from origin` : 'En route'}).`}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
