import React, { useState, useEffect } from 'react';
import { RefreshCw, Train } from 'lucide-react';

export function Topbar({
  isWebSocketConnected,
  isBackendOnline,
  lastRefreshed,
  onRefresh,
  loading
}) {
  const [time, setTime] = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  const isConnected = Boolean(
    isWebSocketConnected ||
    (typeof isBackendOnline === 'object' ? (isBackendOnline?.isOnline || isBackendOnline?.isConnected) : isBackendOnline)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a href="#top" className="brand" aria-label="Railwise Dynamic Train ETA Home">
          <div className="brand-mark">
            <Train size={18} strokeWidth={2.5} />
          </div>
          <div className="brand-text">
            <span className="brand-title">Railwise</span>
            <span className="brand-tag">DYNAMIC TRAIN ETA</span>
          </div>
        </a>

        <div className="topbar-right">
          {/* Connection status badge */}
          <div
            className={`connection-pill ${isWebSocketConnected ? 'live' : isConnected ? 'connected' : 'offline'}`}
            title={
              isWebSocketConnected
                ? 'WebSocket live stream active'
                : isConnected
                ? 'Express & Python ML API connected'
                : 'Local / demo mode'
            }
          >
            <span className="pulse-indicator" />
            <span className="connection-text">
              {isWebSocketConnected
                ? 'Live Stream Active'
                : isConnected
                ? 'API Connected'
                : 'Demo Mode'}
            </span>
          </div>

          {/* Local Clock */}
          <div className="system-time" title="Current Local Time">
            <span className="time-val">{time}</span>
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              type="button"
              className={`refresh-button ${loading ? 'spinning' : ''}`}
              onClick={onRefresh}
              disabled={loading}
              title="Refresh live train observations"
              aria-label="Refresh train data"
            >
              <RefreshCw size={15} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;
