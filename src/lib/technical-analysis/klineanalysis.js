/**
 * @fileoverview K-Line Technical Indicator Analysis for LLM Prompt Integration
 * 
 * Uses 'technicalindicators' library to compute short and long-term indicators (SMA, RSI, MACD),
 * generating a structured JSON summary formatted for LLM prompts.
 * 
 * @module lib/technical-analysis/klineanalysis
 */

import { SMA, RSI, MACD }  from 'technicalindicators';

/**
 * 將 OHLCV 資料轉換為 LLM 專用的結構化技術摘要（含短線與長線特徵）
 * @param {Object} rawData - 包含日期與陣列的原始市場數據 (dates, opens, highs, lows, closes, volumes)
 * @returns {Object} 結構化技術指標摘要 JSON
 */
function generateLLMTechnicalSummary(rawData) {
    const { dates, opens, highs, lows, closes, volumes } = rawData;

    // 1. 確保數據有效 (提高至至少 60 筆以支援長均線 MA60 計算)
    if (!closes || closes.length < 60) {
        throw new Error("數據量不足，至少需要 60 筆資料來計算長短線指標。");
    }

    const closeArr = Array.from(closes);

    // 2. 計算移動平均線 (短線: MA5, MA20 / 長線: MA60)
    const sma5 = SMA.calculate({ period: 5, values: closeArr });
    const sma20 = SMA.calculate({ period: 20, values: closeArr });
    const sma60 = SMA.calculate({ period: 60, values: closeArr });

    // 3. 計算 RSI (14)
    const rsi14 = RSI.calculate({ period: 14, values: closeArr });

    // 4. 計算 MACD (12, 26, 9)
    const macdResult = MACD.calculate({
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        values: closeArr,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    });

    // 5. 計算支撐與壓力位 (短線 20 天 vs 長線 60 天)
    const shortWindow = 20;
    const longWindow = 60;

    const shortHighs = highs.slice(-shortWindow);
    const shortLows = lows.slice(-shortWindow);
    const resistanceShort = Math.max(...shortHighs);
    const supportShort = Math.min(...shortLows);

    const longHighs = highs.slice(-longWindow);
    const longLows = lows.slice(-longWindow);
    const resistanceLong = Math.max(...longHighs);
    const supportLong = Math.min(...longLows);

    // 6. 取得最新與前一筆數據
    const lastIdx = closes.length - 1;
    const prevIdx = closes.length - 2;

    const currentClose = closes[lastIdx];
    const prevClose = closes[prevIdx];
    const priceChange = currentClose - prevClose;
    const priceChangePct = (priceChange / prevClose) * 100;

    const currentMA5 = sma5[sma5.length - 1];
    const currentMA20 = sma20[sma20.length - 1];
    const currentMA60 = sma60[sma60.length - 1];
    const prevMA60 = sma60[sma60.length - 2]; // 用於判斷長均線斜率

    const currentRSI = rsi14[rsi14.length - 1];

    const lastMacd = macdResult[macdResult.length - 1];
    const prevMacd = macdResult[macdResult.length - 2];

    const currentHist = lastMacd.histogram;
    const prevHist = prevMacd.histogram;
    const currentMacdVal = lastMacd.MACD;
    const currentSignalVal = lastMacd.signal;

    // 7. 趨勢與型態狀態分析
    const trendShortTerm = currentMA5 > currentMA20 
        ? "多頭排列 (短均高於長均)" 
        : "空頭或盤整排列 (短均低於長均)";

    // 長線趨勢判斷 (價格 vs MA60，以及 MA60 斜率)
    let trendLongTerm = "";
    if (currentClose > currentMA60 && currentMA60 >= prevMA60) {
        trendLongTerm = "長線多頭結構 (價格在季線上方且季線走揚)";
    } else if (currentClose < currentMA60 && currentMA60 <= prevMA60) {
        trendLongTerm = "長線空頭結構 (價格在季線下方且季線下彎)";
    } else {
        trendLongTerm = "長線盤整/築底結構 (季線附近膠著)";
    }
    
    let macdStatus = "";
    if (currentMacdVal > currentSignalVal) {
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

    // 8. 封裝結構化 JSON 回傳 (擴充含短線與長線區塊)
    return {
        date: dates[lastIdx],
        price_action: {
            current_close: Number(currentClose.toFixed(2)),
            change_from_prev: Number(priceChange.toFixed(2)),
            change_pct: Number(priceChangePct.toFixed(2)),
            support_level_20d: Number(supportShort.toFixed(2)),
            resistance_level_20d: Number(resistanceShort.toFixed(2)),
            support_level_60d: Number(supportLong.toFixed(2)),
            resistance_level_60d: Number(resistanceLong.toFixed(2))
        },
        technical_indicators: {
            MA5: Number(currentMA5.toFixed(2)),
            MA20: Number(currentMA20.toFixed(2)),
            MA60: Number(currentMA60.toFixed(2)),
            trend_short_term: trendShortTerm,
            trend_long_term: trendLongTerm,
            RSI_14: Number(currentRSI.toFixed(2)),
            MACD_status: macdStatus
        },
        volume_analysis: {
            current_volume: volumes[lastIdx],
            volume_vs_5d_avg: volumeStatus
        }
    };
}

export {generateLLMTechnicalSummary};

// === 測試範例資料 ===
if (require.main === module) {
    const mockData = {
        dates: Array.from({ length: 80 }, (_, i) => `2026-06-${i + 1 > 30 ? i + 1 - 30 : i + 1}`),
        opens: Array.from({ length: 80 }, () => 900 + Math.random() * 20),
        highs: Array.from({ length: 80 }, () => 920 + Math.random() * 20),
        lows: Array.from({ length: 80 }, () => 880 + Math.random() * 20),
        closes: Array.from({ length: 80 }, (_, i) => 900 + i * 0.5 + Math.random() * 10),
        volumes: Array.from({ length: 80 }, () => Math.floor(30000 + Math.random() * 50000))
    };

    const summary = generateLLMTechnicalSummary(mockData);
    console.log(JSON.stringify(summary, null, 4));
}