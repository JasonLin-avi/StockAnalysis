/**
 * @fileoverview Zod Validation Schemas for Structured LLM Outputs
 * 
 * Why:
 * Raw LLM outputs can deviate in shape, include markdown backticks, or emit stringified numbers or booleans.
 * Defining strict Zod schemas with safe coercion and defaults provides reliable data boundaries.
 */

import { z } from 'zod';

/**
 * Robust boolean preprocessor that safely parses string 'false', '0', 'no' as boolean false,
 * preventing standard JS Boolean("false") === true coercion bugs.
 */
const safeBoolean = z.preprocess((val) => {
  if (typeof val === 'string') {
    const lower = val.trim().toLowerCase();
    if (lower === 'false' || lower === '0' || lower === 'no') return false;
    if (lower === 'true' || lower === '1' || lower === 'yes') return true;
  }
  return Boolean(val);
}, z.boolean());

/**
 * Schema for backtest evaluation output.
 * 
 * Why:
 * Ensures the referee LLM output contains valid numeric accuracy scores,
 * boolean flags for direction and price targets, and an explanatory summary string.
 */
export const backtestEvaluateSchema = z.object({
  accuracyScore: z.coerce.number().min(0).max(100),
  directionCorrect: safeBoolean,
  priceRangeHit: safeBoolean,
  actualReturnPct: z.coerce.number(),
  evaluationSummary: z.string().min(1)
});

/**
 * Schema for backtest point-in-time forecast output.
 * 
 * Why:
 * Restricts trends to valid enum states, bounds confidence between 1 and 10,
 * and ensures price predictions conform to valid numbers for quantitative evaluation.
 */
export const backtestPredictSchema = z.object({
  trend: z.enum(['BULLISH', 'BEARISH', 'NEUTRAL']),
  confidence: z.coerce.number().min(1).max(10),
  targetPriceRange: z.array(z.coerce.number()).min(1),
  stopLossPrice: z.coerce.number(),
  keySupport: z.coerce.number().optional().nullable(),
  keyResistance: z.coerce.number().optional().nullable(),
  rationale: z.string().min(1)
});
