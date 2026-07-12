const { fetchFundamentalData } = require('../src/lib/data-fetcher/yahoo-finance');

async function testTsla() {
  try {
    const data = await fetchFundamentalData('TSLA');
    console.log('TSLA Fundamentals:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

testTsla();
