import React, { useState, useEffect, useRef } from 'react';

export default function LiveTrainDashboard() {
  const [query, setQuery] = useState('');
  const [activeTrainStatuses, setActiveTrainStatuses] = useState([]);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [selectedTrainNumber, setSelectedTrainNumber] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [selectedMeta, setSelectedMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // 1. Fetch live status summary for ALL active trains on mount (~10 rows total, no limit cutoffs)
  useEffect(() => {
    fetch('/api/trains/live-dashboard')
      .then(res => res.json())
      .then(json => setActiveTrainStatuses(json.data || []))
      .catch(err => console.warn('Error loading live dashboard overview:', err));
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
        .catch(err => console.warn('Autocomplete search error:', err));
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener for autocomplete dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 3. Strict station history fetcher for selected train
  const fetchTrainHistory = async (trainNumber) => {
    const cleanNum = String(trainNumber || '').trim();
    if (!cleanNum) return;

    setSelectedTrainNumber(cleanNum);
    setQuery(cleanNum);
    setShowDropdown(false);
    setLoading(true);
    setError(null);

    try {
      let res = await fetch(`/api/trains/${encodeURIComponent(cleanNum)}/history?limit=500`);
      if (!res.ok) res = await fetch(`/api/trains/${encodeURIComponent(cleanNum)}/live-eta`);
      const json = await res.json();
      const records = json.data?.stations || json.data || [];

      if (!res.ok || records.length === 0) {
        throw new Error(json.error || `No telemetry history found for train ${cleanNum}`);
      }

      // Sort strictly by station_sequence ASC
      const sorted = [...records].sort((a, b) => Number(a.station_sequence || 0) - Number(b.station_sequence || 0));
      setHistoryRecords(sorted);

      const firstRow = sorted[0] || {};
      setSelectedMeta({
        train_number: cleanNum,
        train_name: firstRow.train_name || `Train ${cleanNum}`,
        journey_date: firstRow.journey_date || 'Current',
        total_stations: sorted.length
      });
    } catch (err) {
      setError(err.message);
      setHistoryRecords([]);
      setSelectedMeta(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Top Banner & Search */}
      <div style={{ background: '#0b7773', padding: '24px', borderRadius: '12px', color: '#fff', marginBottom: '28px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px' }}>Multi-Train Live Tracking Dashboard</h1>
        <p style={{ margin: '0 0 20px 0', opacity: 0.9 }}>Monitor all active trains simultaneously or search a specific train for its complete station timeline.</p>

        <div ref={dropdownRef} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', position: 'relative' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search train number or name (e.g. 12925, 11121, Malwa)"
              style={{ width: '100%', padding: '12px 16px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '15px', outline: 'none' }}
              onFocus={() => query.trim() && setShowDropdown(true)}
            />

            {/* Autocomplete Suggestions Dropdown */}
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
            <option value="">-- Active Trains ({activeTrainStatuses.length}) --</option>
            {activeTrainStatuses.map(t => (
              <option key={t.train_number} value={t.train_number}>
                {t.train_number} - {t.train_name} (+{t.delay_minutes || 0}m)
              </option>
            ))}
          </select>

          <button
            onClick={() => fetchTrainHistory(query)}
            disabled={loading}
            style={{ padding: '12px 24px', background: '#e26a4d', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {loading ? 'Loading...' : 'Inspect History →'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '16px', background: '#fce8e6', color: '#c5221f', borderRadius: '8px', marginBottom: '24px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* SECTION 1: ALL ACTIVE TRAINS LIVE OVERVIEW GRID (Pulled from train_current_status - No Row Limits) */}
      {!selectedMeta && activeTrainStatuses.length > 0 && (
        <div>
          <h2 style={{ fontSize: '20px', margin: '0 0 16px 0', color: '#333' }}>Live Status Overview — All Active Trains ({activeTrainStatuses.length})</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            {activeTrainStatuses.map(t => {
              const delay = Number(t.delay_minutes || 0);
              return (
                <div
                  key={t.train_number}
                  onClick={() => fetchTrainHistory(t.train_number)}
                  style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0b7773', background: '#e8f4f2', padding: '2px 8px', borderRadius: '4px' }}>{t.train_number}</span>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: delay > 15 ? '#c5221f' : '#137333' }}>
                      {delay > 0 ? `+${delay} min delay` : 'On time'}
                    </span>
                  </div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#111' }}>{t.train_name}</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                    {t.source_station && t.destination_station ? `${t.source_station} → ${t.destination_station}` : `Status: ${t.running_status}`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: FILTERED STATION TIMELINE FOR SELECTED TRAIN */}
      {selectedMeta && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '24px' }}>{selectedMeta.train_name} ({selectedMeta.train_number})</h2>
              <p style={{ margin: 0, color: '#666' }}>Complete Route Sequence &bull; <strong>{selectedMeta.total_stations} Stations</strong></p>
            </div>
            <button
              onClick={() => { setSelectedMeta(null); setHistoryRecords([]); }}
              style={{ background: '#eee', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
            >
              ✕ Back to Overview
            </button>
          </div>

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
                        {isCur && <span style={{ marginLeft: '8px', fontSize: '11px', background: '#e26a4d', color: '#fff', padding: '2px 6px', borderRadius: '10px' }}>Current Location</span>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>{r.scheduled_arrival || '--'}</td>
                      <td style={{ padding: '12px 16px' }}>{r.actual_arrival || '--'}</td>
                      <td style={{ padding: '12px 16px', color: delay > 15 ? '#c5221f' : '#137333' }}>
                        {delay > 0 ? `+${delay} min` : 'On time'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>{r.distance_from_origin_km != null ? `${r.distance_from_origin_km} km` : '--'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
