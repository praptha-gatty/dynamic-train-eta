import React, { useMemo } from 'react';
import { Radio, CalendarClock } from 'lucide-react';
import { formatDistance } from '../utils/formatters.js';

export function RouteProgressBar({
  stations = [],
  trainData = null,
  currentStationCode,
  targetStationCode,
  onSelectStation
}) {
  if (!stations || stations.length === 0) return null;

  const isYetToStart = trainData?.running_status === 'YET_TO_START' ||
    trainData?.current_status?.status === 'SCHEDULED' ||
    Boolean(trainData?.journey_date && trainData.journey_date > new Date().toISOString().split('T')[0]);

  const currentIdx = useMemo(() => {
    if (isYetToStart) return 0;
    if (!currentStationCode) return 0;
    const clean = String(currentStationCode).trim().toUpperCase();
    const idx = stations.findIndex(s => String(s.station_code).trim().toUpperCase() === clean);
    return idx >= 0 ? idx : 0;
  }, [stations, currentStationCode, isYetToStart]);

  const origin = stations[0] || {};
  const destination = stations[stations.length - 1] || {};
  const currentStation = isYetToStart ? origin : (stations[currentIdx] || origin);

  const totalStations = stations.length;
  const progressPercent = isYetToStart
    ? 0
    : totalStations > 1
      ? Math.min(100, Math.max(0, Math.round((currentIdx / (totalStations - 1)) * 100)))
      : 100;

  return (
    <div className="route-progress-container">
      <div className="route-progress-header">
        <div className="progress-title-block">
          <span className="route-progress-title">Journey Path Progress</span>
          <span className="progress-station-counts">
            {isYetToStart ? `0 of ${totalStations} stations covered (Scheduled Run)` : `${currentIdx + 1} of ${totalStations} stations covered`}
          </span>
        </div>
        <span className="route-progress-percent">
          {isYetToStart ? '0% (Awaiting Departure)' : `${progressPercent}% Completed`}
        </span>
      </div>

      {/* Clean responsive continuous progress track with zero circle overflow */}
      <div className="journey-progress-track-wrapper">
        <div className="journey-progress-track">
          <div
            className="journey-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
          {/* Live Train Floating Pulse Indicator on Track */}
          <div
            className="journey-train-thumb"
            style={{ left: `calc(${progressPercent}% - 8px)` }}
            title={isYetToStart ? `Origin: ${origin.station_name}` : `Current: ${currentStation.station_name || currentStation.station_code}`}
          >
            <span className="thumb-pulse" />
            <span className="thumb-dot" />
          </div>
        </div>
      </div>

      {/* 3-Point Responsive Milestone Labels: Origin (Left), Current (Center), Terminus (Right) */}
      <div className="journey-milestones-row">
        {/* Origin milestone */}
        <div className="milestone-point origin">
          <div className="milestone-indicator">
            <span className="milestone-dot origin-dot" />
            <span className="milestone-tag">ORIGIN</span>
          </div>
          <strong className="milestone-code">{origin.station_code || 'START'}</strong>
          <span className="milestone-name">{origin.station_name || 'Origin Station'}</span>
        </div>

        {/* Current milestone */}
        <div className="milestone-point current">
          <div className="milestone-indicator">
            {isYetToStart ? (
              <CalendarClock size={12} className="live-pulse-icon" style={{ color: '#38bdf8' }} />
            ) : (
              <Radio size={12} className="live-pulse-icon" />
            )}
            <span className={`milestone-tag ${isYetToStart ? 'scheduled-tag' : 'live-tag'}`}>
              {isYetToStart ? 'SCHEDULED DEPARTURE' : 'LIVE POSITION'}
            </span>
          </div>
          <strong className="milestone-code live-code">
            {currentStation.station_code || 'EN ROUTE'}
          </strong>
          <span className="milestone-name">
            {isYetToStart ? `Departs ${origin.scheduled_departure || '06:00'}` : (currentStation.station_name || 'In Transit')}
          </span>
        </div>

        {/* Terminus milestone */}
        <div className="milestone-point destination">
          <div className="milestone-indicator align-end">
            <span className="milestone-tag">TERMINUS</span>
            <span className="milestone-dot dest-dot" />
          </div>
          <strong className="milestone-code">{destination.station_code || 'END'}</strong>
          <span className="milestone-name">{destination.station_name || 'Destination Station'}</span>
        </div>
      </div>
    </div>
  );
}

export const JourneyProgressBar = RouteProgressBar;
export default RouteProgressBar;
