import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/server.js';

describe('API Route & Validation Integration Tests', () => {
  it('GET /health returns 200 and system health metadata', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.ok(res.body.timestamp);
    assert.ok(res.body.realtime);
    assert.ok(res.body.cache);
  });

  it('GET /api/v1/trains/search returns 400 when search query "q" is missing', async () => {
    const res = await request(app).get('/api/v1/trains/search');
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'Validation failed on query parameters');
    assert.ok(res.body.details.q);
  });

  it('GET /api/v1/eta/predict returns 400 when trainNumber is missing or invalid', async () => {
    const res = await request(app).get('/api/v1/eta/predict?trainNumber=abc');
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'Validation failed on query parameters');
    assert.ok(res.body.details.trainNumber);
  });

  it('GET /api/v1/eta/cache/stats and POST /api/v1/eta/cache/clear operate correctly', async () => {
    const statsRes = await request(app).get('/api/v1/eta/cache/stats');
    assert.equal(statsRes.status, 200);
    assert.equal(statsRes.body.status, 'success');
    assert.ok(statsRes.body.data);

    const clearRes = await request(app).post('/api/v1/eta/cache/clear');
    assert.equal(clearRes.status, 200);
    assert.equal(clearRes.body.status, 'success');
  });

  it('returns 404 for unknown endpoints with structured JSON error', async () => {
    const res = await request(app).get('/api/v1/unknown-route-path');
    assert.equal(res.status, 404);
    assert.equal(res.body.error, 'Route not found');
    assert.ok(res.body.timestamp);
  });
});
