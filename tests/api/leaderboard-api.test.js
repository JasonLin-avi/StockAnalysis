// tests/api/leaderboard-api.test.js
import { GET } from '../../src/app/api/leaderboard/route';

describe('Leaderboard API', () => {
  it('returns exactly 3 top stocks sorted by win rate', async () => {
    const req = new Request('http://localhost/api/leaderboard');
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(3);
    expect(data[0].symbol).toBe('NVDA');
    expect(data[1].symbol).toBe('TSLA');
    expect(data[2].symbol).toBe('AAPL');
    expect(data[0].rate).toBeGreaterThanOrEqual(data[1].rate);
    expect(data[1].rate).toBeGreaterThanOrEqual(data[2].rate);
  });
});

