/**
 * Major Corporate Events Analysis Module
 * Fetches upcoming earnings dates and EPS estimates from Finnhub as the primary
 * source of "major catalyst events" for a stock.
 *
 * Why earnings calendar as events:
 * - Earnings releases are the single highest-impact recurring event for any public company.
 *   They can move a stock ±10% in a single session, making them the most actionable catalyst.
 * - Other event types (product launches, legal rulings) do not have a reliable free API;
 *   earnings data from Finnhub is accurate, real-time, and structured.
 *
 * @module news-analysis/major-events
 */

/**
 * Returns ISO date string for N days from today.
 * @param {number} daysFromNow - Positive = future, 0 = today
 * @returns {string} YYYY-MM-DD
 */
function dateFromNow(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

/**
 * Maps an EPS estimate comparison to an impact classification.
 * We classify an upcoming earnings as High Positive only when the consensus estimate
 * is meaningfully above recent actuals, signaling potential upside surprise potential.
 *
 * @param {Object} entry - Finnhub earnings calendar entry
 * @returns {'High Positive'|'High Negative'|'Neutral'} Impact label
 */
function classifyEarningsImpact(entry) {
  const estimate = entry.epsEstimate;
  const actual = entry.epsActual;

  // If actuals are already known (past earnings), compare directly.
  if (actual !== null && actual !== undefined && estimate !== null && estimate !== undefined) {
    const diff = actual - estimate;
    if (diff > 0.1) return 'High Positive';
    if (diff < -0.1) return 'High Negative';
    return 'Neutral';
  }

  // For future earnings with only estimates, mark as a catalyst to watch.
  if (estimate !== null && estimate !== undefined) {
    return estimate >= 0 ? 'Neutral' : 'High Negative';
  }

  return 'Neutral';
}

/**
 * Fetches upcoming and recent earnings events for a stock from Finnhub.
 * Returns an empty events list with hasHighImpactEvent=false when data is unavailable,
 * so the risk engine does not incorrectly flag or clear events based on missing data.
 *
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Object>} { events, hasHighImpactEvent }
 */
async function analyzeMajorEvents(symbol) {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return { events: [], hasHighImpactEvent: false };
  }

  const ticker = (symbol || '').toUpperCase();
  // Look back 30 days and forward 90 days to capture recent results and upcoming events.
  const from = dateFromNow(-30);
  const to = dateFromNow(90);
  const url = `https://finnhub.io/api/v1/calendar/earnings?symbol=${encodeURIComponent(ticker)}&from=${from}&to=${to}&token=${apiKey}`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'stock-analysis-platform/1.0' }
    });

    if (!response.ok) {
      console.warn(`Finnhub earnings calendar API error for ${ticker}: ${response.status}`);
      return { events: [], hasHighImpactEvent: false };
    }

    const data = await response.json();
    const earningsArray = data.earningsCalendar || [];

    if (earningsArray.length === 0) {
      return { events: [], hasHighImpactEvent: false };
    }

    const events = earningsArray.map(entry => {
      const impact = classifyEarningsImpact(entry);
      const epsLabel = entry.epsEstimate != null
        ? `EPS 預估: $${entry.epsEstimate}`
        : 'EPS 預估: N/A';
      const revenueLabel = entry.revenueEstimate != null
        ? `｜營收預估: $${(entry.revenueEstimate / 1e9).toFixed(2)}B`
        : '';

      return {
        title: `${ticker} 財報發布 (Earnings Release)`,
        date: entry.date,
        impact,
        description: `${epsLabel}${revenueLabel}。財報發布是股價最主要的短期催化劑，請留意盤後波動。`
      };
    });

    const hasHighImpactEvent = events.some(
      e => e.impact === 'High Positive' || e.impact === 'High Negative'
    );

    return { events, hasHighImpactEvent };
  } catch (err) {
    console.warn(`analyzeMajorEvents fetch failed for ${ticker}: ${err.message}`);
    return { events: [], hasHighImpactEvent: false };
  }
}

module.exports = { analyzeMajorEvents };
