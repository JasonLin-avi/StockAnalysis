/**
 * @fileoverview Unit tests for defensive JSON extraction and Zod parsing
 */

import { z } from 'zod';
import {
  stripMarkdownCodeBlocks,
  extractJsonSubstring,
  repairJsonSyntax,
  parseJsonDefensively,
  parseWithZod,
  safeParseWithZod,
  backtestEvaluateSchema,
  backtestPredictSchema
} from '../../src/lib/prompts';

describe('Zod Parser & Defensive Auto-Repair', () => {
  describe('stripMarkdownCodeBlocks', () => {
    it('strips ```json code fences', () => {
      const input = '```json\n{"key": "value"}\n```';
      expect(stripMarkdownCodeBlocks(input)).toBe('{"key": "value"}');
    });

    it('strips generic ``` fences', () => {
      const input = '```\n{"key": "value"}\n```';
      expect(stripMarkdownCodeBlocks(input)).toBe('{"key": "value"}');
    });

    it('handles empty or non-string inputs safely', () => {
      expect(stripMarkdownCodeBlocks('')).toBe('');
      expect(stripMarkdownCodeBlocks(null)).toBe('');
    });
  });

  describe('extractJsonSubstring', () => {
    it('extracts JSON object when surrounded by chat preamble and conclusion', () => {
      const input = 'Here is the requested output:\n{"trend": "BULLISH", "confidence": 8}\nHope this helps you!';
      expect(extractJsonSubstring(input)).toBe('{"trend": "BULLISH", "confidence": 8}');
    });

    it('extracts JSON array when surrounded by text', () => {
      const input = 'Leading notes: [1, 2, 3] trailing thoughts';
      expect(extractJsonSubstring(input)).toBe('[1, 2, 3]');
    });
  });

  describe('repairJsonSyntax', () => {
    it('removes trailing commas before closing braces and brackets', () => {
      const input = '{"a": 1, "b": [2, 3, ], }';
      expect(repairJsonSyntax(input)).toBe('{"a": 1, "b": [2, 3 ] }');
    });

    it('removes Javascript line comments and block comments', () => {
      const input = '{\n// this is a comment\n"a": 1 /* inline comment */\n}';
      expect(repairJsonSyntax(input)).toBe('{\n\n"a": 1 \n}');
    });
  });

  describe('parseJsonDefensively', () => {
    it('parses raw JSON string directly', () => {
      const res = parseJsonDefensively('{"name": "test"}');
      expect(res).toEqual({ name: 'test' });
    });

    it('parses markdown-fenced JSON with trailing commas and conversational text', () => {
      const messy = `
Certainly! Here is your analysis:
\`\`\`json
{
  "accuracyScore": 85,
  "directionCorrect": true,
  "priceRangeHit": false,
  "actualReturnPct": 4.5,
  "evaluationSummary": "Good hit",
}
\`\`\`
Good luck trading!
      `;
      const res = parseJsonDefensively(messy);
      expect(res).toEqual({
        accuracyScore: 85,
        directionCorrect: true,
        priceRangeHit: false,
        actualReturnPct: 4.5,
        evaluationSummary: 'Good hit'
      });
    });

    it('throws descriptive error on unparseable string', () => {
      expect(() => parseJsonDefensively('Not json at all')).toThrow(/Failed to parse JSON/);
    });
  });

  describe('parseWithZod', () => {
    const testSchema = z.object({
      id: z.coerce.number(),
      active: z.boolean(),
      tag: z.string().min(1)
    });

    it('validates and auto-coerces fields conforming to schema', () => {
      const input = '```json\n{"id": "42", "active": true, "tag": "quant"}\n```';
      const result = parseWithZod(input, testSchema);
      expect(result).toEqual({ id: 42, active: true, tag: 'quant' });
    });

    it('executes fallback factory function when JSON is corrupt or schema invalid', () => {
      const fallback = jest.fn((err) => ({ id: 0, active: false, tag: 'fallback' }));
      const result = parseWithZod('invalid JSON text', testSchema, fallback);

      expect(fallback).toHaveBeenCalled();
      expect(result).toEqual({ id: 0, active: false, tag: 'fallback' });
    });

    it('returns static fallback value when schema validation fails', () => {
      const staticFallback = { id: 99, active: false, tag: 'default' };
      const result = parseWithZod('{"id": "not a number", "active": true, "tag": "test"}', testSchema, staticFallback);
      expect(result).toEqual(staticFallback);
    });

    it('throws when validation fails and no fallback is provided', () => {
      expect(() => parseWithZod('{"id": "bad"}', testSchema)).toThrow();
    });
  });

  describe('safeParseWithZod', () => {
    const schema = z.object({ score: z.number() });

    it('returns { success: true, data } on valid input', () => {
      const res = safeParseWithZod('{"score": 95}', schema);
      expect(res.success).toBe(true);
      expect(res.data).toEqual({ score: 95 });
    });

    it('returns { success: false, error } on invalid input', () => {
      const res = safeParseWithZod('{"score": "not-number"}', schema);
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  describe('backtestEvaluateSchema integration', () => {
    it('validates backtest evaluation output', () => {
      const mockLlm = `
\`\`\`json
{
  "accuracyScore": "90",
  "directionCorrect": true,
  "priceRangeHit": "false",
  "actualReturnPct": 5.25,
  "evaluationSummary": "預測方向準確，超出目標價格區間少許。"
}
\`\`\`
      `;
      const result = parseWithZod(mockLlm, backtestEvaluateSchema);
      expect(result).toEqual({
        accuracyScore: 90,
        directionCorrect: true,
        priceRangeHit: false,
        actualReturnPct: 5.25,
        evaluationSummary: '預測方向準確，超出目標價格區間少許。'
      });
    });
  });

  describe('backtestPredictSchema integration', () => {
    it('validates backtest prediction output', () => {
      const mockLlm = `
\`\`\`json
{
  "trend": "BULLISH",
  "confidence": 8,
  "targetPriceRange": [920, 960],
  "stopLossPrice": 880,
  "keySupport": 890,
  "keyResistance": 950,
  "rationale": "### 多頭排列與突破量能\\n均線呈現多頭排列。"
}
\`\`\`
      `;
      const result = parseWithZod(mockLlm, backtestPredictSchema);
      expect(result.trend).toBe('BULLISH');
      expect(result.confidence).toBe(8);
      expect(result.targetPriceRange).toEqual([920, 960]);
    });
  });
});
