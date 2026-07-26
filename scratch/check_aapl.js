import { fetchFundamentalData, fetchStockData }  from '../src/lib/data-fetcher';

async function main() {
  try {
    const stock = await fetchStockData('AAPL');
    const fund = await fetchFundamentalData('AAPL');
    console.log('Stock Quote:', stock);
    console.log('Fundamentals:', fund);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
