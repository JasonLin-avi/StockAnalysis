// src/services/report.service.js
// Why: Report service layer that wraps report compiling workflow.
// Orchestrates stock analysis data gathering and delegates page formatting to specific template engines.

const { performFullAnalysis } = require('../lib/integration');
const { generateReport: libGenerateReport } = require('../lib/report-generator');
const logger = require('../lib/logger');

/**
 * Executes a full stock analysis and generates the report document.
 * Why: Moves workflow orchestration of report generation out of next.js route handler.
 * 
 * @param {string} symbol - Target stock ticker symbol.
 * @param {string} [format='html'] - Target report format.
 * @returns {Promise<string>} Content of the compiled report.
 */
async function generateReport(symbol, format = 'html') {
  logger.info('REPORT_SERVICE', `Starting report compilation workflow for: ${symbol} (format: ${format})`);
  
  // Why: Delegate to integration layer to gather all required financial data.
  const analysisResults = await performFullAnalysis(symbol);
  
  // Why: Delegate rendering logic to report generator templates.
  const content = await libGenerateReport(analysisResults, format);
  
  logger.info('REPORT_SERVICE', `Successfully compiled report for: ${symbol}`);
  return content;
}

module.exports = {
  generateReport
};
