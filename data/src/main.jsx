import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MapContainer, Polyline, CircleMarker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './styles.css';

const stationCoordinates = {
  NDLS: [28.643, 77.219], BCT: [18.94, 72.835], MMCT: [18.94, 72.835], JP: [26.912, 75.787], AII: [26.45, 74.639],
  ADI: [23.022, 72.571], HWH: [22.583, 88.342], LKO: [26.847, 80.947], CNB: [26.449, 80.332], AGC: [27.158, 77.99],
  GWL: [26.218, 78.183], BPL: [23.26, 77.413], NGP: [21.146, 79.088], PUNE: [18.528, 73.874],
  MAS: [13.082, 80.275], SBC: [12.978, 77.57], HYB: [17.394, 78.485], SC: [17.434, 78.501], BBS: [20.296, 85.825],
  TVC: [8.49, 76.953], ERS: [9.969, 76.274], RNC: [23.344, 85.31], GKP: [26.761, 83.373], JAT: [32.726, 74.857]
};
const fallbackCenter = [22.5, 79.2];

function formatTime(value) {
  if (!value) return '--';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function formatDate(value) {
  if (!value) return '--';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
}
function number(value) { return Number.isFinite(Number(value)) ? Number(value) : null; }
function MapBounds({ points }) {
  const map = useMap();
  React.useEffect(() => { if (points.length > 1) map.fitBounds(points, { padding: [28, 28] }); }, [map, points]);
  return null;
}
function RailMap({ stations }) {
  const plotted = stations.filter(station => stationCoordinates[station.station_code]);
  const points = plotted.map(station => stationCoordinates[station.station_code]);
  return <div className="map-frame">
    <MapContainer center={points[0] || fallbackCenter} zoom={5} scrollWheelZoom={false} zoomControl={true}>
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapBounds points={points} />
      {points.length > 1 && <Polyline positions={points} pathOptions={{ color: '#e66b4f', weight: 4, opacity: .9 }} />}
      {plotted.map((station, index) => <CircleMarker key={`${station.station_code}-${index}`} center={stationCoordinates[station.station_code]} radius={index === plotted.length - 1 ? 9 : 6} pathOptions={{ color: '#fff', weight: 2, fillColor: index === plotted.length - 1 ? '#e66b4f' : '#087a75', fillOpacity: 1 }}><Popup><strong>{station.station_name || station.station_code}</strong><br />{formatTime(station.actual_arrival || station.actual_departure || station.scheduled_arrival)}</Popup></CircleMarker>)}
    </MapContainer>
    {!points.length && <div className="map-empty"><strong>Map awaiting station coordinates</strong><span>Station progress is still available in the list below.</span></div>}
    <div className="map-legend"><span><i className="legend-dot teal" /> Recorded station</span><span><i className="legend-dot coral" /> Latest position</span></div>
  </div>;
}
function Search({ value, setValue, onSearch, loading }) {
  return <form className="search-panel" onSubmit={event => { event.preventDefault(); onSearch(); }}><span className="search-icon">⌕</span><label htmlFor="train-search">Search train number</label><input id="train-search" value={value} onChange={event => setValue(event.target.value)} type="search" placeholder="Enter train number, e.g. 12919" autoComplete="off" /><button className="primary-button" disabled={loading}>{loading ? 'Loading...' : <>Find train <span>→</span></>}</button></form>;
}
function Dashboard({ data }) {
  const stations = data.stations || [];
  const current = data.current || stations[stations.length - 1] || {};
  const first = stations[0] || {};
  const last = stations[stations.length - 1] || {};
  const delay = number(current.delay_minutes);
  const speed = number(current.speed_kmph);
  return <>
    <nav className="view-tabs"><a className="active" href="#overview">Overview</a><a href="#stations">Station ETA</a><a href="#timeline">Journey timeline</a><a href="#route-map">Live map</a></nav>
    <section id="overview" className="section-heading"><div><p className="eyebrow">Selected journey</p><h2>Train status</h2></div><span className="status-pill"><span />{current.station_status || 'Observed'}</span></section>
    <section className="overview-grid">
      <article className="train-card"><div className="card-top"><span className="train-badge">TRAIN</span><span className="muted light">Snapshot {formatTime(data.captured_at)}</span></div><div className="train-heading"><div><p className="train-number">{data.train_number}</p><h3>{data.train_name || `Train ${data.train_number}`}</h3></div><div className="route-code">{first.station_code || '--'}<br /><span>↓</span><br />{last.station_code || '--'}</div></div><div className="route-line"><div><strong>{first.station_code || '--'}</strong><small>{first.station_name || 'Origin'}</small></div><div className="track"><span className="track-dot filled" /><span className="track-fill" /><span className="track-dot" /></div><div className="align-right"><strong>{last.station_code || '--'}</strong><small>{last.station_name || 'Destination'}</small></div></div><div className="card-footer"><span>{stations.length} observed stations</span><span>{data.distance_km == null ? 'Distance unavailable' : `${data.distance_km} km`}</span><span>{formatDate(current.journey_date)}</span></div></article>
      <article className="eta-card"><div className="card-top"><span className="eyebrow">Latest observation</span><span className="confidence">Data only</span></div><p className="eta-time">{formatTime(current.actual_arrival || current.actual_departure)}</p><p className="eta-label">Recorded at <strong>{current.station_name || '--'}</strong></p><div className="eta-compare"><span>Scheduled <b>{formatTime(current.scheduled_arrival || current.scheduled_departure)}</b></span><span className="delay-text">{delay == null ? '--' : `${delay > 0 ? '+' : ''}${delay} min`}</span></div><p className="forecast-note">Prediction becomes available when a forecasting service is connected.</p></article>
      <article className="delay-card"><div className="card-top"><span className="eyebrow">Recorded delay</span><span className="delay-icon">!</span></div><p className="delay-number">{delay == null ? '--' : delay} <small>min</small></p><p className="delay-label">At <strong>{current.station_name || '--'}</strong></p><div className="delay-divider" /><p className="delay-cause"><span className="cause-dot" />{current.station_status || 'Status unavailable'}</p></article>
    </section>
    <section className="content-grid"><article id="stations" className="panel station-panel"><div className="panel-heading"><div><p className="eyebrow">Processed observations</p><h2>Station-wise ETA</h2></div><span className="muted">{stations.length} rows</span></div><div className="station-list">{stations.map((station, index) => <div className={`station-row ${index === stations.length - 1 ? 'current' : 'passed'}`} key={`${station.station_code}-${index}`}><div className="station-status"><span /></div><div className="station-name"><strong>{station.station_name || '--'} <span>{station.station_code || ''}</span></strong><small>{station.station_status || 'Status unavailable'}</small></div><div className="station-eta"><strong>{formatTime(station.actual_arrival || station.actual_departure || station.scheduled_arrival)}</strong><small>{number(station.delay_minutes) == null ? 'Delay unavailable' : `${station.delay_minutes} min delay`}</small></div></div>)}</div></article><div className="side-stack"><article className="panel explanation-panel"><div className="panel-heading"><div><p className="eyebrow">Data insight</p><h2>Delay context</h2></div><span className="spark">✦</span></div><p className="explanation-copy">{delay == null ? 'No delay value was returned for the latest observation.' : `The latest observation at ${current.station_name || 'this station'} was ${delay} minutes from schedule.`}</p><div className="factor"><span>Recorded delay</span><strong>{delay == null ? 'Unavailable' : `${delay} min`}</strong><i><b style={{ width: `${Math.min(Math.max(delay || 0, 0), 60) / 60 * 100}%` }} /></i></div><div className="factor"><span>Recorded speed</span><strong>{speed == null ? 'Unavailable' : `${speed} km/h`}</strong><i><b style={{ width: `${Math.min(Math.max(speed || 0, 0), 150) / 150 * 100}%` }} /></i></div></article><article className="panel metrics-panel"><div className="metric"><span>Latest speed</span><strong>{speed == null ? '--' : `${speed} km/h`}</strong></div><div className="metric"><span>Distance from origin</span><strong>{data.distance_km == null ? '--' : `${data.distance_km} km`}</strong></div><div className="metric"><span>Station code</span><strong>{current.station_code || '--'}</strong></div></article></div></section>
    <section id="route-map" className="panel map-panel"><div className="panel-heading"><div><p className="eyebrow">Movement overview</p><h2>Live route map</h2></div><span className="muted">{stations.filter(station => stationCoordinates[station.station_code]).length} mapped stations</span></div><RailMap stations={stations} /></section>
    <section id="timeline" className="panel timeline-panel"><div className="panel-heading"><div><p className="eyebrow">Recorded journey progress</p><h2>ETA timeline</h2></div><span className="muted">{formatDate(current.journey_date)}</span></div><div className="timeline">{stations.slice(-4).map((station, index, visible) => <div className={`timeline-item ${index === visible.length - 1 ? 'active' : ''}`} key={`${station.station_code}-timeline`}><span className="timeline-point" /><div><small>{formatTime(station.actual_arrival || station.actual_departure || station.scheduled_arrival)}</small><strong>{station.station_name || station.station_code || '--'}</strong><p>{station.station_status || 'Recorded observation'}</p></div></div>)}</div></section>
  </>;
}
function App() {
  const [trainNumber, setTrainNumber] = useState(''); const [data, setData] = useState(null); const [message, setMessage] = useState('Search for a train to load its latest available observations.'); const [loading, setLoading] = useState(false); const [connected, setConnected] = useState(false);
  async function searchTrain() { const value = trainNumber.trim(); if (!value) { setMessage('Enter a train number to begin.'); setData(null); return; } setLoading(true); setMessage('Loading the latest available observations...'); try { const response = await fetch(`/api/train/${encodeURIComponent(value)}`); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Train data could not be loaded.'); setData(result); setConnected(true); setMessage(`Showing data returned for train ${result.train_number}.`); } catch (error) { setData(null); setMessage(error.message); } finally { setLoading(false); } }
  return <><header className="topbar"><a className="brand" href="#top"><span className="brand-mark">R</span><span>Railwise</span></a><div className="live-indicator"><span />{connected ? 'Data source connected' : 'Ready for a train search'}</div><button className="icon-button" aria-label="Open notifications">◉</button></header><main id="top" className="shell"><section className="welcome-row"><div><p className="eyebrow">Train intelligence platform</p><h1>Know when your train<br /><em>really</em> arrives.</h1><p className="intro">Enter a train number to view movement data, ETA forecasts, and its route on the map.</p></div><div className="date-stamp"><strong>LIVE ETA</strong><span>DATA CONNECTED</span></div></section><Search value={trainNumber} setValue={setTrainNumber} onSearch={searchTrain} loading={loading} /><p className={`search-message ${data ? '' : 'error'}`} role="status">{message}</p>{data && <Dashboard data={data} />}</main><footer><span>RAILWISE</span><span>Forecasts are estimates based on live movement data.</span><span>Data refreshes every 5 minutes</span></footer></>;
}

createRoot(document.getElementById('root')).render(<App />);
