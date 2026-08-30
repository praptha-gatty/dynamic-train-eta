/**
 * ETA Prediction REST API Routes.
 */

import express from 'express';
import {
  validateQuery,
  validateParams,
  trainNumberSchema,
  etaPredictionQuerySchema,
  trainNumberParamsSchema,
  journeyDateQuerySchema
} from '../validators/index.js';
import * as etaService from '../services/etaService.js';
import { etaCache } from '../utils/cache.js';
import logger from '../utils/logger.js';

const router = express.Router();

// ============================================================
// PREDICT ETA FOR SPECIFIC TARGET STATION (Defaults to final terminus if omitted)
// GET /api/v1/eta/predict?trainNumber=12919&journeyDate=2026-08-30&targetStationCode=NDLS
// ============================================================
router.get('/predict', validateQuery(etaPredictionQuerySchema), async (req, res, next) => {
  try {
    const { trainNumber, journeyDate, targetStationCode, targetStationSequence } = req.validatedQuery;

    const prediction = await etaService.predictETA(
      trainNumber,
      journeyDate,
      targetStationCode,
      targetStationSequence
    );

    res.json({
      status: 'success',
      data: prediction
    });
  } catch (error) {
    logger.error('ETA prediction error:', error.message);
    if (error.message.includes('No route') || error.message.includes('not found') || error.message.includes('downstream')) {
      return res.status(404).json({
        status: 'error',
        error: error.message
      });
    }
    next(error);
  }
});

// ============================================================
// PREDICT ETA FOR ALL DOWNSTREAM STATIONS ON ROUTE
// GET /api/v1/eta/route-predict/:trainNumber?journeyDate=2026-08-30
// ============================================================
router.get(
  '/route-predict/:trainNumber',
  validateParams(trainNumberParamsSchema),
  validateQuery(journeyDateQuerySchema),
  async (req, res, next) => {
    try {
      const { trainNumber } = req.validatedParams;
      const { journeyDate } = req.validatedQuery;

      const predictions = await etaService.predictRouteETA(trainNumber, journeyDate);

      res.json({
        status: 'success',
        data: predictions
      });
    } catch (error) {
      logger.error('Route ETA prediction error:', error.message);
      if (error.message.includes('No route') || error.message.includes('not found')) {
        return res.status(404).json({
          status: 'error',
          error: error.message
        });
      }
      next(error);
    }
  }
);

// ============================================================
// GET LIVE TELEMETRY (Supports optional targetStationCode query)
// GET /api/v1/eta/live/:trainNumber?targetStationCode=NDLS
// ============================================================
router.get('/live/:trainNumber', validateParams(trainNumberParamsSchema), async (req, res, next) => {
  try {
    const { trainNumber } = req.validatedParams;
    const targetStationCode = req.query.targetStationCode ? String(req.query.targetStationCode).trim() : null;

    const liveData = await etaService.getTrainLiveData(trainNumber, targetStationCode);

    if (!liveData) {
      return res.status(404).json({
        status: 'error',
        error: 'No live telemetry available for this train'
      });
    }

    res.json({
      status: 'success',
      data: liveData
    });
  } catch (error) {
    logger.error('Live data fetch error:', error.message);
    next(error);
  }
});

// ============================================================
// CACHE METRICS & CLEAR
// ============================================================
router.get('/cache/stats', (req, res) => {
  res.json({
    status: 'success',
    data: etaCache.getStats()
  });
});

router.post('/cache/clear', (req, res) => {
  etaCache.clear();
  res.json({
    status: 'success',
    message: 'In-memory ETA cache cleared'
  });
});

export default router;