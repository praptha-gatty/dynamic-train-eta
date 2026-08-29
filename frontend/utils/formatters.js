/**
 * Formatting utilities for Train ETA dashboard
 */

export function formatTime(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    // If it's a simple HH:MM string, return as is
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) {
      return value.slice(0, 5);
    }
    return value;
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function formatDate(value) {
  if (!value) return '--';
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDelay(delayMinutes) {
  if (delayMinutes == null || Number.isNaN(Number(delayMinutes))) {
    return { text: 'On Time / No delay info', minutes: 0, isDelayed: false, isEarly: false, statusClass: 'on-time' };
  }
  const mins = Math.round(Number(delayMinutes));
  if (mins === 0) {
    return { text: 'On Time', minutes: 0, isDelayed: false, isEarly: false, statusClass: 'on-time' };
  }
  if (mins > 0) {
    return { text: `+${mins} min delay`, minutes: mins, isDelayed: true, isEarly: false, statusClass: 'delayed' };
  }
  return { text: `${Math.abs(mins)} min early`, minutes: mins, isDelayed: false, isEarly: true, statusClass: 'early' };
}

export function formatDistance(km) {
  if (km == null || Number.isNaN(Number(km))) return '--';
  return `${Math.round(Number(km))} km`;
}

export function formatSpeed(kmph) {
  if (kmph == null || Number.isNaN(Number(kmph))) return '--';
  return `${Math.round(Number(kmph))} km/h`;
}

export function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
