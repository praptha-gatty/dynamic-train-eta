import React from 'react';
import {
  AlertTriangle,
  Gauge,
  HelpCircle,
  Activity,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  PauseCircle,
  CalendarClock,
  TrendingUp,
  TrendingDown,
  BellRing,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { formatDelay, formatSpeed, formatDistance } from '../utils/formatters.js';
import { getZeroSpeedHaltReason } from '../utils/haltReasons.js';

export function DelayAnalytics({ trainData }) {
  if (!trainData) return null;

  const isYetToStart = trainData.running_status === 'YET_TO_START' ||
    trainData.current_status?.status === 'SCHEDULED' ||
    Boolean(trainData.journey_date && trainData.journey_date > new Date().toISOString().split('T')[0]);

  const current = trainData.current_status || {};
  const prediction = trainData.prediction || {};
  const delayMinutes = isYetToStart ? 0 : (current.delay_minutes ?? prediction.current_delay_minutes ?? 0);
  const speed = isYetToStart ? 0 : (current.speed_kmph ?? prediction.effective_speed_kmph ?? 0);
  const delayInfo = isYetToStart ? { text: 'On Time (Scheduled)', statusClass: 'on-time' } : formatDelay(delayMinutes);

  const zeroSpeedHaltReason = isYetToStart
    ? 'Awaiting Scheduled Departure'
    : getZeroSpeedHaltReason({
        speed,
        isHalt: current.is_halt,
        stationName: current.station_name,
        stationCode: current.station_code
      });

  // Delay Recovery Feasibility Metric
  const recoveryFeasibility = React.useMemo(() => {
    if (isYetToStart) {
      return {
        percent: 95,
        rating: 'High Feasibility',
        statusClass: 'high',
        text: 'Scheduled departure corridor with standard operational margin.'
      };
    }
    if (delayMinutes <= 10 && speed >= 60) {
      return {
        percent: 85,
        rating: 'High Recovery Potential (85%)',
        statusClass: 'high',
        text: 'Clear high-speed double-line track ahead. High potential to recover 15-25 mins across downstream section.'
      };
    }
    if (delayMinutes <= 30) {
      return {
        percent: 58,
        rating: 'Moderate Recovery (58%)',
        statusClass: 'medium',
        text: 'Intermediate section timetable buffer allows moderate recovery of 5-10 mins with sectional clearance.'
      };
    }
    return {
      percent: 22,
      rating: 'Low Recovery (<30%)',
      statusClass: 'low',
      text: 'Single-track section & heavy freight movement ahead. Delay expected to persist through junction bottleneck.'
    };
  }, [isYetToStart, delayMinutes, speed]);

  // Smart Passenger Advisory
  const passengerAdvisory = React.useMemo(() => {
    if (isYetToStart) {
      return {
        severity: 'info',
        title: 'Scheduled Timetable Active',
        message: `Train is scheduled to commence journey from ${current.station_name || 'Origin'} on ${trainData.journey_date}. Check platform screens upon station arrival.`
      };
    }
    if (delayMinutes >= 60) {
      return {
        severity: 'critical',
        title: 'Buffer Advisory: Connecting Departures at Risk',
        message: 'Connecting train departures within 1 hour may be at risk. Advised to inform onboard TTE for connecting train assistance or plan transfers.'
      };
    }
    if (speed === 0 && zeroSpeedHaltReason) {
      return {
        severity: 'warning',
        title: 'Stationary Telemetry Observation',
        message: `${zeroSpeedHaltReason}. ETA engine dynamic acceleration buffer will adjust upon clearance.`
      };
    }
    if (delayMinutes <= 15) {
      return {
        severity: 'success',
        title: 'Connecting Train Safety Buffer',
        message: 'Connecting Buffer: Safe buffer (>45m) for onward connecting trains and transfers at destination.'
      };
    }
    return {
      severity: 'warning',
      title: 'Moderate Delay Alert',
      message: `Running with ${delayMinutes}m delay. Downstream slack buffers actively modeled in dynamic ETA prediction.`
    };
  }, [isYetToStart, delayMinutes, speed, zeroSpeedHaltReason, current, trainData]);

  // Derive "Why Delayed?" Root Cause Explanation (from backend ML/physics or live telemetry)
  const delayExplanation = isYetToStart ? {
    root_cause: 'Scheduled Run',
    explanation: `Train journey is scheduled for ${trainData.journey_date}. Official timetable schedule active.`,
    severity: 'nominal',
    summary: `Scheduled departure from ${current.station_name || current.station_code || 'Origin'}.`
  } : (prediction.delay_explanation || {
    root_cause: zeroSpeedHaltReason
      ? (zeroSpeedHaltReason.includes('Junction') ? 'Junction Queuing' : zeroSpeedHaltReason.includes('Halt') ? 'Station Dwell' : 'Signal Hold')
      : delayMinutes >= 20 && speed < 35
      ? 'Junction Congestion'
      : delayMinutes >= 15 && speed >= 50
      ? 'Section Recovery'
      : delayMinutes >= 5
      ? 'Speed Restriction'
      : 'Optimal Clearance',
    explanation: zeroSpeedHaltReason
      ? `${zeroSpeedHaltReason}. Telemetry confirms train is stationary at section checkpoint.`
      : delayMinutes >= 20 && speed < 35
      ? 'Severe junction congestion and signal queuing ahead.'
      : delayMinutes >= 15 && speed >= 50
      ? 'Cascading delay recovery in progress across intermediate section.'
      : delayMinutes >= 5
      ? 'Speed restriction or approach caution block.'
      : 'Optimal track section clearance.',
    severity: delayMinutes >= 20 ? 'high' : delayMinutes >= 10 ? 'medium' : 'nominal',
    summary: `Observed at ${current.station_name || current.station_code || 'current section'}.`
  });

  // Speed bar normalization (max 130 km/h)
  const speedBarWidth = Math.min(100, Math.max(0, (speed / 130) * 100));
  // Delay bar normalization (max 120 mins)
  const delayBarWidth = Math.min(100, Math.max(0, (delayMinutes / 120) * 100));

  const severityBadgeClass = delayExplanation.severity === 'high'
    ? 'badge-sev-high'
    : delayExplanation.severity === 'medium'
    ? 'badge-sev-medium'
    : 'badge-sev-nominal';

  return (
    <div className="delay-analytics-container">
      {/* Recorded Delay Card */}
      <article className="panel delay-stat-panel">
        <div className="panel-heading">
          <span className="panel-eyebrow">Delay Telemetry</span>
          {isYetToStart ? (
            <CalendarClock size={16} style={{ color: '#38bdf8' }} />
          ) : (
            <AlertTriangle size={16} className={`delay-alert-icon ${delayMinutes > 0 ? 'delayed' : 'on-time'}`} />
          )}
        </div>

        <div className="delay-stat-body">
          <div className="delay-numeric-row">
            <span className="delay-huge-number">{Math.abs(delayMinutes)}</span>
            <div className="delay-unit-col">
              <span className="delay-unit">MINS</span>
              <span className={`delay-sub-text ${delayInfo.statusClass}`}>
                {isYetToStart ? 'SCHEDULED' : (delayMinutes > 0 ? 'LATE' : delayMinutes < 0 ? 'EARLY' : 'ON TIME')}
              </span>
            </div>
          </div>
          <p className="delay-station-recorded">
            {isYetToStart ? 'Origin: ' : 'Observed at '}
            <strong>{current.station_name || current.station_code || 'Current Section'}</strong>
          </p>
          {zeroSpeedHaltReason && (
            <div className="telemetry-halt-badge">
              <PauseCircle size={12} className="halt-icon" />
              <span>{zeroSpeedHaltReason}</span>
            </div>
          )}
        </div>

        <div className="delay-progress-bar-wrap">
          <div className="factor-label-row">
            <span>Delay Severity</span>
            <strong>{isYetToStart ? 'On Time (Scheduled)' : (delayMinutes > 45 ? 'High' : delayMinutes > 15 ? 'Moderate' : 'Low / Normal')}</strong>
          </div>
          <div className="bar-track">
            <div
              className={`bar-fill delay-fill ${delayMinutes > 30 ? 'red' : 'amber'}`}
              style={{ width: `${delayBarWidth}%` }}
            />
          </div>
        </div>
      </article>

      {/* "Why Delayed?" & Delay Recovery Feasibility Panel */}
      <article className="panel why-delayed-panel">
        <div className="panel-heading">
          <div className="why-delayed-header-left">
            <HelpCircle size={16} className="why-delayed-icon" />
            <span className="panel-eyebrow">Root Cause Diagnosis</span>
          </div>
          <span className={`root-cause-severity-badge ${severityBadgeClass}`}>
            {delayExplanation.root_cause}
          </span>
        </div>

        <div className="why-delayed-body">
          <h4 className="why-delayed-title">
            {delayExplanation.explanation}
          </h4>
          <p className="why-delayed-summary">
            {delayExplanation.summary || `Live telemetry indicates section speed of ${formatSpeed(speed)} with ${delayMinutes} minutes variance.`}
          </p>
        </div>

        {/* Delay Recovery Feasibility Indicator */}
        <div className={`delay-recovery-box ${recoveryFeasibility.statusClass}`}>
          <div className="recovery-box-header">
            <div className="recovery-title-row">
              <TrendingUp size={13} />
              <strong>Delay Recovery Feasibility: {recoveryFeasibility.rating}</strong>
            </div>
          </div>
          <p className="recovery-box-desc">{recoveryFeasibility.text}</p>
        </div>

        <div className="why-delayed-footer">
          <div className="why-delayed-meta-item">
            <Activity size={13} />
            <span>Speed: <strong>{formatSpeed(speed)}</strong></span>
          </div>
          <div className="why-delayed-meta-item">
            <Sparkles size={13} className="spark-icon" />
            <span>Engine: <strong>{isYetToStart ? 'Timetable Projection' : (prediction.confidence || 'Physics + ML')}</strong></span>
          </div>
        </div>
      </article>

      {/* Smart Passenger Advisory & Real-Time Dynamics */}
      <article className="panel context-panel">
        <div className="panel-heading">
          <span className="panel-eyebrow">Passenger Advisory & Speed</span>
          <BellRing size={16} className="gauge-icon" />
        </div>

        {/* Passenger Advisory Banner */}
        <div className={`passenger-advisory-card ${passengerAdvisory.severity}`}>
          <div className="advisory-title-row">
            {passengerAdvisory.severity === 'critical' ? (
              <ShieldAlert size={14} className="adv-icon critical" />
            ) : passengerAdvisory.severity === 'warning' ? (
              <AlertTriangle size={14} className="adv-icon warning" />
            ) : (
              <ShieldCheck size={14} className="adv-icon success" />
            )}
            <strong>{passengerAdvisory.title}</strong>
          </div>
          <p className="advisory-msg">{passengerAdvisory.message}</p>
        </div>

        <div className="context-metrics-grid">
          <div className="context-metric">
            <span className="c-label">Section Velocity</span>
            <strong className="c-value">{formatSpeed(speed)}</strong>
            <div className="bar-track speed-track">
              <div className="bar-fill speed-fill" style={{ width: `${speedBarWidth}%` }} />
            </div>
          </div>

          <div className="context-metric">
            <span className="c-label">Distance from Origin</span>
            <strong className="c-value">{isYetToStart ? '0 km (Scheduled)' : formatDistance(current.distance_from_origin_km || current.distance_from_source_km)}</strong>
          </div>
        </div>

        <div className="explanation-bubble">
          {delayMinutes <= 0 ? (
            <CheckCircle2 size={14} className="info-icon on-time" />
          ) : (
            <ShieldAlert size={14} className="info-icon" />
          )}
          <p>
            {isYetToStart
              ? `Train is scheduled to depart on ${trainData.journey_date}. All timetable milestones reflect scheduled departure from ${current.station_name || current.station_code || 'Origin'}.`
              : speed === 0
              ? `Stationary checkpoint: ${zeroSpeedHaltReason}. Acceleration & dwell penalties factored into ETA.`
              : delayMinutes === 0
              ? 'Train operating on nominal clearance schedule.'
              : `Running ${delayMinutes}m behind schedule with dynamic corridor recovery modeling.`}
          </p>
        </div>
      </article>
    </div>
  );
}

export default DelayAnalytics;
