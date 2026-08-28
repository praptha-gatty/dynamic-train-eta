const searchInput = document.querySelector('#train-search');
const searchForm = document.querySelector('#search-form');
const searchButton = document.querySelector('#search-button');
const searchMessage = document.querySelector('#search-message');
const dashboard = document.querySelector('#dashboard');
const stationCoordinates = { NDLS:[28.643,77.219], BPL:[23.26,77.413], GWL:[26.218,78.183], AGC:[27.158,77.99], JAT:[32.726,74.857], NGP:[21.146,79.088], PUNE:[18.528,73.874], HWH:[22.583,88.342], JP:[26.912,75.787], ADI:[23.022,72.571], MMCT:[18.94,72.835], INDB:[22.719,75.857], SVDK:[32.98,74.95] };
let routeMap;

const elements = {
  trainNumber: document.querySelector('#train-number'),
  trainName: document.querySelector('#train-name'),
  routeCode: document.querySelector('#route-code'),
  originCode: document.querySelector('#origin-code'),
  originName: document.querySelector('#origin-name'),
  destinationCode: document.querySelector('#destination-code'),
  destinationName: document.querySelector('#destination-name'),
  stationCount: document.querySelector('#station-count'),
  distanceTotal: document.querySelector('#distance-total'),
  journeyDate: document.querySelector('#journey-date'),
  lastUpdated: document.querySelector('#last-updated'),
  trainStatus: document.querySelector('#train-status'),
  etaTime: document.querySelector('#eta-time'),
  etaStation: document.querySelector('#eta-station'),
  scheduledTime: document.querySelector('#scheduled-time'),
  etaDelay: document.querySelector('#eta-delay'),
  delayNumber: document.querySelector('#delay-number'),
  delayStation: document.querySelector('#delay-station'),
  delayStatus: document.querySelector('#delay-status'),
  explanation: document.querySelector('#explanation'),
  factorDelay: document.querySelector('#factor-delay'),
  factorDelayBar: document.querySelector('#factor-delay-bar'),
  factorSpeed: document.querySelector('#factor-speed'),
  factorSpeedBar: document.querySelector('#factor-speed-bar'),
  currentSpeed: document.querySelector('#current-speed'),
  currentDistance: document.querySelector('#current-distance'),
  currentCode: document.querySelector('#current-code'),
  observationCount: document.querySelector('#observation-count'),
  stationList: document.querySelector('#station-list'),
  timelineDate: document.querySelector('#timeline-date'),
  timelineList: document.querySelector('#timeline-list')
};

function text(element, value) {
  element.textContent = value ?? '--';
}

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

function render(data) {
  const stations = data.stations || [];
  const current = data.current || stations[stations.length - 1] || {};
  const first = stations[0] || {};
  const last = stations[stations.length - 1] || {};
  const delay = Number(current.delay_minutes);
  const speed = Number(current.speed_kmph);

  text(elements.trainNumber, data.train_number);
  text(elements.trainName, data.train_name || `Train ${data.train_number}`);
  text(elements.routeCode, `${first.station_code || '--'}\n${last.station_code || '--'}`);
  text(elements.originCode, first.station_code);
  text(elements.originName, first.station_name);
  text(elements.destinationCode, last.station_code);
  text(elements.destinationName, last.station_name);
  text(elements.stationCount, `${stations.length} observed stations`);
  text(elements.distanceTotal, data.distance_km == null ? 'Distance unavailable' : `${data.distance_km} km from origin`);
  text(elements.journeyDate, formatDate(current.journey_date));
  text(elements.lastUpdated, current.captured_at ? `Snapshot ${formatTime(current.captured_at)}` : 'Snapshot unavailable');
  text(elements.trainStatus, current.station_status || 'Observed');
  text(elements.etaTime, formatTime(current.actual_arrival || current.actual_departure));
  text(elements.etaStation, current.station_name);
  text(elements.scheduledTime, formatTime(current.scheduled_arrival || current.scheduled_departure));
  text(elements.etaDelay, Number.isFinite(delay) ? `${delay > 0 ? '+' : ''}${delay} min` : 'Delay unavailable');
  text(elements.delayNumber, Number.isFinite(delay) ? `${delay} min` : '-- min');
  text(elements.delayStation, current.station_name);
  text(elements.delayStatus, current.station_status || 'Status unavailable');
  text(elements.explanation, Number.isFinite(delay) ? `The latest recorded observation at ${current.station_name || 'this station'} was ${delay} minutes from schedule.` : 'No delay value was returned for the latest observation.');
  text(elements.factorDelay, Number.isFinite(delay) ? `${delay} min` : 'Unavailable');
  text(elements.factorSpeed, Number.isFinite(speed) ? `${speed} km/h` : 'Unavailable');
  elements.factorDelayBar.style.width = Number.isFinite(delay) ? `${Math.min(Math.max(delay, 0), 60) / 60 * 100}%` : '0%';
  elements.factorSpeedBar.style.width = Number.isFinite(speed) ? `${Math.min(Math.max(speed, 0), 150) / 150 * 100}%` : '0%';
  text(elements.currentSpeed, Number.isFinite(speed) ? `${speed} km/h` : '--');
  text(elements.currentDistance, data.distance_km == null ? '--' : `${data.distance_km} km`);
  text(elements.currentCode, current.station_code);
  text(elements.observationCount, `${stations.length} rows`);
  text(elements.timelineDate, formatDate(current.journey_date));

  elements.stationList.replaceChildren(...stations.map((station, index) => {
    const row = document.createElement('div');
    row.className = `station-row ${index === stations.length - 1 ? 'current' : ''}`;
    row.innerHTML = `<div class="station-status"><span></span></div><div class="station-name"><strong></strong><small></small></div><div class="station-eta"><strong></strong><small></small></div>`;
    row.querySelector('.station-name strong').textContent = `${station.station_name || '--'} ${station.station_code || ''}`;
    row.querySelector('.station-name small').textContent = station.station_status || 'Status unavailable';
    row.querySelector('.station-eta strong').textContent = formatTime(station.actual_arrival || station.actual_departure || station.scheduled_arrival);
    row.querySelector('.station-eta small').textContent = Number.isFinite(Number(station.delay_minutes)) ? `${station.delay_minutes} min delay` : 'Delay unavailable';
    return row;
  }));

  elements.timelineList.replaceChildren(...stations.slice(-4).map((station, index, visibleStations) => {
    const item = document.createElement('div');
    item.className = `timeline-item ${index === visibleStations.length - 1 ? 'active' : ''}`;
    item.innerHTML = '<span class="timeline-point"></span><div><small></small><strong></strong><p></p></div>';
    item.querySelector('small').textContent = formatTime(station.actual_arrival || station.actual_departure || station.scheduled_arrival);
    item.querySelector('strong').textContent = station.station_name || station.station_code || '--';
    item.querySelector('p').textContent = station.station_status || 'Recorded observation';
    return item;
  }));
  dashboard.hidden = false;
  renderMap(stations);
}

function renderMap(stations) {
  const mapped = stations.filter(station => stationCoordinates[station.station_code]);
  document.querySelector('#mapped-count').textContent = `${mapped.length} mapped stations`;
  document.querySelector('#map-empty').hidden = mapped.length > 0;
  if (!mapped.length || typeof L === 'undefined') return;
  if (routeMap) routeMap.remove();
  routeMap = L.map('route-map-view', { scrollWheelZoom: false }).setView(stationCoordinates[mapped[0].station_code], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(routeMap);
  const points = mapped.map(station => stationCoordinates[station.station_code]);
  L.polyline(points, { color: '#e26a4d', weight: 4 }).addTo(routeMap);
  mapped.forEach((station, index) => L.circleMarker(stationCoordinates[station.station_code], { radius: index === mapped.length - 1 ? 9 : 6, color: '#fff', weight: 2, fillColor: index === mapped.length - 1 ? '#e26a4d' : '#0b7773', fillOpacity: 1 }).bindPopup(`<strong>${station.station_name || station.station_code}</strong><br>${formatTime(station.actual_arrival || station.actual_departure || station.scheduled_arrival)}`).addTo(routeMap));
  if (points.length > 1) routeMap.fitBounds(points, { padding: [28, 28] });
  setTimeout(() => routeMap.invalidateSize(), 0);
}

async function searchTrain() {
  const trainNumber = searchInput.value.trim();
  if (!trainNumber) {
    searchMessage.textContent = 'Enter a train number to begin.';
    searchMessage.className = 'search-message error';
    dashboard.hidden = true;
    return;
  }
  searchButton.disabled = true;
  searchMessage.className = 'search-message';
  searchMessage.textContent = 'Loading the latest available observations...';
  try {
    const response = await fetch(`/api/train/${encodeURIComponent(trainNumber)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Train data could not be loaded.');
    render(data);
    searchMessage.textContent = `Showing data returned for train ${data.train_number}.`;
    document.querySelector('#connection-status').innerHTML = '<span></span> Data source connected';
  } catch (error) {
    dashboard.hidden = true;
    searchMessage.className = 'search-message error';
    searchMessage.textContent = error.message;
  } finally {
    searchButton.disabled = false;
  }
}

searchForm.addEventListener('submit', event => { event.preventDefault(); searchTrain(); });
searchInput.addEventListener('keydown', event => { if (event.key === 'Enter') searchTrain(); });
