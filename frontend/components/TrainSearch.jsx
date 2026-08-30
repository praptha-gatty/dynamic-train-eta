import React, { useState, useEffect, useRef } from 'react';
import { Search, Calendar, ArrowRight, Zap, Train, MapPin } from 'lucide-react';
import { POPULAR_TRAINS } from '../services/fallbackData.js';
import { searchTrains } from '../services/api.js';

export function TrainSearch({
  trainNumber,
  setTrainNumber,
  journeyDate,
  setJourneyDate,
  onSearch,
  loading
}) {
  const [inputVal, setInputVal] = useState(trainNumber);
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Sync internal state when external trainNumber prop changes
  useEffect(() => {
    setInputVal(trainNumber);
  }, [trainNumber]);

  // Live autocomplete debounced search
  useEffect(() => {
    const trimmed = inputVal.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchTrains(trimmed);
        setSuggestions(results || []);
        setShowDropdown((results && results.length > 0));
      } catch (err) {
        console.warn('Search suggestions error:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [inputVal]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTrain = (tNo) => {
    const clean = String(tNo).trim();
    setInputVal(clean);
    setTrainNumber(clean);
    setShowDropdown(false);
    onSearch(clean, journeyDate);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const clean = inputVal.trim();
    if (clean) {
      // If user typed train number directly
      const matched = suggestions.find(s => s.train_number === clean);
      const targetNo = matched ? matched.train_number : clean;
      setShowDropdown(false);
      setTrainNumber(targetNo);
      onSearch(targetNo, journeyDate);
    }
  };

  return (
    <section className="search-section">
      <form className="search-box" onSubmit={handleSubmit} role="search" aria-label="Train search form">
        <div className="search-input-group train-no-group" ref={dropdownRef}>
          <label htmlFor="train-no-input">Train Number or Name</label>
          <div className="input-field-wrapper">
            <Search className="input-icon" size={18} />
            <input
              id="train-no-input"
              type="text"
              placeholder="e.g. 12919 or Malwa Express"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
              autoComplete="off"
            />
            {searchLoading && <span className="search-spinner-inline" />}
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <ul className="search-dropdown-menu" role="listbox">
              {suggestions.map((train) => (
                <li
                  key={train.train_number}
                  className="search-dropdown-item"
                  role="option"
                  aria-selected={inputVal === train.train_number}
                  onClick={() => handleSelectTrain(train.train_number)}
                >
                  <div className="dropdown-item-left">
                    <Train size={16} className="dropdown-train-icon" />
                    <div>
                      <span className="dropdown-train-no">{train.train_number}</span>
                      <strong className="dropdown-train-name">{train.train_name}</strong>
                    </div>
                  </div>
                  {(train.source_station || train.destination_station) && (
                    <div className="dropdown-route">
                      <MapPin size={12} />
                      <span>{train.source_station || '--'} → {train.destination_station || '--'}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="search-input-group date-group">
          <label htmlFor="journey-date-input">Journey Date</label>
          <div className="input-field-wrapper">
            <Calendar className="input-icon" size={18} />
            <input
              id="journey-date-input"
              type="date"
              value={journeyDate}
              onChange={(e) => setJourneyDate(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          className="search-submit-button"
          disabled={loading || !inputVal.trim()}
          aria-label="Search Train"
        >
          {loading ? (
            <span className="btn-loading">Locating...</span>
          ) : (
            <>
              <span>Find Train</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {/* Quick selection chips */}
      <div className="quick-trains-bar">
        <span className="quick-label">
          <Zap size={13} className="quick-icon" /> Popular:
        </span>
        <div className="quick-chips">
          {POPULAR_TRAINS.map((item) => {
            const isSelected = inputVal === item.trainNumber;
            return (
              <button
                key={item.trainNumber}
                type="button"
                className={`quick-chip ${isSelected ? 'active' : ''}`}
                onClick={() => handleSelectTrain(item.trainNumber)}
                disabled={loading}
              >
                <span className="chip-no">{item.trainNumber}</span>
                <span className="chip-name">{item.trainName}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
