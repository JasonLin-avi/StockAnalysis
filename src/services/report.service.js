// src/services/report.service.js
// Why: Report service layer that wraps report compiling workflow.
// Orchestrates stock analysis data gathering, historical reports querying,
// and delegates page formatting to specific template engines.

import { performFullAnalysis } from '../lib/integration.js';
import { generateReport as libGenerateReport } from '../lib/report-generator/index.js';
import { connectToDatabase } from '../external/database/connection.js';
import { getAllAnalyzedStocks } from '../external/database/queries.js';
import logger from '../lib/logger.js';

/**
 * Executes a full stock analysis and generates the report document.
 * Why: Moves workflow orchestration of report generation out of next.js route handler.
 * 
 * @param {string} symbol - Target stock ticker symbol.
 * @param {string} [format='html'] - Target report format.
 * @returns {Promise<string>} Content of the compiled report.
 */
export async function generateReport(symbol, format = 'html') {
  logger.info('REPORT_SERVICE', `Starting report compilation workflow for: ${symbol} (format: ${format})`);
  
  // Why: Delegate to integration layer to gather all required financial data.
  const analysisResults = await performFullAnalysis(symbol);
  
  // Why: Delegate rendering logic to report generator templates.
  const content = await libGenerateReport(analysisResults, format);
  
  logger.info('REPORT_SERVICE', `Successfully compiled report for: ${symbol}`);
  return content;
}

/**
 * Retrieves all analyzed stock reports stored in the database.
 * Why: Encapsulates database queries for historical reports, preventing UI layers
 * from importing database connections or queries directly.
 * 
 * @param {Object} [options] - Optional dependency injection options
 * @returns {Promise<Array<Object>>} List of analyzed stock records
 */
export async function getAllReports(options = {}) {
  logger.info('REPORT_SERVICE', 'Fetching all analyzed reports from database');
  const db = options.db || (await connectToDatabase());
  return await getAllAnalyzedStocks(db);
}

// Why: report/route.js uses `import reportService from '...'`
// and calls `reportService.generateReport(...)`. Provide default export to match.
export default {
  generateReport,
  getAllReports
};
