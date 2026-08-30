/**
 * Zod API Request Validation Schemas & Middlewares.
 */

import { z } from 'zod';

// --------------------------------------------------
// Base Schemas
// --------------------------------------------------

export const trainNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{4,6}$/, 'Train number must be 4 to 6 numeric digits');

export const journeyDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD');

export const optionalJourneyDateSchema = journeyDateSchema.optional();

export const trainNumberParamsSchema = z.object({
  trainNumber: trainNumberSchema
});

export const journeyDateQuerySchema = z.object({
  journeyDate: optionalJourneyDateSchema
});

export const paginationSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .positive()
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(50)
});

// --------------------------------------------------
// Search Schema
// --------------------------------------------------

export const trainSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, 'Search query must not be empty')
});

// --------------------------------------------------
// Train History Query Schema
// --------------------------------------------------

export const trainHistoryQuerySchema = z.object({
  trainNumber: trainNumberSchema,
  journeyDate: optionalJourneyDateSchema,
  stationCode: z.string().trim().min(1).optional(),
  startDate: optionalJourneyDateSchema,
  endDate: optionalJourneyDateSchema,
  ...paginationSchema.shape
});

// --------------------------------------------------
// ETA Prediction Query Schema
// --------------------------------------------------

export const etaPredictionQuerySchema = z
  .object({
    trainNumber: trainNumberSchema,
    journeyDate: optionalJourneyDateSchema,
    targetStationCode: z.string().trim().min(1).optional(),
    targetStationSequence: z.coerce.number().int().positive().optional()
  });

// --------------------------------------------------
// Realtime Status Query Schema
// --------------------------------------------------

export const realtimeStatusQuerySchema = z.object({
  trainNumber: trainNumberSchema.optional(),
  journeyDate: optionalJourneyDateSchema,
  status: z
    .enum(['IN_TRANSIT', 'SCHEDULED', 'COMPLETED', 'CONFLICT_FLAGGED', 'HALTED', 'CANCELLED'])
    .optional(),
  ...paginationSchema.shape
});

// --------------------------------------------------
// Validation Middlewares
// --------------------------------------------------

/**
 * Validates req.query against a Zod schema.
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed on query parameters',
        details: result.error.flatten().fieldErrors
      });
    }

    req.validatedQuery = result.data;
    next();
  };
}

/**
 * Validates req.params against a Zod schema.
 */
export function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed on route parameters',
        details: result.error.flatten().fieldErrors
      });
    }

    req.validatedParams = result.data;
    next();
  };
}

/**
 * Validates req.body against a Zod schema.
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed on request body',
        details: result.error.flatten().fieldErrors
      });
    }

    req.validatedBody = result.data;
    next();
  };
}
