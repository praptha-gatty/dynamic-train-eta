import { z } from 'zod';

// --------------------------------------------------
// Train number
// --------------------------------------------------

export const trainNumberSchema = z
  .string()
  .regex(/^\d{5}$/, 'Train number must be 5 digits');

// --------------------------------------------------
// Journey date
// --------------------------------------------------

export const journeyDateSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'Date must be YYYY-MM-DD'
  );

// Query object containing journeyDate
export const journeyDateQuerySchema = z.object({
  journeyDate: journeyDateSchema
});

// --------------------------------------------------
// Pagination
// --------------------------------------------------

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
// Train history
// --------------------------------------------------

export const trainHistoryQuerySchema = z.object({
  trainNumber: trainNumberSchema,

  journeyDate: journeyDateSchema.optional(),

  stationCode: z
    .string()
    .min(1)
    .optional(),

  startDate: journeyDateSchema.optional(),

  endDate: journeyDateSchema.optional(),

  ...paginationSchema.shape
});

// --------------------------------------------------
// ETA prediction
// --------------------------------------------------

export const etaPredictionQuerySchema = z
  .object({
    trainNumber: trainNumberSchema,

    journeyDate: journeyDateSchema,

    targetStationCode: z
      .string()
      .min(1)
      .optional(),

    targetStationSequence: z.coerce
      .number()
      .int()
      .positive()
      .optional()
  })
  .refine(
    data =>
      Boolean(
        data.targetStationCode ||
        data.targetStationSequence
      ),
    {
      message:
        'Either targetStationCode or targetStationSequence is required',
      path: ['targetStationCode']
    }
  );

// --------------------------------------------------
// Realtime status
// --------------------------------------------------

export const realtimeStatusQuerySchema = z.object({
  trainNumber: trainNumberSchema.optional(),

  journeyDate: journeyDateSchema.optional(),

  status: z
    .enum([
      'IN_TRANSIT',
      'SCHEDULED',
      'COMPLETED',
      'CONFLICT_FLAGGED'
    ])
    .optional(),

  ...paginationSchema.shape
});

// --------------------------------------------------
// Query validation middleware
// --------------------------------------------------

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

// --------------------------------------------------
// Params validation middleware
// --------------------------------------------------

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
