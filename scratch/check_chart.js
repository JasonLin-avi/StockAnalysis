async function checkChartMeta() {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/AAPL?range=1d&interval=1d`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  if (response.ok) {
    const data = await response.json();
    console.log('Chart Meta:', JSON.stringify(data.chart.result[0].meta, null, 2));
  } else {
    console.log('Error:', response.status);
  }
}

checkChartMeta();
