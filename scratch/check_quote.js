async function checkQuote() {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=AAPL,TSLA,2330.TW`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  console.log('Status:', response.status);
  if (response.ok) {
    const data = await response.json();
    console.log('Data:', JSON.stringify(data.quoteResponse.result, null, 2));
  } else {
    console.log('Error:', await response.text());
  }
}

checkQuote();
