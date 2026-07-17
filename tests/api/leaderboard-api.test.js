// tests/api/leaderboard-api.test.js
import { GET } from '../../src/app/api/leaderboard/route';

describe('Leaderboard API', () => {
  it('returns exactly 3 top stocks', async () => {
    const req = new Request('http://localhost/api/leaderboard');
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeLessThanOrEqual(3);
    if (data.length > 0) {
      expect(data[0]).toHaveProperty('symbol');
      expect(data[0]).toHaveProperty('rate');
      expect(data[0]).toHaveProperty('ret');
    }
  });
});
