import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getStationCoords, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '../utils/stationCoords.js';
import { formatTime, formatDelay, formatDistance } from '../utils/formatters.js';
import { MapPin, Navigation, Compass } from 'lucide-react';

function MapBoundsController({ points }) {
  const map = useMap();

  useEffect(() => {
    if (points && points.length > 1) {
      try {
        map.fitBounds(points, {
          padding: [40, 40],
          maxZoom: 11
        });
      } catch (e) {
        console.warn('Map fitBounds error:', e);
      }
    } else if (points && points.length === 1) {
      map.setView(points[0], 9);
    }
  }, [map, points]);

  return null;
}

export function RouteMap({
  stations = [],
  currentStationCode,
  targetStationCode
}) {
  const currentIdx = stations.findIndex(s => s.station_code === currentStationCode);

  // Match coordinates for stations
  const mappedStations = useMemo(() => {
    return stations
      .map((stn, index) => {
        const coords = getStationCoords(stn.station_code);
        return {
          ...stn,
          coords,
          index
        };
      })
      .filter(stn => Boolean(stn.coords));
  }, [stations]);

  const polylinePoints = useMemo(() => {
    return mappedStations.map(stn => stn.coords);
  }, [mappedStations]);

  const mapCenter = polylinePoints[0] || DEFAULT_MAP_CENTER;

  return (
    <div className="panel map-panel">
      <div className="panel-heading map-panel-header">
        <div>
          <span className="panel-eyebrow">Geospatial Tracking</span>
          <h3 className="panel-title">Interactive Railway Route Map</h3>
        </div>
        <span className="mapped-count-badge">
          <MapPin size={12} /> {mappedStations.length} of {stations.length} stations mapped
        </span>
      </div>

      <div className="map-wrapper">
        <MapContainer
          center={mapCenter}
          zoom={DEFAULT_MAP_ZOOM}
          scrollWheelZoom={true}
          className="leaflet-map-canvas"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapBoundsController points={polylinePoints} />

          {/* Route polyline */}
          {polylinePoints.length > 1 && (
            <Polyline
              positions={polylinePoints}
              pathOptions={{
                color: '#0B7773',
                weight: 5,
                opacity: 0.85,
                lineJoin: 'round'
              }}
            />
          )}

          {/* Station markers */}
          {mappedStations.map((stn) => {
            const isOrigin = stn.index === 0;
            const isDest = stn.index === stations.length - 1;
            const isCurrent = stn.station_code === currentStationCode;
            const isTarget = stn.station_code === targetStationCode;
            const isPassed = currentIdx >= 0 && stn.index < currentIdx;

            let fillColor = '#0B7773'; // Default teal
            let radius = 6;
            let strokeColor = '#FFFFFF';
            let strokeWidth = 2;

            if (isCurrent) {
              fillColor = '#E26A4D'; // Live current coral
              radius = 11;
              strokeColor = '#FFFFFF';
              strokeWidth = 3;
            } else if (isTarget) {
              fillColor = '#EEBD58'; // Target gold
              radius = 9;
              strokeWidth = 3;
            } else if (isOrigin) {
              fillColor = '#10B981'; // Green
              radius = 8;
            } else if (isDest) {
              fillColor = '#075653'; // Dark teal
              radius = 8;
            } else if (isPassed) {
              fillColor = '#718083'; // Grey passed
              radius = 5;
            }

            const delayInfo = formatDelay(stn.delay_minutes);

            return (
              <CircleMarker
                key={`map-marker-${stn.station_code}-${stn.index}`}
                center={stn.coords}
                radius={radius}
                pathOptions={{
                  fillColor,
                  fillOpacity: 0.95,
                  color: strokeColor,
                  weight: strokeWidth
                }}
              >
                <Popup className="station-map-popup">
                  <div className="popup-card">
                    <div className="popup-header">
                      <strong>{stn.station_name || stn.station_code}</strong>
                      <span className="popup-code">{stn.station_code}</span>
                    </div>
                    
                    <div className="popup-body">
                      <div className="popup-row">
                        <span>Distance:</span>
                        <b>{formatDistance(stn.distance)}</b>
                      </div>
                      <div className="popup-row">
                        <span>Scheduled:</span>
                        <b>{formatTime(stn.scheduled_arrival || stn.scheduled_departure)}</b>
                      </div>
                      {stn.actual_arrival && (
                        <div className="popup-row">
                          <span>Actual:</span>
                          <b>{formatTime(stn.actual_arrival)}</b>
                        </div>
                      )}
                      {stn.delay_minutes != null && (
                        <div className="popup-row">
                          <span>Delay:</span>
                          <b className={delayInfo.statusClass}>{delayInfo.text}</b>
                        </div>
                      )}
                      {isCurrent && (
                        <div className="popup-live-tag">
                          🚆 Live Train Position
                        </div>
                      )}
                      {isTarget && (
                        <div className="popup-target-tag">
                          🎯 Active Target ETA Destination
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Map Legend */}
        <div className="map-legend-card">
          <div className="legend-item">
            <span className="legend-dot dot-live" /> Live Position
          </div>
          <div className="legend-item">
            <span className="legend-dot dot-target" /> Target Destination
          </div>
          <div className="legend-item">
            <span className="legend-dot dot-upcoming" /> Upcoming Station
          </div>
          <div className="legend-item">
            <span className="legend-dot dot-passed" /> Passed Station
          </div>
        </div>
      </div>
    </div>
  );
}
