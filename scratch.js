import dotenv  from 'dotenv';
dotenv.config({ path: '.env.local' });
const apiKey = process.env.FINNHUB_API_KEY;
console.log('Using API key:', apiKey);

const url = `https://finnhub.io/api/v1/stock/social-sentiment?symbol=MU&from=2026-07-07&token=${apiKey}`;

fetch(url).then(async (res) => {
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text);
}).catch(console.error);
