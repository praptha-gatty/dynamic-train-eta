import React from 'react';
import { Clock, MapPin, Gauge, Navigation, AlertCircle, PauseCircle, CalendarClock } from 'lucide-react';
import { formatTime, formatDelay, formatDistance, formatSpeed } from '../utils/formatters.js';
import { getZeroSpeedHaltReason } from '../utils/haltReasons.js';

export function EtaPredictionCard({
  trainData,
  selectedTargetCode,
  onTargetChange,
  etaLoading
}) {
  if (!trainData) return null;

  const isYetToStart = trainData.running_status === 'YET_TO_START' ||
    trainData.current_status?.status === 'SCHEDULED' ||
    Boolean(trainData.journey_date && trainData.journey_date > new Date().toISOString().split('T')[0]);

  const stations = trainData.stations || [];
  const currentStn = trainData.current_status || {};
  const currentSeq = currentStn.station_sequence || 1;
  const prediction = trainData.prediction;

  const targetOptions = stations.filter(s => s.sequence >= 1);
  const selectedTarget = stations.find(s => s.station_code === selectedTargetCode) || stations[stations.length - 1];

  const estimatedTime = prediction?.estimated_arrival
    ? formatTime(prediction.estimated_arrival)
    : (selectedTarget?.actual_arrival ? formatTime(selectedTarget.actual_arrival) : (selectedTarget?.scheduled_arrival ? formatTime(selectedTarget.scheduled_arrival) : '--'));

  const scheduledTime = selectedTarget?.scheduled_arrival
    ? formatTime(selectedTarget.scheduled_arrival)
    : (prediction?.scheduled_arrival ? formatTime(prediction.scheduled_arrival) : '--');

  const delayMinutes = isYetToStart ? 0 : Number(prediction?.predicted_delay_minutes ?? prediction?.estimated_delay_minutes ?? currentStn.delay_minutes ?? 0);
  const delayInfo = isYetToStart
    ? { text: 'On Time (Scheduled)', statusClass: 'on-time' }
    : formatDelay(delayMinutes);

  const distanceRemaining = prediction?.distance_remaining_km ?? currentStn.distance_remaining_km ?? (selectedTarget?.distance || 0);
  const stationsRemaining = isYetToStart
    ? stations.length
    : (prediction?.stations_remaining ?? Math.max(0, (selectedTarget?.sequence || 0) - currentSeq));

  const speed = isYetToStart ? 0 : (currentStn.speed_kmph ?? prediction?.effective_speed_kmph ?? 0);

  const zeroSpeedHaltReason = isYetToStart
    ? 'Awaiting Scheduled Departure'
    : getZeroSpeedHaltReason({
        speed,
        isHalt: currentStn.is_halt,
        stationName: currentStn.station_name,
        stationCode: currentStn.station_code
      });

  return (
    <article className="eta-prediction-card">
      {/* Clean Top Header: Eyebrow + Destination Target Selector */}
      <div className="card-header">
        <span className="clean-eyebrow">
          {isYetToStart ? 'TIMETABLE SCHEDULE' : 'DYNAMIC TRAIN ETA'}
        </span>

        {/* Target station picker */}
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
                {stn.station_name} ({stn.station_code}) - {stn.distance ? `${stn.distance} km` : 'Halt'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clean 2-Column Arrival Summary Block */}
      <div className="clean-arrival-grid">
        {/* Left Column: Big Arrival Time */}
        <div className="arrival-main-col">
          <span className="arrival-headline-label">
            {isYetToStart ? 'SCHEDULED DEPARTURE' : 'EXPECTED ARRIVAL'}
          </span>
          <div className="arrival-time-wrapper">
            <h2 className="arrival-big-time">{estimatedTime}</h2>
            {etaLoading && <span className="eta-recalc-pill">Recalculating...</span>}
          </div>
          <p className="arrival-target-location">
            At <strong>{selectedTarget?.station_name || selectedTargetCode}</strong> ({selectedTarget?.station_code || '--'})
          </p>
        </div>

        {/* Right Column: Timetable Comparison & Expected Delay Pill */}
        <div className="arrival-comparison-col">
          <div className="compare-mini-box">
            <span className="mini-box-label">Scheduled Time</span>
            <strong className="mini-box-val scheduled">{scheduledTime}</strong>
          </div>
          <div className="compare-mini-box">
            <span className="mini-box-label">Status / Delay</span>
            <strong className={`mini-box-val delay ${delayInfo.statusClass}`}>
              {isYetToStart ? 'On Time' : (delayMinutes > 0 ? `+${delayMinutes} min delay` : delayInfo.text)}
            </strong>
          </div>
        </div>
      </div>

      {/* Clean 3 Metric Tiles Grid */}
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
          <div className="telemetry-content-col">
            <span className="telemetry-title">Current Speed</span>
            <strong className="telemetry-metric">
              {isYetToStart ? '0 km/h (Awaiting Departure)' : formatSpeed(speed)}
            </strong>
            {zeroSpeedHaltReason && (
              <span className="speed-halt-subtext">
                <PauseCircle size={11} className="halt-icon" /> {zeroSpeedHaltReason}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="eta-disclaimer-footer">
        <AlertCircle size={13} className="disclaimer-icon" />
        <span>
          {isYetToStart
            ? `Train is scheduled for a future run on ${trainData.journey_date}. Official timetable schedule active.`
            : 'ETA dynamically computed using live speed, distance remaining, track classification, and cascading delay models.'}
        </span>
      </div>
    </article>
  );
}

export const DynamicETACard = EtaPredictionCard;
export default EtaPredictionCard;
