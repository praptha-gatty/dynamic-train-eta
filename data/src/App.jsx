import React, { useState } from 'react';
import { TrainSearch } from './components/TrainSearch';
import { useTrainData } from './hooks/useTrainData';

export default function App() {
  // 1. Reactive state - initialized without hardcoded train defaults
  const [trainNumber, setTrainNumber] = useState('');
  const [journeyDate, setJourneyDate] = useState('');

  // 2. Consume custom hook with strict filtering by trainNumber
  const { trainStatus, stationTimeline, loading, error, isNotFound } = useTrainData(trainNumber, journeyDate);

  // 3. Search handler with input sanitization
  const handleSearch = (searchedTrainNo, searchedDate) => {
    const cleanTrainNo = searchedTrainNo ? String(searchedTrainNo).trim() : '';
    const cleanDate = searchedDate ? String(searchedDate).trim() : '';

    if (cleanTrainNo) {
      setTrainNumber(cleanTrainNo);
      if (cleanDate) {
        setJourneyDate(cleanDate);
      }
    }
  };

  return (
    <div style={{ maxWidth: 1150, margin: '0 auto', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Search Header */}
      <TrainSearch onSearch={handleSearch} initialTrainNumber={trainNumber} loading={loading} />

      {/* Error / Not Found Message */}
      {error && (
        <div style={{ padding: '16px', background: '#fce8e6', color: '#c5221f', borderRadius: '8px', marginBottom: '24px' }}>
          <strong>Notification:</strong> {error}
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#0b7773', fontWeight: 'bold' }}>
          Loading telemetry & station timeline for Train {trainNumber}...
        </div>
      )}

      {/* Main Content Dashboard */}
      {!loading && trainStatus && (
        <div>
          {/* Status Summary Card */}
          <div style={{ background: '#fff', border: '1px solid #e0e0e0', padding: '20px', borderRadius: '8px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '12px', background: '#e8f4f2', color: '#0b7773', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>ACTIVE TRAIN</span>
              <h2 style={{ margin: '8px 0 4px 0', fontSize: '24px' }}>{trainStatus.train_name || `Train ${trainNumber}`}</h2>
              <p style={{ margin: 0, color: '#666' }}>Train Number: <strong>{trainStatus.train_number}</strong> &bull; Journey Date: <strong>{trainStatus.journey_date || 'Current'}</strong></p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: (trainStatus.delay_minutes || 0) > 15 ? '#c5221f' : '#137333' }}>
                {(trainStatus.delay_minutes || 0) > 0 ? `+${trainStatus.delay_minutes} min delay` : 'On Time'}
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>
                Status: <strong>{trainStatus.status || 'running'}</strong>
              </p>
            </div>
          </div>

          {/* Ordered Station Sequence Timeline Table */}
          {stationTimeline.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', background: '#f8f9fa', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '18px' }}>Station Sequence Timeline</h3>
                <span style={{ fontSize: '13px', color: '#0b7773', fontWeight: 'bold' }}>{stationTimeline.length} Route Stations</span>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#fafafa', borderBottom: '2px solid #eee', color: '#555' }}>
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
                  {stationTimeline.map((r, idx) => {
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
                        <td style={{ padding: '12px 16px' }}>{r.next_station_sequence || r.station_sequence || idx + 1}</td>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
