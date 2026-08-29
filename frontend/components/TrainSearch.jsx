import React, { useState } from 'react';
import { Search, Calendar, ArrowRight, Zap } from 'lucide-react';
import { POPULAR_TRAINS } from '../services/fallbackData.js';

export function TrainSearch({
  trainNumber,
  setTrainNumber,
  journeyDate,
  setJourneyDate,
  onSearch,
  loading
}) {
  const [inputVal, setInputVal] = useState(trainNumber);

  const handleSubmit = (e) => {
    e.preventDefault();
    const clean = inputVal.trim();
    if (clean) {
      setTrainNumber(clean);
      onSearch(clean, journeyDate);
    }
  };

  const handleQuickSelect = (tNo) => {
    setInputVal(tNo);
    setTrainNumber(tNo);
    onSearch(tNo, journeyDate);
  };

  return (
    <section className="search-section">
      <form className="search-box" onSubmit={handleSubmit} role="search" aria-label="Train search form">
        <div className="search-input-group train-no-group">
          <label htmlFor="train-no-input">Train Number</label>
          <div className="input-field-wrapper">
            <Search className="input-icon" size={18} />
            <input
              id="train-no-input"
              type="text"
              pattern="[0-9]{5}"
              maxLength={5}
              placeholder="e.g. 12919"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value.replace(/\D/g, '').slice(0, 5))}
              autoComplete="off"
            />
          </div>
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
                onClick={() => handleQuickSelect(item.trainNumber)}
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
