/**
 * Trains REST API Routes.
 */

import express from 'express';
import {
  validateQuery,
  validateParams,
  trainNumberParamsSchema,
  journeyDateQuerySchema,
  realtimeStatusQuerySchema,
  trainHistoryQuerySchema,
  trainSearchQuerySchema
} from '../validators/index.js';
import * as trainService from '../services/trainService.js';
import { registerSSEClient } from '../websocket/handlers.js';

const router = express.Router();

// ============================================================
// GET ALL TRAINS
// GET /api/v1/trains
// ============================================================
router.get('/', async (req, res, next) => {
  try {
    const trains = await trainService.getAllTrains();
    res.json({
      status: 'success',
      data: trains,
      count: trains.length
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// SEARCH TRAINS
// GET /api/v1/trains/search?q=12919
// ============================================================
router.get('/search', validateQuery(trainSearchQuerySchema), async (req, res, next) => {
  try {
    const { q } = req.validatedQuery;
    const results = await trainService.searchTrains(q);
    res.json({
      status: 'success',
      data: results,
      count: results.length
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// REALTIME STATUS FOR ALL/FILTERED TRAINS
// GET /api/v1/trains/realtime
// ============================================================
router.get(
  '/realtime',
  validateQuery(realtimeStatusQuerySchema),
  async (req, res, next) => {
    try {
      const { trainNumber, journeyDate, status, page, limit } = req.validatedQuery;

      const result = await trainService.getCurrentStatus({
        trainNumber,
        journeyDate,
        status,
        page,
        limit
      });

      const currentPage = page || 1;
      const currentLimit = limit || 50;

      res.json({
        status: 'success',
        data: result.data,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total: result.count,
          totalPages: Math.ceil((result.count || 0) / currentLimit)
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// REALTIME STATUS FOR SPECIFIC TRAIN
// GET /api/v1/trains/realtime/:trainNumber?journeyDate=YYYY-MM-DD
// ============================================================
router.get(
  '/realtime/:trainNumber',
  validateParams(trainNumberParamsSchema),
  validateQuery(journeyDateQuerySchema),
  async (req, res, next) => {
    try {
      const { trainNumber } = req.validatedParams;
      const { journeyDate } = req.validatedQuery;

      const status = await trainService.getCurrentStatusByTrain(trainNumber, journeyDate);

      if (!status) {
        return res.status(404).json({
          error: 'No real-time status found for this train/journey'
        });
      }

      res.json({
        status: 'success',
        data: status
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// SERVER-SENT EVENTS (SSE) STREAM FOR REALTIME UPDATES
// GET /api/v1/trains/stream/:trainNumber?journeyDate=YYYY-MM-DD
// ============================================================
router.get(
  '/stream/:trainNumber',
  validateParams(trainNumberParamsSchema),
  validateQuery(journeyDateQuerySchema),
  (req, res) => {
    const { trainNumber } = req.validatedParams;
    const { journeyDate } = req.validatedQuery;
    const date = journeyDate || new Date().toISOString().split('T')[0];

    registerSSEClient(trainNumber, date, res);
  }
);

// ============================================================
// TRAIN HISTORY
// GET /api/v1/trains/history
// ============================================================
router.get(
  '/history',
  validateQuery(trainHistoryQuerySchema),
  async (req, res, next) => {
    try {
      const filters = req.validatedQuery;
      const result = await trainService.getTrainHistory(filters);

      res.json({
        status: 'success',
        data: result.data,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: result.count,
          totalPages: Math.ceil((result.count || 0) / filters.limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// TRAIN HISTORY FOR SPECIFIC TRAIN
// GET /api/v1/trains/history/:trainNumber?journeyDate=YYYY-MM-DD
// ============================================================
router.get(
  '/history/:trainNumber',
  validateParams(trainNumberParamsSchema),
  validateQuery(journeyDateQuerySchema),
  async (req, res, next) => {
    try {
      const { trainNumber } = req.validatedParams;
      const { journeyDate } = req.validatedQuery;

      const history = await trainService.getTrainHistoryForJourney(trainNumber, journeyDate);

      res.json({
        status: 'success',
        data: history,
        count: history.length
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// TRAIN ROUTE / STATIONS
// GET /api/v1/trains/route/:trainNumber?journeyDate=YYYY-MM-DD
// ============================================================
router.get(
  '/route/:trainNumber',
  validateParams(trainNumberParamsSchema),
  validateQuery(journeyDateQuerySchema),
  async (req, res, next) => {
    try {
      const { trainNumber } = req.validatedParams;
      const { journeyDate } = req.validatedQuery;

      const stations = await trainService.getStationsByRoute(trainNumber, journeyDate);

      res.json({
        status: 'success',
        data: stations,
        count: stations.length
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// GET TRAIN BY TRAIN NUMBER
// GET /api/v1/trains/:trainNumber
// ============================================================
router.get(
  '/:trainNumber',
  validateParams(trainNumberParamsSchema),
  async (req, res, next) => {
    try {
      const { trainNumber } = req.validatedParams;
      const train = await trainService.getTrainByNumber(trainNumber);

      if (!train) {
        return res.status(404).json({
          error: 'Train not found'
        });
      }

      res.json({
        status: 'success',
        data: train
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
