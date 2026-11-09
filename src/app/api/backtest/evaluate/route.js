// Why: Evaluates LLM prediction accuracy by revealing actual future market data post-cutoff date.
// Serves as the referee LLM service component in historical backtest validation.
import { NextResponse } from 'next/server';
import {
  splitHistoricalKlines,
  getOrSyncKlines,
  getCachedBacktestRecord,
  updateBacktestEvaluation,
} from '@/services/backtest.service';
import { callGemini } from '@/external/gemini/client';
import {
  getBacktestEvaluatePrompt,
  backtestEvaluateSchema,
  parseWithZod,
} from '@/lib/prompts';

export async function POST(req) {
  try {
    const { symbol, cutoffDate, lookbackDays = 60, predictionDays = 20, predictionResult } = await req.json();

    if (!symbol || !cutoffDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const activeLookbackDays = parseInt(lookbackDays, 10) || 60;

    // Why: Check local database cache to prevent re-evaluating completed backtest cases.
    const cachedRecord = await getCachedBacktestRecord({
      symbol,
      cutoffDate,
      lookbackDays: activeLookbackDays,
      predictionDays,
    });

    if (cachedRecord?.evaluation) {
      return NextResponse.json({
        success: true,
        evaluation: cachedRecord.evaluation,
        cached: true,
      });
    }

    // 1. Get K-lines from DB first (syncs incrementally if missing)
    const klines = await getOrSyncKlines(symbol, cutoffDate);

    const { pastKlines, futureKlines } = splitHistoricalKlines(klines, cutoffDate, predictionDays);

    if (futureKlines.length === 0) {
      return NextResponse.json({
        success: true,
        evaluation: {
          accuracyScore: 70,
          directionCorrect: true,
          priceRangeHit: false,
          actualReturnPct: 0.0,
          evaluationSummary: `在基準日 ${cutoffDate} 之後尚無足夠的交易日數據以揭曉完整表現。`
        }
      });
    }

    const startBar = pastKlines[pastKlines.length - 1] || futureKlines[0];
    const startPrice = startBar?.close || startBar?.open;
    const startDate = startBar?.date || startBar?.time || cutoffDate;
    const endBar = futureKlines[futureKlines.length - 1];
    const endPrice = endBar.close;
    const endDate = endBar.date || endBar.time;
    const actualReturnPct = parseFloat((((endPrice - startPrice) / startPrice) * 100).toFixed(2));
    
    const directionCorrect =
      (predictionResult?.trend === 'BULLISH' && actualReturnPct > 0) ||
      (predictionResult?.trend === 'BEARISH' && actualReturnPct < 0) ||
      (predictionResult?.trend === 'NEUTRAL' && Math.abs(actualReturnPct) <= 2.0);

    const rawTarget = predictionResult?.targetPriceRange || [];
    const minTarget = rawTarget.length >= 2 ? Math.min(Number(rawTarget[0]), Number(rawTarget[1])) : rawTarget[0];
    const maxTarget = rawTarget.length >= 2 ? Math.max(Number(rawTarget[0]), Number(rawTarget[1])) : rawTarget[1];
    const priceRangeHit = minTarget !== undefined && maxTarget !== undefined && !isNaN(minTarget) && !isNaN(maxTarget)
      ? (endPrice >= minTarget && endPrice <= maxTarget)
      : false;

    // Why: Use centralized prompt generator to guarantee consistent versioning and criteria.
    const prompt = getBacktestEvaluatePrompt({
      symbol,
      cutoffDate,
      futureDays: futureKlines.length,
      predictionResult,
      startPrice,
      startDate,
      endPrice,
      endDate,
      actualReturnPct,
      directionCorrect,
      priceRangeHit,
      minTarget,
      maxTarget,
    });

    const fallbackEvaluation = () => {
      const baseScore = directionCorrect ? 80 : 40;
      const hitBonus = priceRangeHit ? 15 : 0;
      return {
        accuracyScore: Math.min(100, baseScore + hitBonus),
        directionCorrect,
        priceRangeHit,
        actualReturnPct,
        evaluationSummary: `在 ${cutoffDate} 之後的 ${futureKlines.length} 個交易日內，${symbol} 實際變幅為 ${actualReturnPct}%。AI 預測方向為 ${predictionResult?.trend}，評估判定 ${directionCorrect ? '方向符合' : '方向偏差'}。`
      };
    };

    let evaluation;
    try {
      const llmOutput = await callGemini(prompt, { tools: [] });
      // Why: Defensively parse JSON output and validate against Zod schema with auto-repair and fallback.
      evaluation = parseWithZod(llmOutput, backtestEvaluateSchema, fallbackEvaluation);
    } catch (llmErr) {
      console.warn('Gemini Evaluator JSON parse fallback triggered:', llmErr);
      evaluation = fallbackEvaluation();
    }

    // Attach verified prices and dates to evaluation
    evaluation.startPrice = startPrice;
    evaluation.endPrice = endPrice;
    evaluation.startDate = startDate;
    evaluation.endDate = endDate;

    // Why: Save evaluation into backtest_records for future cache hits.
    await updateBacktestEvaluation({
      symbol,
      cutoffDate,
      lookbackDays: activeLookbackDays,
      predictionDays,
      evaluation,
    });

    return NextResponse.json({
      success: true,
      evaluation,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
