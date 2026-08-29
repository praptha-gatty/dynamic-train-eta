import React, { useState, useEffect, useRef } from 'react';

export default function TrainHistoryViewer() {
  const [query, setQuery] = useState('');
  const [availableTrains, setAvailableTrains] = useState([]);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [selectedTrainNumber, setSelectedTrainNumber] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [trainMeta, setTrainMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // 1. Load lightweight available train summary list on mount
  useEffect(() => {
    fetch('/api/trains/available')
      .then(res => res.json())
      .then(json => setAvailableTrains(json.data || []))
      .catch(err => console.warn('Error loading available trains:', err));
  }, []);

  // 2. Debounced search autocomplete
  useEffect(() => {
    if (!query.trim()) {
      setAutocompleteSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/trains/search?q=${encodeURIComponent(query.trim())}`)
        .then(res => res.json())
        .then(json => {
          setAutocompleteSuggestions(json.data || []);
          setShowDropdown(true);
        })
        .catch(err => console.warn('Autocomplete fetch error:', err));
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle click outside dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 3. Dedicated getTrainHistory fetcher strictly filtered by train_number
  const fetchTrainHistory = async (trainNumber) => {
    const cleanNum = String(trainNumber || '').trim();
    if (!cleanNum) return;

    setSelectedTrainNumber(cleanNum);
    setQuery(cleanNum);
    setShowDropdown(false);
    setLoading(true);
    setError(null);

    try {
      // Query dedicated train history endpoint
      let res = await fetch(`/api/trains/${encodeURIComponent(cleanNum)}/history?limit=500`);
      if (!res.ok) {
        res = await fetch(`/api/trains/${encodeURIComponent(cleanNum)}/live-eta`);
      }

      const json = await res.json();
      const records = json.data?.stations || json.data || [];

      if (!res.ok || records.length === 0) {
        throw new Error(json.error || `No history records found for train ${cleanNum}`);
      }

      // Sort strictly by station_sequence ASC
      const sorted = [...records].sort((a, b) => Number(a.station_sequence || 0) - Number(b.station_sequence || 0));
      setHistoryRecords(sorted);

      const firstRow = sorted[0] || {};
      setTrainMeta({
        train_number: cleanNum,
        train_name: firstRow.train_name || `Train ${cleanNum}`,
        journey_date: firstRow.journey_date || 'Current',
        total_stations: sorted.length,
        current_station: sorted.find(r => r.is_current_location)?.current_station || firstRow.current_station
      });
    } catch (err) {
      setError(err.message);
      setHistoryRecords([]);
      setTrainMeta(null);
    } style={{}} finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header & Search */}
      <div style={{ background: '#0b7773', padding: '24px', borderRadius: '12px', color: '#fff', marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '26px' }}>Train History & Telemetry Viewer</h1>
        <p style={{ margin: '0 0 16px 0', opacity: 0.9 }}>Select or search a train number to view its complete ordered station timeline without truncation.</p>

        <div ref={dropdownRef} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', position: 'relative' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search train number or name (e.g. 11121, 12919)"
              style={{ width: '100%', padding: '12px 16px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '15px', outline: 'none' }}
              onFocus={() => query.trim() && setShowDropdown(true)}
            />

            {/* Autocomplete Dropdown */}
            {showDropdown && autocompleteSuggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', color: '#333', borderRadius: '6px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', zIndex: 100, marginTop: '4px', maxHeight: '220px', overflowY: 'auto' }}>
                {autocompleteSuggestions.map((t) => (
                  <div
                    key={t.train_number}
                    onClick={() => fetchTrainHistory(t.train_number)}
                    style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f0f4f8'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                  >
                    <strong>{t.train_number}</strong> — {t.train_name || 'Train'}
                  </div>
                ))}
              </div>
            )}
          </div>

          <select
            onChange={(e) => e.target.value && fetchTrainHistory(e.target.value)}
            style={{ padding: '12px 16px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', background: '#fff', cursor: 'pointer' }}
          >
            <option value="">-- Choose active train ({availableTrains.length}) --</option>
            {availableTrains.map(t => (
              <option key={t.train_number} value={t.train_number}>
                {t.train_number} {t.train_name ? `- ${t.train_name}` : ''} ({t.running_status || 'active'})
              </option>
            ))}
          </select>

          <button
            onClick={() => fetchTrainHistory(query)}
            disabled={loading}
            style={{ padding: '12px 24px', background: '#e26a4d', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {loading ? 'Loading...' : 'View History →'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '16px', background: '#fce8e6', color: '#c5221f', borderRadius: '8px', marginBottom: '24px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Train Metadata Summary */}
      {trainMeta && (
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', padding: '20px', borderRadius: '8px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '22px' }}>{trainMeta.train_name}</h2>
            <p style={{ margin: 0, color: '#666' }}>Train Number: <strong>{trainMeta.train_number}</strong> &bull; Journey Date: <strong>{trainMeta.journey_date}</strong></p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '14px', background: '#e8f4f2', color: '#0b7773', padding: '6px 12px', borderRadius: '16px', fontWeight: 'bold' }}>
              {trainMeta.total_stations} Stations Loaded (Complete)
            </span>
          </div>
        </div>
      )}

      {/* Complete Ordered Station Timeline Table */}
      {historyRecords.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee', color: '#555' }}>
                <th style={{ padding: '12px 16px' }}>Seq</th>
                <th style={{ padding: '12px 16px' }}>Code</th>
                <th style={{ padding: '12px 16px' }}>Station Name</th>
                <th style={{ padding: '12px 16px' }}>Sched. Arrival</th>
                <th style={{ padding: '12px 16px' }}>Actual Arrival</th>
                <th style={{ padding: '12px 16px' }}>Delay</th>
                <th style={{ padding: '12px 16px' }}>Distance</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {historyRecords.map((r, idx) => {
                const delay = Number(r.delay_minutes || 0);
                const isCur = Boolean(r.is_current_location);
                return (
                  <tr
                    key={r.history_id || idx}
                    style={{
                      borderBottom: '1px solid #eee',
                      background: isCur ? '#fff8e6' : 'transparent',
                      fontWeight: isCur ? 'bold' : 'normal'
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>{r.station_sequence || idx + 1}</td>
                    <td style={{ padding: '12px 16px' }}><code style={{ background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>{r.station_code || '--'}</code></td>
                    <td style={{ padding: '12px 16px' }}>
                      {r.current_station || r.station_name || '--'}
                      {isCur && <span style={{ marginLeft: '8px', fontSize: '11px', background: '#e26a4d', color: '#fff', padding: '2px 6px', borderRadius: '10px' }}>Current Position</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{r.scheduled_arrival || '--'}</td>
                    <td style={{ padding: '12px 16px' }}>{r.actual_arrival || '--'}</td>
                    <td style={{ padding: '12px 16px', color: delay > 15 ? '#c5221f' : '#137333' }}>
                      {delay > 0 ? `+${delay} min` : 'On time'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{r.distance_from_origin_km != null ? `${r.distance_from_origin_km} km` : '--'}</td>
                    <td style={{ padding: '12px 16px', color: '#666' }}>{r.running_status || (isCur ? 'Live' : 'Completed')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
