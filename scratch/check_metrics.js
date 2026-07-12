async function getMetrics() {
  try {
    // 1. Get cookie
    const fcResponse = await fetch('https://fc.yahoo.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const cookie = fcResponse.headers.get('set-cookie');

    // 2. Get crumb
    const crumbResponse = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const crumb = await crumbResponse.text();

    // 3. Get quoteSummary
    const summaryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/AAPL?modules=financialData,defaultKeyStatistics,earnings&crumb=${crumb}`;
    const summaryResponse = await fetch(summaryUrl, {
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (summaryResponse.ok) {
      const data = await summaryResponse.json();
      const result = data.quoteSummary.result[0];
      const financialData = result.financialData || {};
      const defaultKeyStats = result.defaultKeyStatistics || {};
      const earnings = result.earnings || {};

      console.log('--- EXTRACTED VALUES ---');
      console.log('trailingEps:', defaultKeyStats.trailingEps);
      console.log('debtToEquity:', financialData.debtToEquity);
      console.log('revenueGrowth:', financialData.revenueGrowth);
      console.log('operatingCashflow:', financialData.operatingCashflow);
      console.log('freeCashflow:', financialData.freeCashflow);
      console.log('earnings financialsChart:', JSON.stringify(earnings.financialsChart, null, 2));
    }
  } catch (err) {
    console.error(err);
  }
}

getMetrics();
