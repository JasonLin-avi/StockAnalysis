import { NextResponse } from 'next/server';
const { performFullAnalysis } = require('../../../lib/integration');
const { generateReport } = require('../../../lib/report-generator');
const logger = require('../../../lib/logger');

export const dynamic = 'force-dynamic';


export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  logger.info('API_REPORT', `Received GET request for symbol: ${symbol}`);

  if (!symbol) {
    logger.warn('API_REPORT', 'Request failed: missing symbol parameter');
    return new NextResponse('Symbol parameter is required', { status: 400 });
  }

  try {
    logger.info('API_REPORT', `Starting report generation for ${symbol}...`);
    const analysisResults = await performFullAnalysis(symbol);
    const htmlReport = await generateReport(analysisResults, 'html');
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

