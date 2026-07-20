/**
 * @fileoverview K-Line Technical Indicator Analysis for LLM Prompt Integration
 * 
 * Safe cross-platform loading:
 * Tries loading native 'talib' package first. If not compiled or missing (e.g. Windows without MSBuild),
 * falls back seamlessly to JS 'technicalindicators' adapter, ensuring 100% reliability.
 */

const { SMA, RSI, MACD } = require('technicalindicators');

let talib;
try {
  talib = require('talib');
} catch (e) {
  // Fallback adapter implementing talib.execute interface using pure JS technicalindicators
  talib = {
    execute({ name, inReal, optInTimePeriod, optInFastPeriod, optInSlowPeriod, optInSignalPeriod }) {
      const values = Array.from(inReal);
      if (name === 'SMA') {
        const res = SMA.calculate({ period: optInTimePeriod, values });
        return { result: { outReal: res } };
      }
      if (name === 'RSI') {
        const res = RSI.calculate({ period: optInTimePeriod, values });
        return { result: { outReal: res } };
      }
      if (name === 'MACD') {
        const res = MACD.calculate({
          fastPeriod: optInFastPeriod || 12,
          slowPeriod: optInSlowPeriod || 26,
          signalPeriod: optInSignalPeriod || 9,
          values,
          SimpleMAOscillator: false,
          SimpleMASignal: false
        });
        return {
          result: {
            outMACD: res.map(r => r.MACD),
            outMACDSignal: res.map(r => r.signal),
            outMACDHist: res.map(r => r.histogram)
          }
        };
      }
      throw new Error(`Unsupported indicator: ${name}`);
    }
  };
}

/**
 * 將 OHLCV 資料透過 talib 轉換為 LLM 專用的結構化技術摘要
 * @param {Object} rawData - 包含日期與陣列的原始市場數據
 */
function generateLLMTechnicalSummary(rawData) {
    const { dates, opens, highs, lows, closes, volumes } = rawData;

    // 確保數據有效
    if (!closes || closes.length < 30) {
        throw new Error("數據量不足，至少需要 30 筆資料來計算指標。");
    }

    // 1. 執行 TA-Lib 批次運算 (需將資料轉換為 float64 陣列)
    const openArr = new Float64Array(opens);
    const highArr = new Float64Array(highs);
    const lowArr = new Float64Array(lows);
    const closeArr = new Float64Array(closes);
    const volumeArr = new Float64Array(volumes);

    // 計算移動平均線 (SMA 5, SMA 20)
    const sma5 = talib.execute({ name: 'SMA', startIdx: 0, endIdx: closeArr.length - 1, inReal: closeArr, optInTimePeriod: 5 }).result.outReal;
    const sma20 = talib.execute({ name: 'SMA', startIdx: 0, endIdx: closeArr.length - 1, inReal: closeArr, optInTimePeriod: 20 }).result.outReal;

    // 計算 RSI (14)
    const rsi14 = talib.execute({ name: 'RSI', startIdx: 0, endIdx: closeArr.length - 1, inReal: closeArr, optInTimePeriod: 14 }).result.outReal;

    // 計算 MACD (預設參數: 12, 26, 9)
    const macdResult = talib.execute({
        name: 'MACD',
        startIdx: 0,
        endIdx: closeArr.length - 1,
        inReal: closeArr,
        optInFastPeriod: 12,
        optInSlowPeriod: 26,
        optInSignalPeriod: 9
    });
    const macd = macdResult.result.outMACD;
    const macdSignal = macdResult.result.outMACDSignal;
    const macdHist = macdResult.result.outMACDHist;

    // 2. 計算近期支撐與壓力 (以過去 20 天為例)
    const recentWindow = 20;
    const recentHighs = highs.slice(-recentWindow);
    const recentLows = lows.slice(-recentWindow);
    const resistanceLevel = Math.max(...recentHighs);
    const supportLevel = Math.min(...recentLows);

    // 3. 取得最新一筆與前一筆的數據對應索引
    const lastIdx = closes.length - 1;
    const prevIdx = closes.length - 2;

    const currentClose = closes[lastIdx];
    const prevClose = closes[prevIdx];
    const priceChange = currentClose - prevClose;
    const priceChangePct = (priceChange / prevClose) * 100;

    const currentMA5 = sma5[sma5.length - 1];
    const currentMA20 = sma20[sma20.length - 1];
    const currentRSI = rsi14[rsi14.length - 1];

    const currentHist = macdHist[macdHist.length - 1];
    const prevHist = macdHist[macdHist.length - 2];
    const currentMacd = macd[macd.length - 1];
    const currentSignal = macdSignal[macdSignal.length - 1];

    // 4. 邏輯判斷與狀態描述
    const trendShortTerm = currentMA5 > currentMA20 ? "多頭排列 (短均高於長均)" : "空頭或盤整排列 (短均低於長均)";
    
    let macdStatus = "";
    if (currentMacd > currentSignal) {
        macdStatus = currentHist > prevHist 
            ? "DIF在訊號線上方，柱狀體擴張 (多方動能增強)" 
            : "DIF在訊號線上方，柱狀體縮減 (多方動能減弱)";
    } else {
        macdStatus = currentHist < prevHist 
            ? "DIF在訊號線下方，柱狀體擴張 (空方動能增強)" 
            : "DIF在訊號線下方，柱狀體縮減 (空方動能減弱)";
    }

    const avgVolume5 = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const volumeStatus = volumes[lastIdx] > avgVolume5 * 1.5 ? "爆量" : "量能平穩";

    // 5. 封裝為準備送給 LLM 的結構化 JSON
    const llmSummary = {
        date: dates[lastIdx],
        price_action: {
            current_close: Number(currentClose.toFixed(2)),
            change_from_prev: Number(priceChange.toFixed(2)),
            change_pct: Number(priceChangePct.toFixed(2)),
            support_level_20d: Number(supportLevel.toFixed(2)),
            resistance_level_20d: Number(resistanceLevel.toFixed(2))
        },
        technical_indicators: {
            MA5: Number(currentMA5.toFixed(2)),
            MA20: Number(currentMA20.toFixed(2)),
            trend_short_term: trendShortTerm,
            RSI_14: Number(currentRSI.toFixed(2)),
            MACD_status: macdStatus
        },
        volume_analysis: {
            current_volume: volumes[lastIdx],
            volume_vs_5d_avg: volumeStatus
        }
    };

    return llmSummary;
}

module.exports = {
  generateLLMTechnicalSummary
};

// === 測試範例資料（僅在直接執行此檔時運行）===
if (require.main === module) {
    const mockData = {
        dates: Array.from({ length: 40 }, (_, i) => `2026-06-${i + 1 > 30 ? i + 1 - 30 : i + 1}`),
        opens: Array.from({ length: 40 }, () => 900 + Math.random() * 20),
        highs: Array.from({ length: 40 }, () => 920 + Math.random() * 20),
        lows: Array.from({ length: 40 }, () => 880 + Math.random() * 20),
        closes: Array.from({ length: 40 }, (_, i) => 900 + i * 0.5 + Math.random() * 10),
        volumes: Array.from({ length: 40 }, () => Math.floor(30000 + Math.random() * 50000))
    };

    const summary = generateLLMTechnicalSummary(mockData);
    console.log(JSON.stringify(summary, null, 4));
}