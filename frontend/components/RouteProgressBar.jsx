import React from 'react';

export function RouteProgressBar({ stations, currentStationCode, targetStationCode, onSelectStation }) {
  if (!stations || stations.length === 0) return null;

  const currentIdx = stations.findIndex(s => s.station_code === currentStationCode);
  const targetIdx = stations.findIndex(s => s.station_code === targetStationCode);
  
  const totalStations = stations.length;
  const progressPercent = currentIdx >= 0 ? Math.min(100, Math.round(((currentIdx + 1) / totalStations) * 100)) : 0;

  return (
    <div className="route-progress-container">
      <div className="route-progress-header">
        <span className="route-progress-title">Journey Path Progress</span>
        <span className="route-progress-percent">{progressPercent}% Completed</span>
      </div>

      <div className="route-progress-track">
        <div className="progress-fill-bar" style={{ width: `${progressPercent}%` }} />
        
        {/* Sample stations along the track */}
        <div className="progress-stations-row">
          {stations.map((stn, idx) => {
            const isOrigin = idx === 0;
            const isDest = idx === totalStations - 1;
            const isCurrent = stn.station_code === currentStationCode;
            const isTarget = stn.station_code === targetStationCode;
            const isPassed = currentIdx >= 0 && idx < currentIdx;

            // Only show major nodes if too many stations to avoid crowding
            const isKeyNode = isOrigin || isDest || isCurrent || isTarget || idx % Math.ceil(totalStations / 6) === 0;

            return (
              <button
                key={`${stn.station_code}-${idx}`}
                type="button"
                className={`progress-node ${isPassed ? 'passed' : ''} ${isCurrent ? 'current' : ''} ${isTarget ? 'target' : ''} ${isKeyNode ? 'visible' : 'minor'}`}
                onClick={() => onSelectStation && onSelectStation(stn.station_code)}
                title={`${stn.station_name} (${stn.station_code}) - Click to set as Target ETA`}
              >
                <span className="node-marker" />
                <span className="node-label">
                  <strong className="node-code">{stn.station_code}</strong>
                  {isCurrent && <span className="node-tag">Live</span>}
                  {isTarget && <span className="node-tag target-tag">Target</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
