import express from 'express';

import {
  validateQuery,
  validateParams,
  trainNumberParamsSchema,
  journeyDateQuerySchema,
  realtimeStatusQuerySchema,
  trainHistoryQuerySchema
} from '../validators/index.js';

import * as trainService from '../services/trainService.js';

const router = express.Router();

// ============================================================
// GET ALL TRAINS
// GET /api/v1/trains
// ============================================================
router.get('/', async (req, res, next) => {
  try {
    const trains = await trainService.getAllTrains();

    res.json({
      data: trains,
      count: trains.length
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// REALTIME STATUS FOR ALL/FILTERED TRAINS
// GET /api/v1/trains/realtime
//
// IMPORTANT: This MUST be before /:trainNumber
// ============================================================
router.get(
  '/realtime',
  validateQuery(realtimeStatusQuerySchema),
  async (req, res, next) => {
    try {
      const {
        trainNumber,
        journeyDate,
        status,
        page,
        limit
      } = req.validatedQuery;

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
        data: result.data,
        pagination: {
          page: currentPage,
          limit: currentLimit,
          total: result.count,
          totalPages: Math.ceil(
            (result.count || 0) / currentLimit
          )
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

      const status = await trainService.getCurrentStatusByTrain(
        trainNumber,
        journeyDate
      );

      if (!status) {
        return res.status(404).json({
          error:
            'No real-time status found for this train/journey'
        });
      }

      res.json({
        data: status
      });
    } catch (error) {
      next(error);
    }
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
        data: result.data,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: result.count,
          totalPages: Math.ceil(
            (result.count || 0) / filters.limit
          )
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

      const history =
        await trainService.getTrainHistoryForJourney(
          trainNumber,
          journeyDate
        );

      res.json({
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

      const stations = await trainService.getStationsByRoute(
        trainNumber,
        journeyDate
      );

      res.json({
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
//
// IMPORTANT: This MUST come AFTER all named routes above.
// ============================================================
router.get(
  '/:trainNumber',
  validateParams(trainNumberParamsSchema),
  async (req, res, next) => {
    try {
      const { trainNumber } = req.validatedParams;

      const train =
        await trainService.getTrainByNumber(trainNumber);

      if (!train) {
        return res.status(404).json({
          error: 'Train not found'
        });
      }

      res.json({
        data: train
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
