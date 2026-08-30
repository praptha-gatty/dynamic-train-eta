import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDateTime,
  calculateTimeDifferenceMinutes,
  getISTTimeFeatures,
  formatToIST
} from '../src/utils/timeUtils.js';

describe('Time and Date Utilities (timeUtils)', () => {
  it('parses full ISO strings and epoch timestamps accurately into UTC Date objects', () => {
    const isoStr = '2026-08-30T10:00:00.000Z';
    const date = parseDateTime(isoStr);
    assert.ok(date instanceof Date);
    assert.equal(date.toISOString(), isoStr);

    const epochMs = 1756548000000;
    const epochDate = parseDateTime(epochMs);
    assert.equal(epochDate.getTime(), epochMs);
  });

  it('parses HH:MM time-only strings relative to given baseDate', () => {
    const timeStr = '14:30';
    const baseDate = '2026-08-30';
    const parsed = parseDateTime(timeStr, baseDate);
    assert.ok(parsed instanceof Date);
    
    // In IST (UTC+5:30), 14:30 IST is 09:00 UTC (14h 30m - 5h 30m = 9h 00m)
    assert.equal(parsed.getUTCHours(), 9);
    assert.equal(parsed.getUTCMinutes(), 0);
  });

  it('correctly handles midnight boundary crossing delay calculations', () => {
    // Scenario 1: Scheduled at 23:45, Arriving late at 00:15 next day (+30 mins)
    const scheduled1 = '23:45';
    const actual1 = '00:15';
    const diff1 = calculateTimeDifferenceMinutes(actual1, scheduled1, '2026-08-30');
    assert.equal(diff1, 30, `Expected +30 minutes delay across midnight, got ${diff1}`);

    // Scenario 2: Scheduled at 00:10, Arrived early at 23:55 prior day (-15 mins)
    const scheduled2 = '00:10';
    const actual2 = '23:55';
    const diff2 = calculateTimeDifferenceMinutes(actual2, scheduled2, '2026-08-30');
    assert.equal(diff2, -15, `Expected -15 minutes early across midnight, got ${diff2}`);

    // Scenario 3: Standard daytime delay (Scheduled 10:00, Actual 10:25 -> +25 mins)
    const scheduled3 = '10:00';
    const actual3 = '10:25';
    const diff3 = calculateTimeDifferenceMinutes(actual3, scheduled3, '2026-08-30');
    assert.equal(diff3, 25);
  });

  it('extracts structured IST time features correctly', () => {
    // 2026-08-30 06:30 UTC = 2026-08-30 12:00 IST (Afternoon, Sunday)
    const testDate = new Date(Date.UTC(2026, 7, 30, 6, 30, 0));
    const features = getISTTimeFeatures(testDate);

    assert.equal(features.hour, 12);
    assert.equal(features.minute, 0);
    assert.equal(features.month, 8);
    assert.equal(features.day_of_week, 0); // Sunday
    assert.equal(features.is_weekend, true);
    assert.equal(features.time_period, 'afternoon');
  });

  it('formats dates localized to IST strings', () => {
    const testDate = new Date(Date.UTC(2026, 7, 30, 6, 30, 0));
    const formattedTime = formatToIST(testDate, 'time');
    assert.ok(formattedTime.includes('12:00') && formattedTime.toLowerCase().includes('pm'));
  });
});
