import React from 'react';

export function StatusBadge({ status, delayMinutes }) {
  const isYetToStart = status === 'YET_TO_START' || status === 'SCHEDULED' || status === 'NOT_STARTED';

  if (isYetToStart) {
    return (
      <span className="status-badge status-scheduled">
        <span className="status-dot" style={{ backgroundColor: '#38bdf8' }} />
        Scheduled Departure
      </span>
    );
  }

  let label = status || 'IN_TRANSIT';
  let badgeClass = 'status-in-transit';

  if (delayMinutes != null) {
    const mins = Number(delayMinutes);
    if (mins > 30) {
      label = `Delayed (${mins}m)`;
      badgeClass = 'status-delayed-heavy';
    } else if (mins > 0) {
      label = `Delayed (${mins}m)`;
      badgeClass = 'status-delayed';
    } else if (mins === 0) {
      label = 'On Time';
      badgeClass = 'status-ontime';
    } else {
      label = `Early (${Math.abs(mins)}m)`;
      badgeClass = 'status-early';
    }
  } else if (status === 'COMPLETED') {
    label = 'Journey Completed';
    badgeClass = 'status-completed';
  }

  return (
    <span className={`status-badge ${badgeClass}`}>
      <span className="status-dot" />
      {label}
    </span>
  );
}

export default StatusBadge;
