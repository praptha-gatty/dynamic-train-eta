import express from 'express';
import { validateQuery, validateParams, trainNumberSchema, journeyDateSchema, etaPredictionQuerySchema } from '../validators/index.js';
import * as etaService from '../services/etaService.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/predict', validateQuery(etaPredictionQuerySchema), async (req, res, next) => {
  try {
    const { trainNumber, journeyDate, targetStationCode, targetStationSequence } = req.validatedQuery;
    
    const prediction = await etaService.predictETA(
      trainNumber,
      journeyDate,
      targetStationCode,
      targetStationSequence
    );
    
    res.json({ data: prediction });
  } catch (error) {
    logger.error('ETA prediction error:', error);
    if (error.message.includes('not found') || error.message.includes('No live data')) {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

router.get('/live/:trainNumber', validateParams(trainNumberSchema), async (req, res, next) => {
  try {
    const { trainNumber } = req.validatedParams;
    const liveData = await etaService.getTrainLiveData(trainNumber);
    
    if (!liveData) {
      return res.status(404).json({ error: 'No live data available for this train' });
    }
    
    res.json({ data: liveData });
  } catch (error) {
    logger.error('Live data fetch error:', error);
    next(error);
  }
});

export default router;