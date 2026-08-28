import express from 'express';
import { validateQuery, validateParams, trainNumberSchema, journeyDateSchema, paginationSchema, realTimeStatusQuerySchema, trainHistoryQuerySchema } from '../validators/index.js';
import * as trainService from '../services/trainService.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/trains', async (req, res, next) => {
  try {
    const trains = await trainService.getAllTrains();
    res.json({ data: trains, count: trains.length });
  } catch (error) {
    next(error);
  }
});

router.get('/trains/:trainNumber', validateParams(trainNumberSchema), async (req, res, next) => {
  try {
    const train = await trainService.getTrainByNumber(req.validatedParams.trainNumber);
    if (!train) {
      return res.status(404).json({ error: 'Train not found' });
    }
    res.json({ data: train });
  } catch (error) {
    next(error);
  }
});

router.get('/realtime', validateQuery(realTimeStatusQuerySchema), async (req, res, next) => {
  try {
    const { trainNumber, journeyDate, status, page, limit } = req.validatedQuery;
    const result = await trainService.getCurrentStatus({ trainNumber, journeyDate, status, page, limit });
    res.json({
      data: result.data,
      pagination: {
        page: page || 1,
        limit: limit || 50,
        total: result.count,
        totalPages: Math.ceil((result.count || 0) / (limit || 50))
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/realtime/:trainNumber', validateParams(trainNumberSchema), validateQuery(journeyDateSchema), async (req, res, next) => {
  try {
    const { trainNumber } = req.validatedParams;
    const { journeyDate } = req.validatedQuery;
    
    if (!journeyDate) {
      return res.status(400).json({ error: 'journeyDate query parameter required' });
    }
    
    const status = await trainService.getCurrentStatusByTrain(trainNumber, journeyDate);
    if (!status) {
      return res.status(404).json({ error: 'No real-time status found for this train/journey' });
    }
    res.json({ data: status });
  } catch (error) {
    next(error);
  }
});

router.get('/history', validateQuery(trainHistoryQuerySchema), async (req, res, next) => {
  try {
    const filters = req.validatedQuery;
    const result = await trainService.getTrainHistory(filters);
    res.json({
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
});

router.get('/history/:trainNumber', validateParams(trainNumberSchema), validateQuery(journeyDateSchema), async (req, res, next) => {
  try {
    const { trainNumber } = req.validatedParams;
    const { journeyDate } = req.validatedQuery;
    
    if (!journeyDate) {
      return res.status(400).json({ error: 'journeyDate query parameter required' });
    }
    
    const history = await trainService.getTrainHistoryForJourney(trainNumber, journeyDate);
    res.json({ data: history, count: history.length });
  } catch (error) {
    next(error);
  }
});

router.get('/route/:trainNumber', validateParams(trainNumberSchema), validateQuery(journeyDateSchema), async (req, res, next) => {
  try {
    const { trainNumber } = req.validatedParams;
    const { journeyDate } = req.validatedQuery;
    
    if (!journeyDate) {
      return res.status(400).json({ error: 'journeyDate query parameter required' });
    }
    
    const stations = await trainService.getStationsByRoute(trainNumber, journeyDate);
    res.json({ data: stations, count: stations.length });
  } catch (error) {
    next(error);
  }
});

export default router;