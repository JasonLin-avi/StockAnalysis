// Why: Evaluates LLM prediction accuracy by revealing actual future market data post-cutoff date.
// Serves as the referee LLM service component in historical backtest validation.
import { NextResponse } from 'next/server';
import { splitHistoricalKlines, getOrSyncKlines } from '@/services/backtest.service';
import { callGemini } from '@/external/gemini/client';

export async function POST(req) {
  try {
    const { symbol, cutoffDate, predictionDays = 20, predictionResult } = await req.json();

    if (!symbol || !cutoffDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
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

    const startPrice = pastKlines[pastKlines.length - 1]?.close || futureKlines[0].open || futureKlines[0].close;
    const endPrice = futureKlines[futureKlines.length - 1].close;
    const actualReturnPct = parseFloat((((endPrice - startPrice) / startPrice) * 100).toFixed(2));
    
    const directionCorrect =
      (predictionResult?.trend === 'BULLISH' && actualReturnPct > 0) ||
      (predictionResult?.trend === 'BEARISH' && actualReturnPct < 0) ||
      (predictionResult?.trend === 'NEUTRAL' && Math.abs(actualReturnPct) <= 2.0);

    const minTarget = predictionResult?.targetPriceRange?.[0];
    const maxTarget = predictionResult?.targetPriceRange?.[1];
    const priceRangeHit = minTarget && maxTarget ? (endPrice >= minTarget && endPrice <= maxTarget) : false;

    const prompt = `你是一位客觀嚴謹的金融裁判。
請針對 Predictor LLM 在歷史時間點【${cutoffDate}】對 ${symbol} 發布的預測，對比【未來 ${futureKlines.length} 個交易日】的真實市場表現進行客觀評估：

【AI 歷史預測內容】
- 看法方向: ${predictionResult?.trend || 'N/A'}
- 目標價區間: $${minTarget || 'N/A'} - $${maxTarget || 'N/A'}
- 建議停損價: $${predictionResult?.stopLossPrice || 'N/A'}
- 推理說明: ${predictionResult?.rationale || 'N/A'}

【實際市場後續表現】
- 基準日價格: $${startPrice}
- 經過 ${futureKlines.length} 個交易日後收盤價: $${endPrice}
- 實際漲跌幅: ${actualReturnPct}%
- 方向是否正確: ${directionCorrect ? '是' : '否'}

請嚴格輸出 JSON 格式（不要包含 markdown 標籤或其餘文字）：
{
  "accuracyScore": 0到100的整數數字,
  "directionCorrect": ${directionCorrect},
  "priceRangeHit": ${priceRangeHit},
  "actualReturnPct": ${actualReturnPct},
  "evaluationSummary": "詳細精簡的覆盤評語"
}`;

    let evaluation;
    try {
      const llmOutput = await callGemini(prompt, { tools: [] });
      const cleanJsonStr = llmOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
      evaluation = JSON.parse(cleanJsonStr);
    } catch (llmErr) {
      console.warn('Gemini Evaluator JSON parse fallback triggered:', llmErr);
      const baseScore = directionCorrect ? 80 : 40;
      const hitBonus = priceRangeHit ? 15 : 0;
      evaluation = {
        accuracyScore: Math.min(100, baseScore + hitBonus),
        directionCorrect,
        priceRangeHit,
        actualReturnPct,
        evaluationSummary: `在 ${cutoffDate} 之後的 ${futureKlines.length} 個交易日內，${symbol} 實際變幅為 ${actualReturnPct}%。AI 預測方向為 ${predictionResult?.trend}，評估判定 ${directionCorrect ? '方向符合' : '方向偏差'}。`
      };
    }

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
