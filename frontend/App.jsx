import React, { useState, useEffect } from 'react';
import { useTrainData } from './hooks/useTrainData.js';
import { useWebSocket } from './hooks/useWebSocket.js';
import { Topbar } from './components/Topbar.jsx';
import { TrainSearch } from './components/TrainSearch.jsx';
import { EtaPredictionCard } from './components/EtaPredictionCard.jsx';
import { TrainStatusCard } from './components/TrainStatusCard.jsx';
import { RouteProgressBar } from './components/RouteProgressBar.jsx';
import { DelayAnalytics } from './components/DelayAnalytics.jsx';
import { StationTable } from './components/StationTable.jsx';
import { RouteMap } from './components/RouteMap.jsx';
import { JourneyTimeline } from './components/JourneyTimeline.jsx';
import { DashboardSkeleton } from './components/SkeletonLoader.jsx';
import { LayoutDashboard, Table, Map, Milestone, AlertCircle, Info } from 'lucide-react';

export function App() {
  const {
    trainNumber,
    setTrainNumber,
    journeyDate,
    setJourneyDate,
    targetStationCode,
    updateTargetStation,
    trainData,
    loading,
    etaLoading,
    error,
    lastRefreshed,
    backendStatus,
    loadTrain,
    handleLiveTelemetry
  } = useTrainData('12919');

  const [activeTab, setActiveTab] = useState('overview');

  // WebSocket real-time subscription
  const { isConnected: isWebSocketConnected } = useWebSocket(
    trainData?.train_number,
    trainData?.journey_date,
    handleLiveTelemetry
  );

  // Initial load
  useEffect(() => {
    loadTrain('12919', journeyDate);
  }, []);

  const handleSearch = (searchedTrainNo, searchedDate) => {
    loadTrain(searchedTrainNo, searchedDate);
  };

  const handleRefresh = () => {
    loadTrain(trainNumber, journeyDate, targetStationCode);
  };

  return (
    <div className="app-container" id="top">
      <Topbar
        isWebSocketConnected={isWebSocketConnected}
        isBackendOnline={backendStatus.isOnline}
        lastRefreshed={lastRefreshed}
        onRefresh={handleRefresh}
        loading={loading}
      />

      <main className="app-shell">
        {/* Welcome Hero */}
        <section className="hero-banner">
          <span className="hero-eyebrow">
            <span className="spark-mark">✦</span> Indian Railways Telemetry Platform
          </span>
          <h1 className="hero-headline">
            Know when your train <em>really</em> arrives.
          </h1>
          <p className="hero-subhead">
            Dynamic train ETA and delay forecasting computed from real-time speed, live track observations, and route telemetry.
          </p>
        </section>

        {/* Search & Date Bar */}
        <TrainSearch
          trainNumber={trainNumber}
          setTrainNumber={setTrainNumber}
          journeyDate={journeyDate}
          setJourneyDate={setJourneyDate}
          onSearch={handleSearch}
          loading={loading}
        />

        {/* Error message banner */}
        {error && (
          <div className="search-message-banner error" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Loading state */}
        {loading && <DashboardSkeleton />}

        {/* Main Dashboard view */}
        {!loading && trainData && (
          <div className="dashboard-content">
            {/* View navigation tabs */}
            <nav className="dashboard-tabs" aria-label="Dashboard navigation tabs">
              <button
                type="button"
                className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <LayoutDashboard size={16} />
                <span>Overview</span>
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'stations' ? 'active' : ''}`}
                onClick={() => setActiveTab('stations')}
              >
                <Table size={16} />
                <span>Station ETAs</span>
                <span className="tab-badge">{trainData.stations?.length || 0}</span>
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}
                onClick={() => setActiveTab('map')}
              >
                <Map size={16} />
                <span>Live Route Map</span>
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
                onClick={() => setActiveTab('timeline')}
              >
                <Milestone size={16} />
                <span>Journey Timeline</span>
              </button>
            </nav>

            {/* TAB: OVERVIEW */}
            {activeTab === 'overview' && (
              <>
                <section className="overview-grid">
                  <EtaPredictionCard
                    trainData={trainData}
                    selectedTargetCode={targetStationCode}
                    onTargetChange={updateTargetStation}
                    etaLoading={etaLoading}
                  />

                  <TrainStatusCard trainData={trainData} />
                </section>

                <RouteProgressBar
                  stations={trainData.stations}
                  currentStationCode={trainData.current_status?.station_code}
                  targetStationCode={targetStationCode}
                  onSelectStation={updateTargetStation}
                />

                <DelayAnalytics trainData={trainData} />

                {/* Quick Map preview in Overview */}
                <RouteMap
                  stations={trainData.stations}
                  currentStationCode={trainData.current_status?.station_code}
                  targetStationCode={targetStationCode}
                />
              </>
            )}

            {/* TAB: STATION ETA TABLE */}
            {activeTab === 'stations' && (
              <StationTable
                stations={trainData.stations}
                currentStationCode={trainData.current_status?.station_code}
                targetStationCode={targetStationCode}
                onSelectTargetStation={updateTargetStation}
              />
            )}

            {/* TAB: LIVE ROUTE MAP */}
            {activeTab === 'map' && (
              <RouteMap
                stations={trainData.stations}
                currentStationCode={trainData.current_status?.station_code}
                targetStationCode={targetStationCode}
              />
            )}

            {/* TAB: JOURNEY TIMELINE */}
            {activeTab === 'timeline' && (
              <JourneyTimeline
                stations={trainData.stations}
                currentStationCode={trainData.current_status?.station_code}
              />
            )}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-inner">
          <span className="footer-brand">RAILWISE · Dynamic Train ETA</span>
          <span>Predictions dynamically calculated from live speed, station distance & delay progression</span>
          <span>Telemetry refreshed every 5 minutes</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
