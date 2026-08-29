import React, { useState, useMemo } from 'react';
import { Search, MapPin, CheckCircle, Radio, Clock, Target } from 'lucide-react';
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

  const currentIdx = stations.findIndex(s => s.station_code === currentStationCode);

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
              const isCurrent = stn.station_code === currentStationCode;
              const isTarget = stn.station_code === targetStationCode;
              const isPassed = currentIdx >= 0 && stn.sequence <= (stations[currentIdx]?.sequence || 0) && !isCurrent;
              const isUpcoming = !isPassed && !isCurrent;
              
              const delayInfo = formatDelay(stn.delay_minutes);

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
                    <span className="dist-text">{formatDistance(stn.distance)}</span>
                  </td>

                  <td className="col-time">
                    <div className="time-stack">
                      <span className="arr-time">Arr: {formatTime(stn.scheduled_arrival)}</span>
                      <span className="dep-time">Dep: {formatTime(stn.scheduled_departure)}</span>
                    </div>
                  </td>

                  <td className="col-time">
                    <div className="time-stack highlighted">
                      <span className="actual-arr">
                        {stn.actual_arrival ? formatTime(stn.actual_arrival) : (isUpcoming ? 'ETA computing' : '--')}
                      </span>
                      {stn.actual_departure && (
                        <span className="actual-dep">Dep: {formatTime(stn.actual_departure)}</span>
                      )}
                    </div>
                  </td>

                  <td className="col-delay">
                    {stn.delay_minutes != null ? (
                      <span className={`delay-pill ${delayInfo.statusClass}`}>
                        {delayInfo.minutes > 0 ? `+${delayInfo.minutes}m` : delayInfo.minutes === 0 ? 'RT' : `${delayInfo.minutes}m`}
                      </span>
                    ) : (
                      <span className="delay-pill muted">--</span>
                    )}
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
