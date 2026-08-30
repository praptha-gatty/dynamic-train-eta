import React, { useState, useEffect } from 'react';
import { useTrainData } from './hooks/useTrainData.js';
import { useWebSocket } from './hooks/useWebSocket.js';
import { Topbar } from './components/Topbar.jsx';
import { TrainSearch } from './components/TrainSearch.jsx';
import { TrainOverviewMetrics } from './components/TrainOverviewMetrics.jsx';
import { EtaPredictionCard } from './components/EtaPredictionCard.jsx';
import { TrainStatusCard } from './components/TrainStatusCard.jsx';
import { RouteProgressBar } from './components/RouteProgressBar.jsx';
import { DelayAnalytics } from './components/DelayAnalytics.jsx';
import { StationTable } from './components/StationTable.jsx';
import { LiveRouteMap } from './components/LiveRouteMap.jsx';
import { JourneyTimeline } from './components/JourneyTimeline.jsx';
import { DashboardSkeleton } from './components/SkeletonLoader.jsx';
import { LayoutDashboard, Table, Map, Milestone, AlertCircle } from 'lucide-react';

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

  // Smooth Auto-Scroll & Viewport Alignment on tab switch
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    const targetElement = document.getElementById('tab-content-container');
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
        {/* Welcome Hero - Collapses into compact persistent header when train is loaded */}
        {!trainData && (
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
        )}

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
          <div className="dashboard-content" id="tab-content-container">
            {/* View navigation tabs (Sticky Nav Bar) */}
            <nav className="dashboard-tabs" aria-label="Dashboard navigation tabs">
              <button
                type="button"
                className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => handleTabChange('overview')}
              >
                <LayoutDashboard size={16} />
                <span>Overview</span>
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'stations' ? 'active' : ''}`}
                onClick={() => handleTabChange('stations')}
              >
                <Table size={16} />
                <span>Station ETAs</span>
                <span className="tab-badge">{trainData.stations?.length || 0}</span>
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}
                onClick={() => handleTabChange('map')}
              >
                <Map size={16} />
                <span>Live Route Map</span>
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
                onClick={() => handleTabChange('timeline')}
              >
                <Milestone size={16} />
                <span>Journey Timeline</span>
              </button>
            </nav>

            {/* TAB: OVERVIEW */}
            {activeTab === 'overview' && (
              <>
                <TrainOverviewMetrics
                  trainData={trainData}
                  onSelectTrain={(no) => loadTrain(no, journeyDate)}
                />

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
                  trainData={trainData}
                  currentStationCode={trainData.current_status?.station_code}
                  targetStationCode={targetStationCode}
                  onSelectStation={updateTargetStation}
                />

                <DelayAnalytics trainData={trainData} />

                {/* Route Map preview in Overview */}
                <LiveRouteMap
                  stations={trainData.stations}
                  trainData={trainData}
                  currentStationCode={trainData.current_status?.station_code}
                  targetStationCode={targetStationCode}
                  liveLocation={trainData.current_status}
                />
              </>
            )}

            {/* TAB: STATION ETA TABLE */}
            {activeTab === 'stations' && (
              <div className="tab-page-view">
                <StationTable
                  stations={trainData.stations}
                  currentStationCode={trainData.current_status?.station_code}
                  targetStationCode={targetStationCode}
                  onSelectTargetStation={updateTargetStation}
                />
              </div>
            )}

            {/* TAB: LIVE ROUTE MAP (Full-Page Expansion) */}
            {activeTab === 'map' && (
              <div className="tab-page-view map-tab-view">
                <LiveRouteMap
                  stations={trainData.stations}
                  trainData={trainData}
                  currentStationCode={trainData.current_status?.station_code}
                  targetStationCode={targetStationCode}
                  liveLocation={trainData.current_status}
                />
              </div>
            )}

            {/* TAB: JOURNEY TIMELINE */}
            {activeTab === 'timeline' && (
              <div className="tab-page-view">
                <JourneyTimeline
                  stations={trainData.stations}
                  currentStationCode={trainData.current_status?.station_code}
                />
              </div>
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
