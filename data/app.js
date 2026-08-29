const searchInput = document.querySelector('#train-search');
const searchForm = document.querySelector('#search-form');
const searchButton = document.querySelector('#search-button');
const searchMessage = document.querySelector('#search-message');
const dashboard = document.querySelector('#dashboard');
const trainSelect = document.querySelector('#train-select');
const autocompleteList = document.querySelector('#autocomplete-list');
const connectionStatus = document.querySelector('#connection-status');

const stationCoordinates = {
  NDLS: [28.643, 77.219],
  BPL: [23.26, 77.413],
  GWL: [26.218, 78.183],
  AGC: [27.158, 77.99],
  JAT: [32.726, 74.857],
  NGP: [21.146, 79.088],
  PUNE: [18.528, 73.874],
  HWH: [22.583, 88.342],
  JP: [26.912, 75.787],
  ADI: [23.022, 72.571],
  MMCT: [18.94, 72.835],
  BCT: [18.94, 72.835],
  INDB: [22.719, 75.857],
  SVDK: [32.98, 74.95],
  DWX: [22.968, 76.053],
  UJN: [23.177, 75.789],
  BHS: [23.53, 77.81],
  BAQ: [23.85, 77.79],
  BINA: [24.18, 78.18],
  LAR: [24.83, 78.42],
  BAB: [25.24, 78.47],
  VGLB: [25.448, 78.569],
  JHS: [25.448, 78.569],
  DBA: [25.89, 78.33],
  MRA: [26.5, 78.0],
  MTJ: [27.492, 77.674],
  PWL: [28.143, 77.327],
  FDB: [28.409, 77.318],
  NZM: [28.588, 77.253],
  PNP: [29.391, 76.964],
  KUN: [29.686, 76.991],
  KKDE: [29.97, 76.878],
  UMB: [30.334, 76.838],
  LDH: [30.901, 75.857],
  JRC: [31.312, 75.602],
  JUC: [31.326, 75.576],
  PTKC: [32.268, 75.642],
  KTHU: [32.38, 75.52],
  MCTM: [32.926, 75.142],
  UHP: [32.926, 75.142],
  KOTA: [25.214, 75.865],
  SWM: [25.993, 76.353],
  BTE: [27.215, 77.49],
  ASR: [31.634, 74.872],
  ST: [21.17, 72.831],
  BRC: [22.307, 73.181],
  RTM: [23.332, 75.037],
  NAD: [23.45, 75.41],
  BVI: [19.229, 72.857],
  VAPI: [20.37, 72.9],
  BL: [20.61, 72.93]
};

let routeMap;
let availableTrainsList = [];
let searchDebounceTimer = null;

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
  if (element) {
    element.textContent = value ?? '--';
  }
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
  const delay = Number(current.delay_minutes ?? current.expected_delay_minutes);
  const speed = Number(current.speed_kmph);

  text(elements.trainNumber, data.train_number);
  text(elements.trainName, data.train_name || `Train ${data.train_number}`);
  text(elements.routeCode, `${first.station_code || '--'}\n${last.station_code || '--'}`);
  text(elements.originCode, first.station_code);
  text(elements.originName, first.station_name);
  text(elements.destinationCode, last.station_code);
  text(elements.destinationName, last.station_name);
  text(elements.stationCount, `${stations.length} observed stations`);
  text(elements.distanceTotal, data.distance_km == null ? (data.distance_from_origin_km ? `${data.distance_from_origin_km} km` : 'Distance unavailable') : `${data.distance_km} km from origin`);
  text(elements.journeyDate, formatDate(current.journey_date || data.journey_date));
  text(elements.lastUpdated, data.captured_at || current.captured_at ? `Snapshot ${formatTime(data.captured_at || current.captured_at)}` : 'Snapshot unavailable');
  text(elements.trainStatus, current.station_status || current.running_status || 'Observed');
  text(elements.etaTime, formatTime(current.actual_arrival || current.actual_departure || current.scheduled_arrival));
  text(elements.etaStation, current.station_name || current.station_code);
  text(elements.scheduledTime, formatTime(current.scheduled_arrival || current.scheduled_departure));
  text(elements.etaDelay, Number.isFinite(delay) ? `${delay > 0 ? '+' : ''}${delay} min` : 'Delay unavailable');
  text(elements.delayNumber, Number.isFinite(delay) ? `${delay} min` : '-- min');
  text(elements.delayStation, current.station_name || current.station_code);
  text(elements.delayStatus, current.station_status || current.running_status || 'Status unavailable');
  text(elements.explanation, Number.isFinite(delay) ? `The latest recorded observation at ${current.station_name || current.station_code || 'this station'} was ${delay} minutes from schedule.` : 'No delay value was returned for the latest observation.');
  text(elements.factorDelay, Number.isFinite(delay) ? `${delay} min` : 'Unavailable');
  text(elements.factorSpeed, Number.isFinite(speed) ? `${speed} km/h` : 'Unavailable');
  
  if (elements.factorDelayBar) {
    elements.factorDelayBar.style.width = Number.isFinite(delay) ? `${Math.min(Math.max(delay, 0), 60) / 60 * 100}%` : '0%';
  }
  if (elements.factorSpeedBar) {
    elements.factorSpeedBar.style.width = Number.isFinite(speed) ? `${Math.min(Math.max(speed, 0), 150) / 150 * 100}%` : '0%';
  }

  text(elements.currentSpeed, Number.isFinite(speed) ? `${speed} km/h` : '--');
  text(elements.currentDistance, data.distance_km == null ? (current.distance_from_origin_km ? `${current.distance_from_origin_km} km` : '--') : `${data.distance_km} km`);
  text(elements.currentCode, current.station_code);
  text(elements.observationCount, `${stations.length} rows`);
  text(elements.timelineDate, formatDate(current.journey_date || data.journey_date));

  if (elements.stationList) {
    elements.stationList.replaceChildren(...stations.map((station, index) => {
      const row = document.createElement('div');
      row.className = `station-row ${index === stations.length - 1 ? 'current' : ''}`;
      row.innerHTML = `<div class="station-status"><span></span></div><div class="station-name"><strong></strong><small></small></div><div class="station-eta"><strong></strong><small></small></div>`;
      row.querySelector('.station-name strong').textContent = `${station.station_name || '--'} ${station.station_code || ''}`;
      row.querySelector('.station-name small').textContent = station.station_status || 'Status unavailable';
      row.querySelector('.station-eta strong').textContent = formatTime(station.actual_arrival || station.actual_departure || station.scheduled_arrival);
      row.querySelector('.station-eta small').textContent = Number.isFinite(Number(station.delay_minutes ?? station.expected_delay_minutes)) ? `${station.delay_minutes ?? station.expected_delay_minutes} min delay` : 'Delay unavailable';
      return row;
    }));
  }

  if (elements.timelineList) {
    elements.timelineList.replaceChildren(...stations.slice(-4).map((station, index, visibleStations) => {
      const item = document.createElement('div');
      item.className = `timeline-item ${index === visibleStations.length - 1 ? 'active' : ''}`;
      item.innerHTML = '<span class="timeline-point"></span><div><small></small><strong></strong><p></p></div>';
      item.querySelector('small').textContent = formatTime(station.actual_arrival || station.actual_departure || station.scheduled_arrival);
      item.querySelector('strong').textContent = station.station_name || station.station_code || '--';
      item.querySelector('p').textContent = station.station_status || 'Recorded observation';
      return item;
    }));
  }

  if (dashboard) {
    dashboard.hidden = false;
  }
  renderMap(stations);
}

function renderMap(stations) {
  const mapped = stations.filter(station => stationCoordinates[station.station_code]);
  const mappedCountEl = document.querySelector('#mapped-count');
  const mapEmptyEl = document.querySelector('#map-empty');

  if (mappedCountEl) mappedCountEl.textContent = `${mapped.length} mapped stations`;
  if (mapEmptyEl) mapEmptyEl.hidden = mapped.length > 0;

  if (!mapped.length || typeof L === 'undefined') return;

  const mapViewEl = document.querySelector('#route-map-view');
  if (!mapViewEl) return;

  if (routeMap) {
    routeMap.remove();
    routeMap = null;
  }

  routeMap = L.map('route-map-view', { scrollWheelZoom: false }).setView(stationCoordinates[mapped[0].station_code], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(routeMap);

  const points = mapped.map(station => stationCoordinates[station.station_code]);
  if (points.length > 1) {
    L.polyline(points, { color: '#e26a4d', weight: 4 }).addTo(routeMap);
  }

  mapped.forEach((station, index) => {
    L.circleMarker(stationCoordinates[station.station_code], {
      radius: index === mapped.length - 1 ? 9 : 6,
      color: '#fff',
      weight: 2,
      fillColor: index === mapped.length - 1 ? '#e26a4d' : '#0b7773',
      fillOpacity: 1
    })
    .bindPopup(`<strong>${station.station_name || station.station_code}</strong><br>${formatTime(station.actual_arrival || station.actual_departure || station.scheduled_arrival)}`)
    .addTo(routeMap);
  });

  if (points.length > 1) {
    routeMap.fitBounds(points, { padding: [28, 28] });
  }
  setTimeout(() => {
    if (routeMap) routeMap.invalidateSize();
  }, 100);
}

async function fetchAutocompleteSuggestions(query) {
  if (!query || query.trim().length < 1) {
    if (autocompleteList) autocompleteList.hidden = true;
    return;
  }

  const q = query.trim().toLowerCase();

  // Filter local active trains list if loaded
  let matches = [];
  if (availableTrainsList.length > 0) {
    matches = availableTrainsList.filter(t => 
      (t.train_number && t.train_number.toLowerCase().includes(q)) ||
      (t.train_name && t.train_name.toLowerCase().includes(q))
    ).slice(0, 8);
  }

  // Also try API search endpoint if available
  if (matches.length === 0) {
    try {
      const res = await fetch(`/api/trains/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const json = await res.json();
        matches = json.data || [];
      }
    } catch (err) {
      // Ignore API failure
    }
  }

  if (!autocompleteList) return;

  if (matches.length === 0) {
    autocompleteList.hidden = true;
    return;
  }

  autocompleteList.innerHTML = matches.map(t => `
    <div class="autocomplete-item" data-number="${t.train_number}" style="padding: 10px 14px; cursor: pointer; border-bottom: 1px solid #eee; transition: background 0.15s;">
      <strong style="color: #1a1a1a;">${t.train_number}</strong>
      <span style="color: #555; margin-left: 6px;">${t.train_name || ''}</span>
    </div>
  `).join('');

  autocompleteList.hidden = false;

  autocompleteList.querySelectorAll('.autocomplete-item').forEach(item => {
    item.addEventListener('click', () => {
      const selectedNum = item.getAttribute('data-number');
      if (searchInput) searchInput.value = selectedNum;
      if (trainSelect) trainSelect.value = selectedNum;
      autocompleteList.hidden = true;
      searchTrain(selectedNum);
    });
    item.addEventListener('mouseenter', () => item.style.background = '#f0f4f8');
    item.addEventListener('mouseleave', () => item.style.background = '#ffffff');
  });
}

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounceTimer);
    const val = e.target.value;
    searchDebounceTimer = setTimeout(() => fetchAutocompleteSuggestions(val), 250);
  });

  document.addEventListener('click', (e) => {
    if (autocompleteList && !searchInput.contains(e.target) && !autocompleteList.contains(e.target)) {
      autocompleteList.hidden = true;
    }
  });
}

async function searchTrain(trainNumber) {
  const trainNum = String(trainNumber || (searchInput ? searchInput.value : '')).trim();
  if (!trainNum) {
    if (searchMessage) {
      searchMessage.textContent = 'Enter a train number or select from the dropdown to begin.';
      searchMessage.className = 'search-message error';
    }
    if (dashboard) dashboard.hidden = true;
    return;
  }

  if (searchButton) searchButton.disabled = true;
  if (searchMessage) {
    searchMessage.className = 'search-message';
    searchMessage.textContent = 'Loading the latest available observations...';
  }

  try {
    let response = await fetch(`/api/trains/${encodeURIComponent(trainNum)}/live-eta`);
    if (!response.ok) {
      response = await fetch(`/api/train/${encodeURIComponent(trainNum)}`);
    }
    if (!response.ok) {
      response = await fetch(`/api/v1/trains/trains/${encodeURIComponent(trainNum)}`);
    }

    const responseText = await response.text();
    let json;
    try {
      json = JSON.parse(responseText);
    } catch {
      throw new Error(`API returned ${response.status} ${response.statusText}, not valid JSON.`);
    }

    const data = json.data || json;
    if (!response.ok || !data) {
      throw new Error(json.error || `No observations found for train ${trainNum}.`);
    }

    render(data);

    if (searchMessage) {
      searchMessage.className = 'search-message';
      searchMessage.textContent = `Showing data returned for train ${data.train_number}.`;
    }
    if (connectionStatus) {
      connectionStatus.innerHTML = '<span></span> Data source connected';
    }
  } catch (error) {
    if (dashboard) dashboard.hidden = true;
    if (searchMessage) {
      searchMessage.className = 'search-message error';
      searchMessage.textContent = error.message;
    }
  } finally {
    if (searchButton) searchButton.disabled = false;
  }
}

async function loadTrains() {
  const fallbackList = [
    { train_number: "12919", train_name: "Malwa SF Express", source_station: "INDB", destination_station: "SVDK" },
    { train_number: "12920", train_name: "Malwa SF Express", source_station: "SVDK", destination_station: "INDB" },
    { train_number: "12925", train_name: "Paschim SF Express", source_station: "MMCT", destination_station: "ASR" },
    { train_number: "12903", train_name: "Golden Temple Mail", source_station: "MMCT", destination_station: "ASR" },
    { train_number: "12002", train_name: "Bhopal Shatabdi", source_station: "NDLS", destination_station: "RKMP" }
  ];

  try {
    let response = await fetch('/api/trains/available');
    if (!response.ok) {
      response = await fetch('/api/v1/trains/trains');
    }
    if (!response.ok) {
      response = await fetch('/api/trains');
    }

    if (response.ok) {
      const result = await response.json();
      const trains = result.data || result;
      if (Array.isArray(trains) && trains.length > 0) {
        availableTrainsList = trains;
      } else {
        availableTrainsList = fallbackList;
      }
    } else {
      availableTrainsList = fallbackList;
    }
  } catch (err) {
    availableTrainsList = fallbackList;
  }

  if (trainSelect && Array.isArray(availableTrainsList) && availableTrainsList.length > 0) {
    trainSelect.innerHTML = '<option value="">-- Choose an active train --</option>';
    availableTrainsList.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.train_number;
      const namePart = t.train_name ? ` - ${t.train_name}` : '';
      const routePart = t.source_station && t.destination_station ? ` (${t.source_station} → ${t.destination_station})` : '';
      opt.textContent = `${t.train_number}${namePart}${routePart}`;
      trainSelect.appendChild(opt);
    });
  }
}

if (trainSelect) {
  trainSelect.addEventListener('change', () => {
    if (trainSelect.value) {
      if (searchInput) searchInput.value = trainSelect.value;
      searchTrain(trainSelect.value);
    }
  });
}

if (searchForm) {
  searchForm.addEventListener('submit', event => {
    event.preventDefault();
    searchTrain();
  });
}

if (searchInput) {
  searchInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      if (autocompleteList) autocompleteList.hidden = true;
      searchTrain();
    }
  });
}

// Initial load
loadTrains();
