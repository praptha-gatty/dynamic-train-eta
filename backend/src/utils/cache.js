/**
 * High-Performance In-Memory LRU Cache with TTL.
 * Prevents redundant ETA recalculations for identical train telemetry states.
 */

import config from '../config/env.js';

export class LRUCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || config.CACHE_MAX_ITEMS || 1000;
    this.defaultTTL = options.defaultTTL || config.CACHE_TTL_MS || 30000; // 30s
    this.cache = new Map();
    
    // Performance counters
    this.hits = 0;
    this.misses = 0;
    this.sets = 0;
    this.evictions = 0;
  }

  /**
   * Generates a deterministic cache key for train ETA requests.
   * Buckets speed (±5 km/h) and delay (±2 min) to maximize cache hits on near-identical states.
   */
  static generateETAKey(trainNumber, journeyDate, targetStationCode, currentStationCode, speed, delayMinutes) {
    const sBucket = Math.round(Number(speed || 0) / 5) * 5;
    const dBucket = Math.round(Number(delayMinutes || 0) / 2) * 2;
    return `eta:${trainNumber}:${journeyDate || 'today'}:${targetStationCode}:${currentStationCode || 'curr'}:${sBucket}:${dBucket}`;
  }

  /**
   * Retrieves an item from cache if not expired.
   * Refreshes item position in LRU queue upon hit.
   * @param {string} key 
   * @returns {any|null}
   */
  get(key) {
    if (!this.cache.has(key)) {
      this.misses++;
      return null;
    }

    const item = this.cache.get(key);
    const now = Date.now();

    if (now > item.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Refresh LRU order (delete & re-insert)
    this.cache.delete(key);
    this.cache.set(key, item);
    this.hits++;

    return item.value;
  }

  /**
   * Stores an item with a time-to-live.
   * @param {string} key 
   * @param {any} value 
   * @param {number} [ttlMs] Time to live in ms
   */
  set(key, value, ttlMs) {
    const ttl = ttlMs !== undefined ? ttlMs : this.defaultTTL;
    const expiresAt = Date.now() + ttl;

    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest (first key in Map iterator)
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      this.evictions++;
    }

    this.cache.set(key, { value, expiresAt });
    this.sets++;
  }

  /**
   * Checks if key exists and is unexpired without modifying LRU order.
   * @param {string} key 
   * @returns {boolean}
   */
  has(key) {
    if (!this.cache.has(key)) return false;
    const item = this.cache.get(key);
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Deletes a key from cache.
   * @param {string} key 
   * @returns {boolean}
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clears all items and resets statistics.
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.sets = 0;
    this.evictions = 0;
  }

  /**
   * Returns cache metrics and hit ratio.
   * @returns {{ size: number, maxSize: number, hits: number, misses: number, sets: number, evictions: number, hitRatio: number }}
   */
  getStats() {
    const total = this.hits + this.misses;
    const hitRatio = total > 0 ? Number((this.hits / total).toFixed(3)) : 0;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      evictions: this.evictions,
      hitRatio
    };
  }
}

export const etaCache = new LRUCache({
  maxSize: config.CACHE_MAX_ITEMS,
  defaultTTL: config.CACHE_TTL_MS
});

export default etaCache;
