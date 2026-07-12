async function getCrumbAndCookie() {
  try {
    // 1. Get cookie from fc.yahoo.com
    const fcResponse = await fetch('https://fc.yahoo.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    // Fetch headers might have multiple set-cookie. In Node fetch, headers.get('set-cookie') returns them combined.
    const cookie = fcResponse.headers.get('set-cookie');
    console.log('Cookie header:', cookie);

    if (!cookie) {
      console.log('No cookie received from fc.yahoo.com');
      return;
    }

    // 2. Get crumb from getcrumb endpoint
    const crumbResponse = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const crumb = await crumbResponse.text();
    console.log('Crumb:', crumb);

    if (crumbResponse.ok && crumb) {
      // 3. Test fetching quoteSummary with cookie and crumb
      const summaryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/AAPL?modules=financialData,defaultKeyStatistics,earnings&crumb=${crumb}`;
      const summaryResponse = await fetch(summaryUrl, {
        headers: {
          'Cookie': cookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      console.log('Summary Status:', summaryResponse.status);
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        console.log('Data:', JSON.stringify(summaryData, null, 2).substring(0, 1000));
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

getCrumbAndCookie();
