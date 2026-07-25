import { NextResponse } from 'next/server';
const reportService = require('../../../services/report.service');
const logger = require('../../../lib/logger');

export const dynamic = 'force-dynamic';

/**
 * Handle GET request for the report API route.
 * Why: Next.js API handler extracts query parameters and delegates core workflow
 * to the report service layer, separating controller logic from execution.
 *
 * @param {Request} request The incoming Next.js API request.
 * @returns {Promise<NextResponse>} The raw HTML response.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  logger.info('API_REPORT', `Received GET request for symbol: ${symbol}`);

  // Why: Ensure target stock symbol is specified in URL query params.
  if (!symbol) {
    logger.warn('API_REPORT', 'Request failed: missing symbol parameter');
    return new NextResponse('Symbol parameter is required', { status: 400 });
  }

  try {
    // Why: Strictly delegate report compiling and formatting steps to service layer.
    const htmlReport = await reportService.generateReport(symbol, 'html');
    logger.info('API_REPORT', `Successfully generated html report for ${symbol} (length: ${htmlReport.length})`);

    return new NextResponse(htmlReport, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });
  } catch (error) {
    logger.error('API_REPORT', `Report generation failed for ${symbol}`, error);
    return new NextResponse(`Error generating report: ${error.message}`, { status: 500 });
  }
}
