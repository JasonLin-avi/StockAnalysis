import { NextResponse } from 'next/server';
const { performFullAnalysis } = require('../../../lib/integration');
const { generateReport } = require('../../../lib/report-generator');

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return new NextResponse('Symbol parameter is required', { status: 400 });
  }

  try {
    const analysisResults = await performFullAnalysis(symbol);
    const htmlReport = await generateReport(analysisResults, 'html');

    return new NextResponse(htmlReport, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });
  } catch (error) {
    console.error('Report API error:', error);
    return new NextResponse(`Error generating report: ${error.message}`, { status: 500 });
  }
}
