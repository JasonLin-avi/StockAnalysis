// tests/unit/report-service.test.js
// Why: Unit tests for Report Service layer.
// Verifies integration flow coordination, report compilation delegation, and historical reports database queries.

import { generateReport, getAllReports } from '../../src/services/report.service';
import { performFullAnalysis } from '../../src/lib/integration';
import { connectToDatabase } from '../../src/external/database/connection';
import { getAllAnalyzedStocks } from '../../src/external/database/queries';
const { generateReport: libGenerateReport } = require('../../src/lib/report-generator');

jest.mock('../../src/lib/integration', () => ({
  performFullAnalysis: jest.fn()
}));

jest.mock('../../src/lib/report-generator', () => ({
  generateReport: jest.fn()
}));

jest.mock('../../src/external/database/connection', () => ({
  connectToDatabase: jest.fn()
}));

jest.mock('../../src/external/database/queries', () => ({
  getAllAnalyzedStocks: jest.fn()
}));

describe('Report Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReport', () => {
    test('should call performFullAnalysis and generateReport with correct parameters', async () => {
      const mockAnalysisData = { symbol: 'AAPL', data: 'mocked' };
      const mockHtmlOutput = '<html>mock report</html>';

      performFullAnalysis.mockResolvedValue(mockAnalysisData);
      libGenerateReport.mockResolvedValue(mockHtmlOutput);

      const result = await generateReport('AAPL', 'html');

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

  describe('getAllReports', () => {
    test('should connect to database and retrieve all analyzed stocks', async () => {
      const mockDb = {};
      const mockReports = [
        { symbol: '2330.TW', name: '台積電', date: '2026-11-09' },
        { symbol: 'AAPL', name: 'Apple Inc.', date: '2026-11-09' }
      ];

      connectToDatabase.mockResolvedValue(mockDb);
      getAllAnalyzedStocks.mockResolvedValue(mockReports);

      const result = await getAllReports();

      expect(connectToDatabase).toHaveBeenCalledTimes(1);
      expect(getAllAnalyzedStocks).toHaveBeenCalledWith(mockDb);
      expect(result).toEqual(mockReports);
    });

    test('should use injected db option when provided', async () => {
      const customDb = { custom: true };
      const mockReports = [{ symbol: 'TSLA' }];

      getAllAnalyzedStocks.mockResolvedValue(mockReports);

      const result = await getAllReports({ db: customDb });

      expect(connectToDatabase).not.toHaveBeenCalled();
      expect(getAllAnalyzedStocks).toHaveBeenCalledWith(customDb);
      expect(result).toEqual(mockReports);
    });
  });
});
