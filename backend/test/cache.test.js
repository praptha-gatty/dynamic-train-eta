import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LRUCache } from '../src/utils/cache.js';

describe('In-Memory LRU Cache (cache.js)', () => {
  it('stores and retrieves cached entries before TTL expiration', () => {
    const cache = new LRUCache({ maxSize: 10, defaultTTL: 1000 });
    cache.set('key1', { value: 42 });

    const retrieved = cache.get('key1');
    assert.deepEqual(retrieved, { value: 42 });
    assert.equal(cache.has('key1'), true);
  });

  it('evicts oldest item when max capacity is reached', () => {
    const cache = new LRUCache({ maxSize: 3, defaultTTL: 10000 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    // Access 'a' to make 'b' the oldest
    cache.get('a');

    // Add 'd' which should evict 'b'
    cache.set('d', 4);

    assert.equal(cache.has('a'), true);
    assert.equal(cache.has('b'), false, 'Key "b" should have been evicted');
    assert.equal(cache.has('c'), true);
    assert.equal(cache.has('d'), true);
  });

  it('expires items past TTL', async () => {
    const cache = new LRUCache({ maxSize: 10, defaultTTL: 50 }); // 50ms TTL
    cache.set('expire_me', 'hello');

    assert.equal(cache.get('expire_me'), 'hello');

    // Wait 70ms
    await new Promise(resolve => setTimeout(resolve, 70));

    assert.equal(cache.get('expire_me'), null);
    assert.equal(cache.has('expire_me'), false);
  });

  it('generates bucketing cache keys for near-identical telemetry states', () => {
    const key1 = LRUCache.generateETAKey('12919', '2026-08-30', 'NDLS', 'AGC', 78, 14);
    const key2 = LRUCache.generateETAKey('12919', '2026-08-30', 'NDLS', 'AGC', 81, 15);

    // 78 km/h and 81 km/h bucket to 80 km/h; 14 min and 15 min delay bucket to 14/16 or near
    assert.equal(key1, 'eta:12919:2026-08-30:NDLS:AGC:80:14');
    assert.equal(key2, 'eta:12919:2026-08-30:NDLS:AGC:80:16');
  });

  it('computes accurate hit ratio metrics', () => {
    const cache = new LRUCache({ maxSize: 5, defaultTTL: 5000 });
    cache.set('item', 123);
    cache.get('item'); // hit
    cache.get('missing'); // miss

    const stats = cache.getStats();
    assert.equal(stats.hits, 1);
    assert.equal(stats.misses, 1);
    assert.equal(stats.hitRatio, 0.5);
  });
});
