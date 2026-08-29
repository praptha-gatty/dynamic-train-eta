import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://rwkcsfdmfhaxsaetzuzj.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_i4cahjdwkuyHW0Ir4_vvEA_cRCmZp1b';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * TrainSearch Autocomplete Component.
 * Queries lightweight public.train_current_status / public.trains summary tables.
 * 
 * @param {object} props
 * @param {function} props.onSearch Callback (trainNumber, journeyDate) => void
 * @param {string} props.initialTrainNumber Initial input value
 * @param {boolean} props.loading Search loading state
 */
export function TrainSearch({ onSearch, initialTrainNumber = '', loading = false }) {
  const [query, setQuery] = useState(initialTrainNumber);
  const [activeTrainList, setActiveTrainList] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Sync prop changes
  useEffect(() => {
    if (initialTrainNumber) {
      setQuery(initialTrainNumber);
    }
  }, [initialTrainNumber]);

  // Load lightweight list of active trains from train_current_status / trains on mount
  useEffect(() => {
    async function loadSummaryTrains() {
      try {
        // Query train_current_status summary table (1 row per train)
        const { data: statusRows } = await supabase
          .from('train_current_status')
          .select('train_number, status, delay_minutes')
          .order('captured_at', { ascending: false });

        // Query trains master table
        const { data: masterRows } = await supabase
          .from('trains')
          .select('train_number, train_name, source_station, destination_station');

        const masterMap = new Map();
        (masterRows || []).forEach(t => {
          if (t.train_number) masterMap.set(String(t.train_number).trim(), t);
        });

        const listMap = new Map();

        (statusRows || []).forEach(s => {
          const num = String(s.train_number || '').trim();
          if (num && !listMap.has(num)) {
            const master = masterMap.get(num) || {};
            listMap.set(num, {
              train_number: num,
              train_name: master.train_name || `Train ${num}`,
              source_station: master.source_station,
              destination_station: master.destination_station,
              status: s.status || 'running',
              delay_minutes: s.delay_minutes ?? 0
            });
          }
        });

        // Add remaining master trains if not in status table
        (masterRows || []).forEach(t => {
          const num = String(t.train_number || '').trim();
          if (num && !listMap.has(num)) {
            listMap.set(num, {
              train_number: num,
              train_name: t.train_name || `Train ${num}`,
              source_station: t.source_station,
              destination_station: t.destination_station,
              status: 'scheduled',
              delay_minutes: 0
            });
          }
        });

        setActiveTrainList(Array.from(listMap.values()));
      } catch (err) {
        console.warn('TrainSearch could not load summary trains:', err.message);
      }
    }

    loadSummaryTrains();
  }, []);

  // 300ms Debounced autocomplete search matching query against train_number or train_name
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(() => {
      const filtered = activeTrainList.filter(t => 
        t.train_number.toLowerCase().includes(q) || 
        t.train_name.toLowerCase().includes(q)
      );
      setSuggestions(filtered);
      setShowDropdown(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, activeTrainList]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e?.preventDefault();
    const cleanNo = query.trim();
    if (cleanNo && onSearch) {
      setShowDropdown(false);
      onSearch(cleanNo);
    }
  };

  const handleSelectOption = (trainNo) => {
    setQuery(trainNo);
    setShowDropdown(false);
    if (onSearch) {
      onSearch(trainNo);
    }
  };

  return (
    <div style={{ background: '#0b7773', padding: '24px', borderRadius: '12px', color: '#fff', marginBottom: '24px' }}>
      <h2 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>Dynamic Train ETA Search</h2>
      <p style={{ margin: '0 0 16px 0', opacity: 0.9 }}>Enter a train number or train name to inspect live movement telemetry and station timeline.</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div ref={dropdownRef} style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter train number or name (e.g. 12925, 11121, Malwa)"
            style={{ width: '100%', padding: '12px 16px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '15px', outline: 'none', color: '#333' }}
            onFocus={() => query.trim() && setShowDropdown(true)}
          />

          {/* Autocomplete Dropdown List */}
          {showDropdown && suggestions.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', color: '#333', borderRadius: '6px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', zIndex: 100, marginTop: '4px', maxHeight: '220px', overflowY: 'auto' }}>
              {suggestions.map((t) => (
                <div
                  key={t.train_number}
                  onClick={() => handleSelectOption(t.train_number)}
                  style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f0f4f8'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                >
                  <strong style={{ color: '#0b7773' }}>{t.train_number}</strong> — {t.train_name}
                  {t.delay_minutes > 0 ? (
                    <span style={{ float: 'right', color: '#c5221f', fontSize: '12px', fontWeight: 'bold' }}>+{t.delay_minutes}m delay</span>
                  ) : (
                    <span style={{ float: 'right', color: '#137333', fontSize: '12px' }}>On time</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <select
          onChange={(e) => e.target.value && handleSelectOption(e.target.value)}
          style={{ padding: '12px 16px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', background: '#fff', color: '#333', cursor: 'pointer' }}
        >
          <option value="">-- Active Trains ({activeTrainList.length}) --</option>
          {activeTrainList.map(t => (
            <option key={t.train_number} value={t.train_number}>
              {t.train_number} - {t.train_name}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={loading}
          style={{ padding: '12px 24px', background: '#e26a4d', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {loading ? 'Searching...' : 'Find Train →'}
        </button>
      </form>
    </div>
  );
}
