async function main() {
  const url = 'https://query1.finance.yahoo.com/v8/finance/chart/MSFT?range=1mo&interval=1d';
  console.log('Fetching:', url);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log('Status:', res.status, res.statusText);
    const text = await res.text();
    console.log('Body length:', text.length);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
main();
