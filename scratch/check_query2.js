async function checkQuery2() {
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/AAPL?modules=financialData,defaultKeyStatistics,earnings`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  console.log('Status:', response.status);
  if (response.ok) {
    const data = await response.json();
    console.log('Data:', JSON.stringify(data, null, 2).substring(0, 500));
  } else {
    console.log('Error:', await response.text());
  }
}

checkQuery2();
