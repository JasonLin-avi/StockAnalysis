const { fetchHistoricalData } = require('../src/lib/data-fetcher');

async function main() {
  try {
    const data = await fetchHistoricalData('MSFT');
    console.log('MSFT Historical Success! Points:', data.data.length);
  } catch (err) {
    console.error('Failed to fetch:', err);
  }
}

main();
