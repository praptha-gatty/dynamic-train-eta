const fs = require('fs');
const path = require('path');
const http = require('http');
const { parse } = require('csv-parse/sync');

const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = path.join(__dirname, '..', 'data', 'processed', 'train_history_clean.csv');
const FRONTEND_DIR = path.join(__dirname, '..', 'data');

function readRows() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return parse(fs.readFileSync(DATA_FILE, 'utf8'), { columns: true, skip_empty_lines: true });
}

function trainData(trainNumber) {
  const rows = readRows().filter(row => String(row.train_number) === trainNumber);
  if (!rows.length) return null;
  const latestCapture = rows.reduce((latest, row) => row.captured_at > latest ? row.captured_at : latest, rows[0].captured_at);
  const snapshot = rows
    .filter(row => row.captured_at === latestCapture)
    .sort((a, b) => Number(a.station_sequence) - Number(b.station_sequence))
    .map(row => ({
      ...row,
      expected_delay_minutes: row.delay_minutes === '' ? null : Number(row.delay_minutes)
    }));
  const current = snapshot.reduce((latest, row) => Number(row.station_sequence) > Number(latest.station_sequence) ? row : latest, snapshot[0]);
  return {
    train_number: trainNumber,
    train_name: current.train_name || null,
    captured_at: latestCapture,
    distance_km: current.distance_from_origin_km === '' ? null : Number(current.distance_from_origin_km),
    delay_minutes: current.delay_minutes === '' ? null : Number(current.delay_minutes),
    expected_delay_minutes: current.expected_delay_minutes,
    arrival_delay_minutes: current.arrival_delay_minutes === '' ? null : Number(current.arrival_delay_minutes),
    departure_delay_minutes: current.departure_delay_minutes === '' ? null : Number(current.departure_delay_minutes),
    distance_from_origin_km: current.distance_from_origin_km === '' ? null : Number(current.distance_from_origin_km),
    distance_from_last_station_km: current.distance_from_last_station_km === '' ? null : Number(current.distance_from_last_station_km),
    distance_remaining_km: current.distance_remaining_km === '' ? null : Number(current.distance_remaining_km),
    speed_kmph: current.speed_kmph === '' ? null : Number(current.speed_kmph),
    current,
    stations: snapshot
  };
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  response.end(JSON.stringify(body));
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const match = requestUrl.pathname.match(/^\/api\/train\/([^/]+)$/);
  if (match) {
    const data = trainData(decodeURIComponent(match[1]));
    return data ? sendJson(response, 200, data) : sendJson(response, 404, { error: 'No processed observations found for that train number.' });
  }
  const relativePath = requestUrl.pathname === '/' ? 'index.html' : requestUrl.pathname.slice(1);
  const filePath = path.resolve(FRONTEND_DIR, relativePath);
  if (!filePath.startsWith(path.resolve(FRONTEND_DIR)) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return sendJson(response, 404, { error: 'Not found' });
  const contentTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jsx': 'text/javascript; charset=utf-8' };
  response.writeHead(200, { 'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(response);
});

server.listen(PORT, () => console.log(`Railwise frontend available at http://localhost:${PORT}`));
