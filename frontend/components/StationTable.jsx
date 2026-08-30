import React, { useState, useMemo } from 'react';
import { Search, CheckCircle, Radio, Target } from 'lucide-react';
import { formatTime, formatDelay, formatDistance } from '../utils/formatters.js';

export function StationTable({
  stations = [],
  currentStationCode,
  targetStationCode,
  onSelectTargetStation
}) {
  const [filterQuery, setFilterQuery] = useState('');

  const filteredStations = useMemo(() => {
    if (!filterQuery.trim()) return stations;
    const q = filterQuery.toLowerCase();
    return stations.filter(s =>
      (s.station_code && s.station_code.toLowerCase().includes(q)) ||
      (s.station_name && s.station_name.toLowerCase().includes(q))
    );
  }, [stations, filterQuery]);

  const currentIdx = useMemo(() => {
    if (!currentStationCode) return 0;
    const clean = String(currentStationCode).trim().toUpperCase();
    const idx = stations.findIndex(s => String(s.station_code).trim().toUpperCase() === clean);
    return idx >= 0 ? idx : 0;
  }, [stations, currentStationCode]);

  const currentStation = stations[currentIdx] || {};
  const currentDelay = Number(currentStation.delay_minutes || 0);

  return (
    <div className="panel station-table-panel">
      <div className="table-header-toolbar">
        <div>
          <span className="panel-eyebrow">Route Telemetry</span>
          <h3 className="panel-title">Station-Wise ETA & Schedule</h3>
        </div>

        <div className="table-search-box">
          <Search size={14} className="t-search-icon" />
          <input
            type="text"
            placeholder="Filter stations..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            aria-label="Filter stations"
          />
        </div>
      </div>

      <div className="table-responsive-wrapper">
        <table className="station-data-table">
          <thead>
            <tr>
              <th className="col-seq">#</th>
              <th className="col-stn">Station</th>
              <th className="col-dist">Dist</th>
              <th className="col-time">Scheduled Arr / Dep</th>
              <th className="col-time">Actual / Predicted</th>
              <th className="col-delay">Delay</th>
              <th className="col-status">Status</th>
              <th className="col-action">Target</th>
            </tr>
          </thead>
          <tbody>
            {filteredStations.map((stn, idx) => {
              const stnCode = String(stn.station_code || '').trim().toUpperCase();
              const isCurrent = stnCode === String(currentStationCode || '').trim().toUpperCase();
              const isTarget = targetStationCode
                ? stnCode === String(targetStationCode).trim().toUpperCase()
                : idx === stations.length - 1;
              const originalIndex = stations.findIndex(s => s.station_code === stn.station_code);
              const isPassed = currentIdx >= 0 && originalIndex < currentIdx;
              const isUpcoming = !isPassed && !isCurrent;

              // Format Actual / Predicted without showing '--' for passed stations
              const actualOrPredictedTime =
                stn.actual_arrival ||
                stn.actual_departure ||
                stn.estimated_arrival ||
                stn.scheduled_arrival;

              // Formatted actual/predicted delay
              let delayDisplay = '--';
              let delayClass = 'muted';

              if (stn.delay_minutes != null) {
                const d = Number(stn.delay_minutes);
                if (d > 0) {
                  delayDisplay = `+${d}m`;
                  delayClass = 'delayed';
                } else if (d < 0) {
                  delayDisplay = `${d}m`;
                  delayClass = 'early';
                } else {
                  delayDisplay = 'On Time';
                  delayClass = 'on-time';
                }
              } else if (isPassed) {
                delayDisplay = 'On Time';
                delayClass = 'on-time';
              } else if (isCurrent) {
                delayDisplay = currentDelay > 0 ? `+${currentDelay}m` : currentDelay < 0 ? `${currentDelay}m` : 'On Time';
                delayClass = currentDelay > 0 ? 'delayed' : 'on-time';
              } else if (isUpcoming) {
                // Expected delay propagated from current delay
                delayDisplay = currentDelay > 0 ? `+${currentDelay}m (est)` : 'On Time';
                delayClass = currentDelay > 0 ? 'delayed' : 'on-time';
              }

              return (
                <tr
                  key={`${stn.station_code}-${stn.sequence || idx}`}
                  className={`station-row ${isCurrent ? 'row-current' : ''} ${isTarget ? 'row-target' : ''} ${isPassed ? 'row-passed' : ''}`}
                >
                  <td className="col-seq">
                    <span className="seq-number">{stn.sequence || idx + 1}</span>
                  </td>

                  <td className="col-stn">
                    <div className="station-identity">
                      <strong className="stn-name">{stn.station_name || stn.station_code}</strong>
                      <span className="stn-code">{stn.station_code}</span>
                    </div>
                  </td>

                  <td className="col-dist">
                    <span className="dist-text">{formatDistance(stn.distance || stn.distance_from_source_km)}</span>
                  </td>

                  <td className="col-time">
                    <div className="time-stack">
                      <span className="arr-time">Arr: {formatTime(stn.scheduled_arrival || stn.scheduled_departure)}</span>
                      <span className="dep-time">Dep: {formatTime(stn.scheduled_departure || stn.scheduled_arrival)}</span>
                    </div>
                  </td>

                  <td className="col-time">
                    <div className="time-stack highlighted">
                      <span className="actual-arr">
                        {actualOrPredictedTime ? formatTime(actualOrPredictedTime) : '--'}
                      </span>
                      {stn.actual_departure && (
                        <span className="actual-dep">Dep: {formatTime(stn.actual_departure)}</span>
                      )}
                    </div>
                  </td>

                  <td className="col-delay">
                    <span className={`delay-pill ${delayClass}`}>
                      {delayDisplay}
                    </span>
                  </td>

                  <td className="col-status">
                    {isCurrent ? (
                      <span className="status-tag-pill current">
                        <Radio size={11} className="pulse-icon" /> Live
                      </span>
                    ) : isTarget ? (
                      <span className="status-tag-pill target">
                        <Target size={11} /> Target
                      </span>
                    ) : isPassed ? (
                      <span className="status-tag-pill passed">
                        <CheckCircle size={11} /> Passed
                      </span>
                    ) : (
                      <span className="status-tag-pill upcoming">Upcoming</span>
                    )}
                  </td>

                  <td className="col-action">
                    {isUpcoming || isTarget ? (
                      <button
                        type="button"
                        className={`set-target-btn ${isTarget ? 'active' : ''}`}
                        onClick={() => onSelectTargetStation(stn.station_code)}
                        title="Set as Target Destination for Dynamic ETA"
                      >
                        {isTarget ? 'Active' : 'Set Target'}
                      </button>
                    ) : (
                      <span className="action-na">--</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const StationScheduleTable = StationTable;
export default StationTable;
