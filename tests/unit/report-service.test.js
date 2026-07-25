// tests/unit/report-service.test.js
// Why: Unit tests for Report Service layer.
// Verifies integration flow coordination and report compilation delegation.

const { generateReport } = require('../../src/services/report.service');
const { performFullAnalysis } = require('../../src/lib/integration');
const { generateReport: libGenerateReport } = require('../../src/lib/report-generator');

jest.mock('../../src/lib/integration', () => ({
  performFullAnalysis: jest.fn()
}));

jest.mock('../../src/lib/report-generator', () => ({
  generateReport: jest.fn()
}));

describe('Report Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should call performFullAnalysis and generateReport with correct parameters', async () => {
    const mockAnalysisData = { symbol: 'AAPL', data: 'mocked' };
    const mockHtmlOutput = '<html>mock report</html>';

    performFullAnalysis.mockResolvedValue(mockAnalysisData);
    libGenerateReport.mockResolvedValue(mockHtmlOutput);

    const result = await generateReport('AAPL', 'html');

    // Why: Ensure the service correctly coordinates flow between integration & rendering engines.
    expect(performFullAnalysis).toHaveBeenCalledTimes(1);
    expect(performFullAnalysis).toHaveBeenCalledWith('AAPL');

    expect(libGenerateReport).toHaveBeenCalledTimes(1);
    expect(libGenerateReport).toHaveBeenCalledWith(mockAnalysisData, 'html');

    expect(result).toBe(mockHtmlOutput);
  });

  test('should bubble up errors from the integration data gathering phase', async () => {
    performFullAnalysis.mockRejectedValue(new Error('Integration failed'));

    await expect(generateReport('AAPL', 'html')).rejects.toThrow('Integration failed');
    expect(libGenerateReport).not.toHaveBeenCalled();
  });

  test('should bubble up errors from the rendering phase', async () => {
    performFullAnalysis.mockResolvedValue({ symbol: 'AAPL' });
    libGenerateReport.mockRejectedValue(new Error('Rendering failed'));

    await expect(generateReport('AAPL', 'pdf')).rejects.toThrow('Rendering failed');
  });
});
