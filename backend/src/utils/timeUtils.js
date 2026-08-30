/**
 * Time and Date Utilities for Dynamic Train ETA Engine.
 * Ensures strict UTC / ISO 8601 internal handling, localized IST formatting,
 * and robust midnight boundary rollover compensation.
 */

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Parses any date/time string, ISO string, timestamp, or "HH:MM" / "HH:MM:SS" into a UTC Date object.
 * @param {string|Date|number} value 
 * @param {string} [baseDateStr] Optional base date "YYYY-MM-DD" for time-only strings
 * @returns {Date|null}
 */
export function parseDateTime(value, baseDateStr = null) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // Numeric epoch timestamp
  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  const str = String(value).trim();
  if (!str) return null;

  // Handle "HH:MM" or "HH:MM:SS"
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(?::([0-5][0-9]))?$/;
  const match = str.match(timeRegex);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3] || '0', 10);

    let baseYear, baseMonth, baseDay;
    if (baseDateStr && /^\d{4}-\d{2}-\d{2}$/.test(baseDateStr)) {
      const parts = baseDateStr.split('-').map(Number);
      baseYear = parts[0];
      baseMonth = parts[1] - 1;
      baseDay = parts[2];
    } else {
      const now = new Date();
      baseYear = now.getUTCFullYear();
      baseMonth = now.getUTCMonth();
      baseDay = now.getUTCDate();
    }

    // Construct local IST date components and convert to UTC
    // IST is UTC + 5:30 (330 minutes)
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const utcDate = new Date(Date.UTC(baseYear, baseMonth, baseDay, hours, minutes, seconds) - istOffsetMs);
    return isNaN(utcDate.getTime()) ? null : utcDate;
  }

  // Direct ISO / Standard parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

/**
 * Calculates arrival or departure delay in minutes between actual and scheduled times.
 * Robustly compensates for midnight rollover (e.g., scheduled at 23:50, actual at 00:15 -> +25 mins).
 * @param {string|Date|number} actual Actual arrival/departure time
 * @param {string|Date|number} scheduled Scheduled arrival/departure time
 * @param {string} [baseDateStr] 
 * @returns {number|null} Signed delay in minutes (positive = late, negative = early)
 */
export function calculateTimeDifferenceMinutes(actual, scheduled, baseDateStr = null) {
  const actualDate = parseDateTime(actual, baseDateStr);
  const scheduledDate = parseDateTime(scheduled, baseDateStr);

  if (!actualDate || !scheduledDate) {
    return null;
  }

  let diffMinutes = Math.round((actualDate.getTime() - scheduledDate.getTime()) / 60000);

  // Midnight boundary crossing handling:
  // If scheduled is before midnight (e.g. 23:45) and actual is after midnight (e.g. 00:15 on same base calendar day),
  // diffMinutes calculates as -1410 (-23.5 hours). Adjust by adding 1440 (+24h) to yield +30 mins.
  // Conversely, if scheduled is 00:15 and actual arrived early at 23:55, diffMinutes calculates as +1420. Adjust to -20 mins.
  if (diffMinutes < -720) {
    diffMinutes += 1440;
  } else if (diffMinutes > 720) {
    diffMinutes -= 1440;
  }

  return diffMinutes;
}

/**
 * Returns time features formatted in Asia/Kolkata (IST) timezone.
 * @param {string|Date|number} timestamp 
 * @returns {{ hour: number, minute: number, day_of_week: number, month: number, time_period: string, is_weekend: boolean }}
 */
export function getISTTimeFeatures(timestamp = new Date()) {
  const date = parseDateTime(timestamp) || new Date();
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TIMEZONE,
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
  
  // Map weekday to 0-6 (0=Sun, 1=Mon, ..., 6=Sat)
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

/**
 * Formats a Date object or ISO timestamp into a localized IST human-readable string.
 * @param {string|Date|number} timestamp 
 * @param {'full'|'time'|'date'} [style='full']
 * @returns {string} Formatted string in IST
 */
export function formatToIST(timestamp, style = 'full') {
  const date = parseDateTime(timestamp);
  if (!date) return '';

  if (style === 'time') {
    return date.toLocaleTimeString('en-IN', {
      timeZone: IST_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  if (style === 'date') {
    return date.toLocaleDateString('en-IN', {
      timeZone: IST_TIMEZONE,
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  }

  return date.toLocaleString('en-IN', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}
