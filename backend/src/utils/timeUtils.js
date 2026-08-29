/**
 * Parses a date or time string into a JS Date object.
 * Supports full ISO strings, timestamps, or "HH:MM" / "HH:MM:SS" time strings.
 * @param {string|Date|number} value 
 * @param {string} [baseDateStr] Optional base date "YYYY-MM-DD" for time-only strings
 * @returns {Date|null}
 */
export function parseDateTime(value, baseDateStr = null) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  const str = String(value).trim();
  if (!str) return null;

  // Try direct parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  // Handle "HH:MM" or "HH:MM:SS"
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(?::([0-5][0-9]))?$/;
  const match = str.match(timeRegex);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3] || '0', 10);

    let baseDate = baseDateStr ? new Date(baseDateStr) : new Date();
    if (isNaN(baseDate.getTime())) {
      baseDate = new Date();
    }

    const d = new Date(baseDate);
    d.setHours(hours, minutes, seconds, 0);
    return d;
  }

  return null;
}

/**
 * Calculates arrival or departure delay in minutes, safely handling midnight boundary crossing.
 * E.g., scheduled at 23:45, arriving at 00:15 -> returns +30 minutes instead of -1410 minutes.
 * @param {string|Date} actual 
 * @param {string|Date} scheduled 
 * @param {string} [baseDateStr] 
 * @returns {number|null}
 */
export function calculateTimeDifferenceMinutes(actual, scheduled, baseDateStr = null) {
  const actualDate = parseDateTime(actual, baseDateStr);
  const scheduledDate = parseDateTime(scheduled, baseDateStr);

  if (!actualDate || !scheduledDate) {
    return null;
  }

  let diffMinutes = Math.round((actualDate.getTime() - scheduledDate.getTime()) / 60000);

  // Midnight boundary crossing handling:
  // If actual time crossed midnight after scheduled time (e.g. scheduled 23:45, actual 00:15 on same base date),
  // diffMinutes will be around -1410 (-23.5 hours).
  if (diffMinutes < -720) {
    diffMinutes += 1440; // Add 24 hours
  } else if (diffMinutes > 720) {
    diffMinutes -= 1440; // Subtract 24 hours if reverse boundary
  }

  return diffMinutes;
}

/**
 * Returns time features formatted in Asia/Kolkata (IST).
 * @param {string|Date|number} timestamp 
 * @returns {{ hour: number, minute: number, day_of_week: number, month: number, time_period: string, is_weekend: boolean }}
 */
export function getISTTimeFeatures(timestamp = new Date()) {
  const date = parseDateTime(timestamp) || new Date();
  
  // Format parts in IST timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short'
  });

  const parts = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') {
      parts[part.type] = part.value;
    }
  }

  const hour = parseInt(parts.hour || '0', 10);
  const minute = parseInt(parts.minute || '0', 10);
  const month = parseInt(parts.month || '1', 10);
  
  // Map short weekday to 0-6 (Sun-Sat)
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const day_of_week = weekdayMap[parts.weekday] ?? 0;
  const is_weekend = day_of_week === 0 || day_of_week === 6;

  let time_period;
  if (hour >= 5 && hour < 12) {
    time_period = 'morning';
  } else if (hour >= 12 && hour < 17) {
    time_period = 'afternoon';
  } else if (hour >= 17 && hour < 21) {
    time_period = 'evening';
  } else {
    time_period = 'night';
  }

  return {
    hour,
    minute,
    month,
    day_of_week,
    time_period,
    is_weekend
  };
}
