const { generateHTMLReport } = require('./html-report');

/**
 * Generates a stock analysis report in the requested format.
 * @param {Object} analysisData - Consolidated analysis results
 * @param {string} [format='html'] - Output format
 * @returns {Promise<string>} Report content
 */
async function generateReport(analysisData, format = 'html') {
  if (format === 'html') {
    return generateHTMLReport(analysisData);
  }
  throw new Error(`Unsupported report format: ${format}`);
}

module.exports = { generateReport, generateHTMLReport };
