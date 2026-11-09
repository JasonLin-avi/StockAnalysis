/**
 * @fileoverview Defensive JSON Extractor and Zod Validation Utilities
 * 
 * Why:
 * LLM outputs frequently include Markdown code blocks (```json ... ```),
 * conversational preamble/postscript, unescaped characters, or trailing commas.
 * This parser isolates valid JSON, repairs common syntax quirks, and validates
 * schemas defensively with guaranteed fallback execution.
 */

/**
 * Strips Markdown code block delimiters and extracts clean text.
 * 
 * @param {string} text - Raw model output text
 * @returns {string} Stripped text
 */
export function stripMarkdownCodeBlocks(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/^```[a-zA-Z0-9_-]*\s*/m, '')
    .replace(/```\s*$/m, '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
}

/**
 * Locates the outermost JSON object `{...}` or array `[...]` in a string.
 * 
 * Why:
 * Models often prepend commentary (e.g. "Here is your JSON:") or append explanations.
 * Extracting between outermost matching brackets preserves the valid payload.
 * 
 * @param {string} text - Text containing JSON
 * @returns {string} Extracted JSON candidate substring
 */
export function extractJsonSubstring(text) {
  if (!text || typeof text !== 'string') return '';

  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');

  let startIdx = -1;
  let endChar = '';

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endChar = '}';
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endChar = ']';
  }

  if (startIdx === -1) {
    return text.trim();
  }

  const lastIdx = text.lastIndexOf(endChar);
  if (lastIdx > startIdx) {
    return text.substring(startIdx, lastIdx + 1).trim();
  }

  return text.substring(startIdx).trim();
}

/**
 * Attempts light structural repair of common LLM JSON syntax errors:
 * - Trailing commas in arrays and objects (e.g., `{"a": 1,}`)
 * - Single-line `//` and multi-line comments
 * 
 * @param {string} jsonStr - Raw JSON candidate string
 * @returns {string} Cleaned JSON candidate string
 */
export function repairJsonSyntax(jsonStr) {
  if (!jsonStr || typeof jsonStr !== 'string') return '';

  return jsonStr
    // Remove single line comments
    .replace(/\/\/[^\n\r]*/g, '')
    // Remove multi-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove trailing commas before closing braces/brackets
    .replace(/,(\s*[}\]])/g, '$1')
    .trim();
}

/**
 * Defensively extracts and parses JSON from raw LLM text.
 * 
 * @param {string} rawText - Model output string
 * @returns {any} Parsed JavaScript object/array
 * @throws {Error} If JSON cannot be parsed after extraction and repair attempts
 */
export function parseJsonDefensively(rawText) {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    throw new Error('Empty or invalid raw text provided to JSON parser');
  }

  const stripped = stripMarkdownCodeBlocks(rawText);

  // Attempt 1: Direct parse
  try {
    return JSON.parse(stripped);
  } catch (err1) {
    // Attempt 2: Extract bracket substring
    const candidate = extractJsonSubstring(stripped);
    try {
      return JSON.parse(candidate);
    } catch (err2) {
      // Attempt 3: Light repair on candidate
      const repaired = repairJsonSyntax(candidate);
      try {
        return JSON.parse(repaired);
      } catch (err3) {
        throw new Error(`Failed to parse JSON after defensive repairs: ${err3.message}. Snippet: "${candidate.slice(0, 100)}..."`);
      }
    }
  }
}

/**
 * Parses raw LLM text, validates against a Zod schema, and falls back gracefully.
 * 
 * Why:
 * Replaces bare `JSON.parse` across API endpoints with guaranteed error boundaries.
 * 
 * @template T
 * @param {string} rawText - Model output string
 * @param {import('zod').ZodType<T>} schema - Zod validation schema
 * @param {T|((err: Error) => T)} [fallback] - Fallback value or fallback factory function
 * @returns {T} Validated data matching schema or fallback
 */
export function parseWithZod(rawText, schema, fallback) {
  try {
    const parsed = parseJsonDefensively(rawText);
    const result = schema.safeParse(parsed);

    if (result.success) {
      return result.data;
    }

    const zodIssues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Error(`Zod validation failed: ${zodIssues}`);
  } catch (err) {
    console.warn(`[PromptParser] JSON parsing or validation failed (${err.message}). Activating fallback.`);
    if (typeof fallback === 'function') {
      return fallback(err);
    }
    if (fallback !== undefined) {
      return fallback;
    }
    throw err;
  }
}

/**
 * Non-throwing safe parse with detailed success/error status and Zod schema.
 * 
 * @template T
 * @param {string} rawText - Model output string
 * @param {import('zod').ZodType<T>} schema - Zod validation schema
 * @returns {{ success: true, data: T } | { success: false, error: Error }}
 */
export function safeParseWithZod(rawText, schema) {
  try {
    const parsed = parseJsonDefensively(rawText);
    const result = schema.safeParse(parsed);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
  } catch (err) {
    return { success: false, error: err };
  }
}
