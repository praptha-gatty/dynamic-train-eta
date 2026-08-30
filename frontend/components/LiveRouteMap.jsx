import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getStationCoords, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '../utils/stationCoords.js';
import { formatTime, formatDelay, formatDistance, formatSpeed } from '../utils/formatters.js';
import { MapPin, Radio, CalendarClock } from 'lucide-react';

// Fix Leaflet default marker asset resolution for bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

// Custom Red Glowing Train Marker
const createLiveTrainIcon = (delayMinutes = 0, isYetToStart = false) => {
  const isDelayed = Number(delayMinutes) > 15;
  const pinColor = isYetToStart ? '#38bdf8' : (isDelayed ? '#ef4444' : '#e26a4d');

  return L.divIcon({
    className: 'custom-train-marker',
    html: `
      <div class="train-pin-wrapper" style="--pin-color: ${pinColor};">
        <div class="train-pin-pulse"></div>
        <div class="train-pin-core">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="3" width="16" height="16" rx="2"></rect>
            <path d="M4 11h16"></path>
            <path d="M12 3v8"></path>
            <path d="m8 19-2 3"></path>
            <path d="m16 19 2 3"></path>
            <circle cx="8" cy="15" r="1" fill="white"></circle>
            <circle cx="16" cy="15" r="1" fill="white"></circle>
          </svg>
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });
};

/**
 * Controller to handle map invalidation, auto-fitting bounds, and pin centering
 */
function MapLifecycleController({ points, currentLat, currentLng, routeKey }) {
  const map = useMap();

  // Invalidate map size on mount and container resizing to prevent gray tile clipping
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (e) {}
    }, 150);

    const handleResize = () => {
      try {
        map.invalidateSize();
      } catch (e) {}
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  // Fit bounds to the full route polyline with [50, 50] padding whenever route or train changes
  useEffect(() => {
    if (Array.isArray(points) && points.length > 1) {
      try {
        map.fitBounds(points, {
          padding: [50, 50],
          maxZoom: 12,
          animate: true,
          duration: 0.8
        });
      } catch (e) {
        console.warn('Map fitBounds warning:', e);
      }
    } else if (Number.isFinite(currentLat) && Number.isFinite(currentLng)) {
      map.setView([currentLat, currentLng], 12);
    }
  }, [map, routeKey, points]);

  return null;
}

function isValidCoord(lat, lon) {
  const parsedLat = parseFloat(lat);
  const parsedLon = parseFloat(lon);
  return (
    Number.isFinite(parsedLat) &&
    Number.isFinite(parsedLon) &&
    Math.abs(parsedLat) <= 90 &&
    Math.abs(parsedLon) <= 180 &&
    (parsedLat !== 0 || parsedLon !== 0)
  );
}

export function LiveRouteMap({
  stations = [],
  trainData = null,
  currentStationCode,
  targetStationCode,
  liveLocation = null
}) {
  const isYetToStart = trainData?.running_status === 'YET_TO_START' ||
    trainData?.current_status?.status === 'SCHEDULED' ||
    Boolean(trainData?.journey_date && trainData.journey_date > new Date().toISOString().split('T')[0]);

  // 1. Resolve and validate coordinates for all stations with Terminus Destination guarantee
  const mappedStations = useMemo(() => {
    if (!Array.isArray(stations) || stations.length === 0) return [];

    const rawList = [...stations];

    // Ensure final terminus is guaranteed in list if provided in trainData
    if (trainData?.destination_code && !rawList.some(s => s.station_code === trainData.destination_code)) {
      rawList.push({
        station_code: trainData.destination_code,
        station_name: trainData.destination_name || trainData.destination_code,
        is_halt: true,
        distance: trainData.total_distance_km || 0
      });
    }

    return rawList
      .map((stn, index) => {
        const code = stn.station_code || stn.stationCode || '';
        let lat = parseFloat(stn.latitude);
        let lon = parseFloat(stn.longitude);

        if (!isValidCoord(lat, lon)) {
          const fallback = getStationCoords(code);
          if (fallback) {
            lat = fallback[0];
            lon = fallback[1];
          }
        }

        const valid = isValidCoord(lat, lon);

        return {
          ...stn,
          station_code: code,
          station_name: stn.station_name || stn.stationName || code,
          latitude: valid ? lat : null,
          longitude: valid ? lon : null,
          coords: valid ? [lat, lon] : null,
          is_halt: stn.is_halt !== undefined ? Boolean(stn.is_halt) : true,
          index
        };
      })
      .filter(stn => stn.coords !== null);
  }, [stations, trainData]);

  // 2. Robust Active Station Matching (Prevents Defaulting to Index 0 / Origin for active trains)
  const currentStationIndex = useMemo(() => {
    if (!mappedStations.length) return 0;
    if (isYetToStart) return 0;
    
    const targetCode = (
      currentStationCode ||
      trainData?.current_status?.station_code ||
      trainData?.current?.station_code ||
      trainData?.current_station_code ||
      trainData?.current_station ||
      ''
    ).toUpperCase().trim();

    const targetName = (
      trainData?.current_status?.station_name ||
      trainData?.current?.station_name ||
      trainData?.current_station_name ||
      trainData?.current_station ||
      ''
    ).toUpperCase().trim();

    // 1. Explicit live flag from API
    let idx = mappedStations.findIndex(st => 
      st.is_current_location === true || 
      st.is_current === true || 
      st.isCurrent === true || 
      st.status === 'current'
    );
    if (idx !== -1) return idx;

    // 2. Exact station code match
    if (targetCode) {
      idx = mappedStations.findIndex(st => (st.station_code || '').toUpperCase().trim() === targetCode);
      if (idx !== -1) return idx;
    }

    // 3. Station sequence matching
    const targetSeq = trainData?.current_status?.station_sequence || trainData?.current?.sequence;
    if (targetSeq !== undefined && targetSeq !== null) {
      idx = mappedStations.findIndex(st => Number(st.sequence || st.station_sequence) === Number(targetSeq));
      if (idx !== -1) return idx;
    }

    // 4. Station name matching
    if (targetName) {
      idx = mappedStations.findIndex(st => {
        const stName = (st.station_name || st.current_station || '').toUpperCase().trim();
        return stName && (stName.includes(targetName) || targetName.includes(stName));
      });
      if (idx !== -1) return idx;
    }

    // 5. Distance / Progress fallback: match closest station by distance traveled
    const distanceTraveled = Number(
      trainData?.current_status?.distance_from_origin_km ||
      trainData?.current_status?.distance_from_source_km ||
      trainData?.current?.distance_traveled_km ||
      trainData?.distance_traveled ||
      0
    );
    if (distanceTraveled > 0) {
      let closestIdx = 0;
      let minDiff = Infinity;
      mappedStations.forEach((st, i) => {
        const stDist = Number(st.distance_from_origin_km || st.distance_from_source_km || st.distance || 0);
        const diff = Math.abs(stDist - distanceTraveled);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      });
      return closestIdx;
    }

    return 0;
  }, [mappedStations, currentStationCode, trainData, isYetToStart]);

  const currentStation = isYetToStart ? (mappedStations[0] || {}) : (mappedStations[currentStationIndex] || mappedStations[0] || {});
  const originStation = mappedStations[0] || {};
  const terminusStation = mappedStations[mappedStations.length - 1] || {};

  // 3. Compute active train marker coordinates strictly from currently tracked station / live telemetry
  const currentLat = useMemo(() => {
    if (!isYetToStart && liveLocation && isValidCoord(liveLocation.latitude, liveLocation.longitude)) {
      return parseFloat(liveLocation.latitude);
    }
    return currentStation?.latitude ?? (mappedStations[0]?.latitude || DEFAULT_MAP_CENTER[0]);
  }, [liveLocation, currentStation, mappedStations, isYetToStart]);

  const currentLng = useMemo(() => {
    if (!isYetToStart && liveLocation && isValidCoord(liveLocation.latitude, liveLocation.longitude)) {
      return parseFloat(liveLocation.longitude);
    }
    return currentStation?.longitude ?? (mappedStations[0]?.longitude || DEFAULT_MAP_CENTER[1]);
  }, [liveLocation, currentStation, mappedStations, isYetToStart]);

  // 4. Terminus / Target destination station code
  const effectiveTargetCode = useMemo(() => {
    if (targetStationCode) return String(targetStationCode).trim().toUpperCase();
    if (terminusStation.station_code) {
      return String(terminusStation.station_code).trim().toUpperCase();
    }
    return null;
  }, [terminusStation, targetStationCode]);

  // 5. Ordered continuous polyline coordinates from origin to destination
  const polylineCoordinates = useMemo(() => {
    return mappedStations.map(stn => stn.coords);
  }, [mappedStations]);

  // 6. Metrics for overlay card and terminus popup
  const remainingStopsCount = isYetToStart
    ? mappedStations.length
    : Math.max(0, mappedStations.length - 1 - currentStationIndex);

  const remainingDistanceKm = isYetToStart
    ? Number(terminusStation.distance || terminusStation.distance_from_source_km || terminusStation.distance_from_origin_km || 0)
    : Math.max(
        0,
        Number(terminusStation.distance || terminusStation.distance_from_source_km || terminusStation.distance_from_origin_km || 0) -
        Number(currentStation.distance || currentStation.distance_from_source_km || currentStation.distance_from_origin_km || 0)
      );

  const delayMinutes = isYetToStart ? 0 : (liveLocation?.delay_minutes ?? trainData?.current_status?.delay_minutes ?? 0);
  const delayInfo = isYetToStart ? { text: 'On Time (Scheduled)', statusClass: 'on-time' } : formatDelay(delayMinutes);

  const liveCoordinates = [currentLat, currentLng];
  const routeKey = `${mappedStations[0]?.station_code || 'start'}-${terminusStation?.station_code || 'end'}-${currentStationCode}-${isYetToStart}`;

  return (
    <div className="panel map-panel">
      <div className="panel-heading map-panel-header">
        <div>
          <span className="panel-eyebrow">Geospatial Telemetry</span>
          <h3 className="panel-title">Interactive Live Route Map</h3>
        </div>

        <div className="map-header-badges">
          <span className="mapped-count-badge">
            <MapPin size={12} /> {mappedStations.length} of {stations.length} stations mapped
          </span>
          {isValidCoord(currentLat, currentLng) && (
            <span className="live-pulse-badge">
              {isYetToStart ? (
                <><CalendarClock size={12} className="pulse-icon" style={{ color: '#38bdf8' }} /> Scheduled Run</>
              ) : (
                <><Radio size={12} className="pulse-icon" /> Live GPS Active</>
              )}
            </span>
          )}
        </div>
      </div>

      <div className="map-wrapper">
        {/* Floating Glassmorphism Live Route Summary Overlay Card */}
        <div className="map-live-summary-overlay">
          <div className="summary-overlay-header">
            <span className="summary-train-badge" title={`${trainData?.train_number || '---'} ${trainData?.train_name || ''}`}>
              🚆 {trainData?.train_number || '---'} {trainData?.train_name || 'Express Service'}
            </span>
            <span className={`summary-delay-pill ${delayInfo.statusClass}`}>
              {delayInfo.text}
            </span>
          </div>

          <div className="summary-overlay-route">
            <span className="route-stn">{originStation.station_code || trainData?.origin_code || 'START'}</span>
            <span className="route-arrow">→</span>
            <span className="route-stn destination">{terminusStation.station_code || trainData?.destination_code || 'END'}</span>
          </div>

          <div className="summary-overlay-grid">
            <div className="summary-stat">
              <span className="stat-label">{isYetToStart ? 'ORIGIN DEPARTURE' : 'CURRENT STOP'}</span>
              <strong className="stat-val" title={isYetToStart ? originStation?.station_name : (currentStation?.station_name || currentStation?.station_code)}>
                {isYetToStart ? (originStation?.station_name || originStation?.station_code || 'Origin') : (currentStation?.station_name || currentStation?.station_code || 'In Transit')}
              </strong>
            </div>
            <div className="summary-stat">
              <span className="stat-label">LIVE SPEED</span>
              <strong className="stat-val">
                {isYetToStart ? '0 km/h (Awaiting Departure)' : formatSpeed(liveLocation?.speed_kmph || trainData?.current_status?.speed_kmph || 75)}
              </strong>
            </div>
            <div className="summary-stat full-width">
              <span className="stat-label">DESTINATION ETA ({terminusStation.station_code || 'TERM'})</span>
              <strong className="stat-val highlight">
                {trainData?.prediction?.formatted_eta || formatTime(terminusStation.scheduled_arrival) || '--:--'}
              </strong>
            </div>
          </div>
        </div>

        <MapContainer
          center={liveCoordinates || DEFAULT_MAP_CENTER}
          zoom={DEFAULT_MAP_ZOOM}
          scrollWheelZoom={true}
          className="leaflet-map-canvas"
        >
          {/* Clean Standard OpenStreetMap Tile Layer (No watermarks / No API key required) */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />

          <MapLifecycleController
            points={polylineCoordinates}
            currentLat={currentLat}
            currentLng={currentLng}
            routeKey={routeKey}
          />

          {/* Continuous Railway Track Polyline connecting all station coordinates */}
          {polylineCoordinates.length > 1 && (
            <Polyline
              positions={polylineCoordinates}
              pathOptions={{
                color: '#0284c7',
                weight: 4,
                opacity: 0.85,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
          )}

          {/* Train Moving Marker strictly at currentStationIndex / GPS coordinates */}
          {isValidCoord(currentLat, currentLng) && (
            <Marker
              position={liveCoordinates}
              icon={createLiveTrainIcon(liveLocation?.delay_minutes || 0, isYetToStart)}
              zIndexOffset={1000}
            >
              <Popup className="station-map-popup live-train-popup">
                <div className="popup-card">
                  <div className="popup-header live-header">
                    <strong>{isYetToStart ? '🚆 Scheduled Train Position' : '🚆 Live Train Position'}</strong>
                    <span className="popup-code">{currentStation?.station_code || currentStationCode || 'START'}</span>
                  </div>
                  <div className="popup-body">
                    <div className="popup-row">
                      <span>{isYetToStart ? 'Origin Stop:' : 'Current Stop:'}</span>
                      <b>{currentStation?.station_name || currentStation?.station_code || 'Origin'}</b>
                    </div>
                    <div className="popup-row">
                      <span>Coordinates:</span>
                      <b>{currentLat.toFixed(4)}, {currentLng.toFixed(4)}</b>
                    </div>
                    <div className="popup-row">
                      <span>Speed:</span>
                      <b>{isYetToStart ? '0 km/h (Awaiting Departure)' : formatSpeed(liveLocation?.speed_kmph || trainData?.current_status?.speed_kmph || 75)}</b>
                    </div>
                    <div className="popup-row">
                      <span>Current Delay:</span>
                      <b>{isYetToStart ? 'On Time (Scheduled)' : formatDelay(liveLocation?.delay_minutes || trainData?.current_status?.delay_minutes).text}</b>
                    </div>
                    <div className="popup-row">
                      <span>Status:</span>
                      <b className="status-note">
                        {isYetToStart
                          ? `Scheduled to depart from ${originStation.station_name || originStation.station_code} on ${originStation.scheduled_departure || 'Scheduled Time'}`
                          : (liveLocation?.running_status || trainData?.current_status?.running_status || 'In Transit')}
                      </b>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Dynamically Render All Station Milestones with Strict Scalable Visual Hierarchy */}
          {mappedStations.map((stn, i) => {
            const stnCode = String(stn.station_code).trim().toUpperCase();
            const isOrigin = i === 0;
            const isTerminus = i === mappedStations.length - 1 || stnCode === effectiveTargetCode;
            const isCurrent = isYetToStart ? false : (i === currentStationIndex);
            const isPassed = !isYetToStart && (i < currentStationIndex && !isOrigin);
            const isUpcoming = isYetToStart ? (i > 0 && !isTerminus) : (i > currentStationIndex && !isTerminus);
            const isCommercialHalt = stn.is_halt !== false;

            let fillColor = '#0d9488';
            let radius = 4;
            let strokeColor = '#ffffff';
            let strokeWidth = 1.5;
            let fillOpacity = 0.95;
            let categoryLabel = 'Upcoming Stop';

            if (isCurrent) {
              fillColor = '#ef4444';
              radius = 8;
              strokeColor = '#ffffff';
              strokeWidth = 2.5;
              categoryLabel = 'Live Active Station';
            } else if (isTerminus) {
              fillColor = '#eab308'; // 12px Amber Terminus Badge
              radius = 6.5;
              strokeColor = '#ffffff';
              strokeWidth = 2.5;
              categoryLabel = 'Terminus Destination';
            } else if (isOrigin) {
              fillColor = '#10b981'; // 12px Emerald Origin Badge
              radius = 6;
              strokeColor = '#ffffff';
              strokeWidth = 2.5;
              categoryLabel = 'Origin Station';
            } else if (!isCommercialHalt) {
              fillColor = isPassed ? '#94a3b8' : '#0284c7';
              radius = 2;
              strokeColor = '#ffffff';
              strokeWidth = 0.5;
              fillOpacity = 0.7;
              categoryLabel = 'Passing Point / Block';
            } else if (isPassed) {
              fillColor = '#94a3b8';
              radius = 3.8;
              strokeColor = '#ffffff';
              strokeWidth = 1.5;
              categoryLabel = 'Passed Station';
            } else if (isUpcoming) {
              fillColor = '#0d9488';
              radius = 3.8;
              strokeColor = '#ffffff';
              strokeWidth = 1.5;
              categoryLabel = 'Upcoming Stop';
            }

            const stationDelayInfo = formatDelay(stn.delay_minutes);

            return (
              <CircleMarker
                key={`stn-node-${stn.station_code}-${i}`}
                center={stn.coords}
                radius={radius}
                pathOptions={{
                  fillColor,
                  fillOpacity,
                  color: strokeColor,
                  weight: strokeWidth
                }}
              >
                {/* Station Hover Tooltip */}
                <Tooltip direction="top" offset={[0, -5]} opacity={0.95} className="station-node-tooltip">
                  <div className="tooltip-node-content">
                    <strong>{stn.station_name || stn.station_code} ({stn.station_code})</strong>
                    <span>{categoryLabel} &bull; {formatDistance(stn.distance || stn.distance_from_source_km)}</span>
                  </div>
                </Tooltip>

                {/* Station Detailed Click Popup */}
                <Popup className="station-map-popup">
                  <div className="popup-card">
                    <div className="popup-header">
                      <strong>{stn.station_name || stn.station_code}</strong>
                      <span className="popup-code">{stn.station_code}</span>
                    </div>

                    <div className="popup-body">
                      <div className="popup-row">
                        <span>Classification:</span>
                        <strong style={{ color: fillColor }}>{categoryLabel}</strong>
                      </div>
                      <div className="popup-row">
                        <span>Coordinates:</span>
                        <b>{stn.latitude?.toFixed(4)}, {stn.longitude?.toFixed(4)}</b>
                      </div>
                      <div className="popup-row">
                        <span>Distance from Origin:</span>
                        <b>{formatDistance(stn.distance || stn.distance_from_source_km)}</b>
                      </div>
                      <div className="popup-row">
                        <span>Scheduled Arrival:</span>
                        <b>{formatTime(stn.scheduled_arrival || stn.scheduled_departure)}</b>
                      </div>
                      {isTerminus && (
                        <>
                          <div className="popup-row">
                            <span>Predicted Dynamic ETA:</span>
                            <b style={{ color: '#0284c7' }}>
                              {trainData?.prediction?.formatted_eta || formatTime(stn.estimated_arrival || stn.scheduled_arrival)}
                            </b>
                          </div>
                          <div className="popup-row">
                            <span>Remaining Distance:</span>
                            <b>{formatDistance(remainingDistanceKm)}</b>
                          </div>
                          <div className="popup-row">
                            <span>Stops Remaining:</span>
                            <b>{remainingStopsCount} stops</b>
                          </div>
                          <div className="popup-row">
                            <span>Platform:</span>
                            <b>{stn.platform ? `Platform ${stn.platform}` : 'Terminus Clearance'}</b>
                          </div>
                        </>
                      )}
                      {!isTerminus && !isYetToStart && stn.actual_arrival && (
                        <div className="popup-row">
                          <span>Actual:</span>
                          <b>{formatTime(stn.actual_arrival)}</b>
                        </div>
                      )}
                      {!isYetToStart && stn.delay_minutes != null && (
                        <div className="popup-row">
                          <span>Delay:</span>
                          <b className={stationDelayInfo.statusClass}>{stationDelayInfo.text}</b>
                        </div>
                      )}
                      {isCurrent && (
                        <div className="popup-live-tag">
                          🚆 Live Train Position
                        </div>
                      )}
                      {isOrigin && (
                        <div className="popup-target-tag" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
                          🟢 Journey Origin
                        </div>
                      )}
                      {isTerminus && (
                        <div className="popup-target-tag">
                          🎯 Terminus Destination
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Scalable Map Legend */}
        <div className="map-legend-card">
          <div className="legend-item">
            <span className="legend-dot dot-live" style={{ backgroundColor: isYetToStart ? '#38bdf8' : '#ef4444' }} />
            {isYetToStart ? 'Scheduled Departure' : 'Live Active Train'}
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: '#10b981' }} /> Origin Station
          </div>
          <div className="legend-item">
            <span className="legend-dot dot-target" style={{ backgroundColor: '#eab308' }} /> Terminus Destination
          </div>
          <div className="legend-item">
            <span className="legend-dot dot-upcoming" style={{ backgroundColor: '#0d9488' }} /> Upcoming Stop
          </div>
          {!isYetToStart && (
            <div className="legend-item">
              <span className="legend-dot dot-passed" style={{ backgroundColor: '#94a3b8' }} /> Passed Stop
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const RouteMap = LiveRouteMap;
export default LiveRouteMap;
