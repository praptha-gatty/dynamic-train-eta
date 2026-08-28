import { z } from 'zod';

export const trainNumberSchema = z.string().regex(/^\d{5}$/, 'Train number must be 5 digits');

export const journeyDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50)
});

export const trainHistoryQuerySchema = z.object({
  trainNumber: trainNumberSchema,
  journeyDate: journeyDateSchema.optional(),
  stationCode: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ...paginationSchema.shape
});

export const etaPredictionQuerySchema = z.object({
  trainNumber: trainNumberSchema,
  journeyDate: journeyDateSchema,
  targetStationCode: z.string().min(1, 'Target station code required'),
  targetStationSequence: z.coerce.number().int().positive().optional()
});

export const realtimeStatusQuerySchema = z.object({
  trainNumber: trainNumberSchema.optional(),
  journeyDate: journeyDateSchema.optional(),
  status: z.enum(['IN_TRANSIT', 'SCHEDULED', 'COMPLETED', 'CONFLICT_FLAGGED']).optional(),
  ...paginationSchema.shape
});

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors
      });
    }
    req.validatedQuery = result.data;
    next();
  };
}

export function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid parameters',
        details: result.error.flatten().fieldErrors
      });
    }
    req.validatedParams = result.data;
    next();
  };
}