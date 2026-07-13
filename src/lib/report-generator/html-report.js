const { htmlTemplate } = require('./template');

/**
 * Generates an HTML report string by injecting analysis results into the template.
 * @param {Object} analysisData - Combined analysis results containing technical, fundamental, news, and advice
 * @returns {string} HTML content
 */
function generateHTMLReport(analysisData) {
  if (!analysisData) {
    throw new Error('Analysis data is required to generate report');
  }

  const symbol = (analysisData.symbol || 'N/A').toUpperCase();
  const date = analysisData.date || new Date().toISOString().split('T')[0];
  const price = analysisData.price !== undefined ? `$${analysisData.price.toFixed(2)}` : 'N/A';
  const changePercent = analysisData.changePercent !== undefined ? (analysisData.changePercent >= 0 ? `+${analysisData.changePercent.toFixed(2)}` : `${analysisData.changePercent.toFixed(2)}`) : '0.00';

  // Technical defaults
  const tech = analysisData.technical || {};
  const maArray = tech.ma || [];
  const rsiArray = tech.rsi || [];
  const macdObj = tech.macd || {};
  const macdHistArray = macdObj.histogram || [];

  const lastMA = maArray.length > 0 && maArray[maArray.length - 1] !== null ? `$${maArray[maArray.length - 1].toFixed(2)}` : 'N/A';
  const lastRSI = rsiArray.length > 0 && rsiArray[rsiArray.length - 1] !== null ? rsiArray[rsiArray.length - 1].toFixed(2) : 'N/A';
  const lastMACDHist = macdHistArray.length > 0 && macdHistArray[macdHistArray.length - 1] !== null ? macdHistArray[macdHistArray.length - 1].toFixed(4) : 'N/A';

  let rsiClass = 'value-neutral';
  if (lastRSI !== 'N/A') {
    const rsiVal = parseFloat(lastRSI);
    if (rsiVal >= 70) rsiClass = 'value-down'; // Overbought
    else if (rsiVal <= 30) rsiClass = 'value-up'; // Oversold
  }

  let macdClass = 'value-neutral';
  if (lastMACDHist !== 'N/A') {
    const macdVal = parseFloat(lastMACDHist);
    if (macdVal > 0) macdClass = 'value-up';
    else if (macdVal < 0) macdClass = 'value-down';
  }

  // Fundamental defaults
  const fund = analysisData.fundamental || {};
  const pe = fund.pe || { value: null, status: 'N/A', recommendation: 'Hold' };
  const eps = fund.eps || { value: null, trend: 'N/A', status: 'N/A' };
  const debt = fund.debtRatio || { value: null, status: 'N/A' };
  const rev = fund.revenueGrowth || { value: null, status: 'N/A' };
  const cash = fund.cashFlow || { freeCashFlow: null, operatingCashFlow: null, status: 'N/A' };

  const peRatioStr = pe.value !== null ? pe.value.toFixed(2) : 'N/A';
  const epsStr = eps.value !== null ? eps.value.toFixed(2) : 'N/A';
  const debtRatioStr = debt.value !== null ? `${(debt.value * 100).toFixed(1)}%` : 'N/A';
  const revenueGrowthStr = rev.value !== null ? `${(rev.value * 100).toFixed(1)}%` : 'N/A';
  const freeCashFlowStr = cash.freeCashFlow !== null ? `$${(cash.freeCashFlow / 1e9).toFixed(2)}B` : 'N/A';

  let peClass = 'value-neutral';
  if (pe.status === 'Undervalued') peClass = 'value-up';
  else if (pe.status === 'Overvalued') peClass = 'value-down';

  // News defaults
  const news = analysisData.news || {};
  const finNews = news.financialNews || { score: 0, sentiment: 'Neutral' };
  const socSent = news.socialSentiment || { score: 0, sentiment: 'Neutral' };
  const majorEv = news.majorEvents || { hasHighImpactEvent: false, events: [] };

  const newsScoreStr = finNews.score != null ? finNews.score.toFixed(2) : 'N/A';
  const socialScoreStr = socSent.score != null ? socSent.score.toFixed(2) : 'N/A';
  const highImpactStr = majorEv.hasHighImpactEvent ? '⚠️ 偵測到高影響力重大事件' : '無重大異常事件';

  let newsClass = 'value-neutral';
  if (finNews.sentiment === 'Positive') newsClass = 'value-up';
  else if (finNews.sentiment === 'Negative') newsClass = 'value-down';

  let socialClass = 'value-neutral';
  if (socSent.sentiment === 'Positive') socialClass = 'value-up';
  else if (socSent.sentiment === 'Negative') socialClass = 'value-down';

  // Advice defaults
  const adv = analysisData.advice || {};
  const buySell = adv.buySell || { action: 'Hold', confidenceScore: 0.5, summary: '無明確評級建議' };
  const portfolio = adv.portfolio || { targetWeight: 0, allocationClass: 'Neutral', rationale: '無偏好配置建議' };
  const risk = adv.risk || { riskLevel: 'Medium', riskMitigation: '無特定防護建議', riskFactors: [] };

  const recAction = buySell.action || 'Hold';
  const confidenceScoreStr = buySell.confidenceScore !== undefined ? buySell.confidenceScore.toFixed(2) : '0.50';
  const positionSizeStr = portfolio.targetWeight !== undefined ? `${(portfolio.targetWeight * 100).toFixed(1)}%` : '0.0%';
  const stopLossStr = analysisData.price !== undefined ? `$${(analysisData.price * 0.93).toFixed(2)}` : 'N/A'; // 7% standard trailing
  const takeProfitStr = analysisData.price !== undefined ? `$${(analysisData.price * 1.15).toFixed(2)}` : 'N/A'; // 15% standard profit target

  let badgeClass = 'badge-hold';
  if (recAction === 'Buy') badgeClass = 'badge-buy';
  else if (recAction === 'Sell') badgeClass = 'badge-sell';

  // Risk factors HTML
  const riskFactors = risk.riskFactors || [];
  let riskFactorsHTML = '';
  if (riskFactors.length === 0) {
    riskFactorsHTML = '<div class="risk-item"><div class="risk-item-icon">✓</div><div>未偵測到顯著的結構性風險因素</div></div>';
  } else {
    riskFactorsHTML = riskFactors.map(factor => `
      <div class="risk-item">
        <div class="risk-item-icon">!</div>
        <div>${factor}</div>
      </div>
    `).join('');
  }

  // Replace placeholders
  let html = htmlTemplate
    .replace(/{{symbol}}/g, symbol)
    .replace(/{{date}}/g, date)
    .replace(/{{price}}/g, price)
    .replace(/{{changePercent}}/g, changePercent)
    .replace(/{{recommendation}}/g, recAction)
    .replace(/{{confidenceScore}}/g, confidenceScoreStr)
    .replace(/{{positionSize}}/g, positionSizeStr)
    .replace(/{{adviceSummary}}/g, buySell.summary || 'N/A')
    .replace(/{{portfolioRationale}}/g, portfolio.rationale || 'N/A')
    .replace(/{{stopLoss}}/g, stopLossStr)
    .replace(/{{takeProfit}}/g, takeProfitStr)
    .replace(/{{ma20}}/g, lastMA)
    .replace(/{{rsi}}/g, lastRSI)
    .replace(/{{rsiClass}}/g, rsiClass)
    .replace(/{{macdHistogram}}/g, lastMACDHist)
    .replace(/{{macdClass}}/g, macdClass)
    .replace(/{{peRatio}}/g, peRatioStr)
    .replace(/{{peStatus}}/g, pe.status || 'N/A')
    .replace(/{{peClass}}/g, peClass)
    .replace(/{{eps}}/g, epsStr)
    .replace(/{{epsStatus}}/g, eps.status || 'N/A')
    .replace(/{{debtRatio}}/g, debtRatioStr)
    .replace(/{{debtRatioStatus}}/g, debt.status || 'N/A')
    .replace(/{{revenueGrowth}}/g, revenueGrowthStr)
    .replace(/{{revenueGrowthStatus}}/g, rev.status || 'N/A')
    .replace(/{{freeCashFlow}}/g, freeCashFlowStr)
    .replace(/{{cashFlowStatus}}/g, cash.status || 'N/A')
    .replace(/{{newsScore}}/g, newsScoreStr)
    .replace(/{{newsSentiment}}/g, finNews.sentiment || 'Neutral')
    .replace(/{{newsClass}}/g, newsClass)
    .replace(/{{socialScore}}/g, socialScoreStr)
    .replace(/{{socialSentiment}}/g, socSent.sentiment || 'Neutral')
    .replace(/{{socialClass}}/g, socialClass)
    .replace(/{{highImpactEvent}}/g, highImpactStr)
    .replace(/{{riskMitigation}}/g, risk.riskMitigation || 'N/A')
    .replace(/{{riskFactorsHTML}}/g, riskFactorsHTML)
    .replace(/{{badgeClass}}/g, badgeClass);

  return html;
}

module.exports = { generateHTMLReport };
