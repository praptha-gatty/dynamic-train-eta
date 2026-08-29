import React, { useState, useEffect, useRef } from 'react';

export default function TrainSearchDashboard() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [availableTrains, setAvailableTrains] = useState([]);
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch available trains on mount
  useEffect(() => {
    fetch('/api/trains/available')
      .then(res => res.json())
      .then(json => setAvailableTrains(json.data || []))
      .catch(err => console.warn('Could not load available trains:', err));
  }, []);

  // Debounced search autocomplete
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/trains/search?q=${encodeURIComponent(query.trim())}`)
        .then(res => res.json())
        .then(json => {
          setSuggestions(json.data || []);
          setShowDropdown(true);
        })
        .catch(err => console.warn('Search autocomplete error:', err));
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle clicking outside dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTrain = (trainNumber) => {
    setQuery(trainNumber);
    setShowDropdown(false);
    loadTrainETA(trainNumber);
  };

  const loadTrainETA = async (trainNumber) => {
    if (!trainNumber) return;
    setLoading(true);
    setError(null);
    try {
      let res = await fetch(`/api/trains/${encodeURIComponent(trainNumber)}/live-eta`);
      if (!res.ok) res = await fetch(`/api/train/${encodeURIComponent(trainNumber)}`);
      const json = await res.json();
      const data = json.data || json;
      if (!res.ok || !data) throw new Error(json.error || `Train ${trainNumber} telemetry not found.`);
      setSelectedTrain(data);
    } catch (err) {
      setError(err.message);
      setSelectedTrain(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header & Search Bar */}
      <div style={{ background: '#0b7773', padding: '24px', borderRadius: '12px', color: '#fff', marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px' }}>Dynamic Train ETA Intelligence</h1>
        <p style={{ margin: '0 0 16px 0', opacity: 0.9 }}>Search live train observations, predictions, and section velocity breakdown.</p>
        
        <div ref={dropdownRef} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', position: 'relative' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search train number or name (e.g. 12919, Malwa)"
              style={{ width: '100%', padding: '12px 16px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '15px', outline: 'none' }}
              onFocus={() => query.trim() && setShowDropdown(true)}
            />
            
            {/* Autocomplete Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', color: '#333', borderRadius: '6px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', zIndex: 100, marginTop: '4px', maxHeight: '220px', overflowY: 'auto' }}>
                {suggestions.map((item) => (
                  <div
                    key={item.train_number}
                    onClick={() => handleSelectTrain(item.train_number)}
                    style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f0f4f8'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                  >
                    <strong>{item.train_number}</strong> - {item.train_name || 'Train'}
                  </div>
                ))}
              </div>
            )}
          </div>

          <select
            onChange={(e) => e.target.value && handleSelectTrain(e.target.value)}
            style={{ padding: '12px 16px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', background: '#fff', cursor: 'pointer' }}
          >
            <option value="">-- Active Trains ({availableTrains.length}) --</option>
            {availableTrains.map(t => (
              <option key={t.train_number} value={t.train_number}>
                {t.train_number} {t.train_name ? `- ${t.train_name}` : ''}
              </option>
            ))}
          </select>

          <button
            onClick={() => handleSelectTrain(query)}
            disabled={loading}
            style={{ padding: '12px 24px', background: '#e26a4d', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {loading ? 'Searching...' : 'Find Train →'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '16px', background: '#fce8e6', color: '#c5221f', borderRadius: '8px', marginBottom: '24px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Selected Train Dashboard */}
      {selectedTrain && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {/* Card 1: Train Status */}
          <div style={{ background: '#fff', border: '1px solid #e0e0e0', padding: '20px', borderRadius: '8px' }}>
            <span style={{ fontSize: '12px', background: '#e8f4f2', color: '#0b7773', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>SELECTED TRAIN</span>
            <h2 style={{ margin: '12px 0 4px 0' }}>{selectedTrain.train_name || 'Train'}</h2>
            <p style={{ margin: 0, color: '#666' }}>Train Number: <strong>{selectedTrain.train_number}</strong></p>
            <hr style={{ margin: '16px 0', borderColor: '#eee' }} />
            <p><strong>Running Status:</strong> {selectedTrain.running_status || 'In Transit'}</p>
            <p><strong>Journey Date:</strong> {selectedTrain.journey_date || 'Current'}</p>
          </div>

          {/* Card 2: Current & Predicted Delay */}
          <div style={{ background: '#fff', border: '1px solid #e0e0e0', padding: '20px', borderRadius: '8px' }}>
            <span style={{ fontSize: '12px', background: '#fce8e6', color: '#c5221f', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>LIVE ETA & DELAY</span>
            <h2 style={{ margin: '12px 0 4px 0', color: selectedTrain.prediction?.total_predicted_delay_minutes > 15 ? '#c5221f' : '#137333' }}>
              +{selectedTrain.prediction?.total_predicted_delay_minutes || selectedTrain.current?.delay_minutes || 0} min
            </h2>
            <p style={{ margin: 0, color: '#666' }}>Recorded Delay: {selectedTrain.current?.delay_minutes || 0} mins</p>
            <hr style={{ margin: '16px 0', borderColor: '#eee' }} />
            <p><strong>Current Station:</strong> {selectedTrain.current?.station_name || selectedTrain.current?.station_code || '--'}</p>
            <p><strong>Effective Speed:</strong> {selectedTrain.current?.speed_kmph || selectedTrain.prediction?.effective_speed_kmph || 45} km/h</p>
            <p><strong>Distance Remaining:</strong> {selectedTrain.current?.distance_remaining_km || selectedTrain.prediction?.distance_remaining_km || 0} km</p>
          </div>

          {/* Card 3: Next Station Overview */}
          <div style={{ background: '#fff', border: '1px solid #e0e0e0', padding: '20px', borderRadius: '8px' }}>
            <span style={{ fontSize: '12px', background: '#e8f0fe', color: '#1a73e8', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>NEXT STATION</span>
            <h2 style={{ margin: '12px 0 4px 0' }}>{selectedTrain.next_station?.station_name || selectedTrain.next_station?.station_code || 'En Route'}</h2>
            <p style={{ margin: 0, color: '#666' }}>Station Code: {selectedTrain.next_station?.station_code || '--'}</p>
            <hr style={{ margin: '16px 0', borderColor: '#eee' }} />
            <p><strong>Explanation:</strong> {selectedTrain.prediction?.explanation || 'Train proceeding along scheduled section route.'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
