import { GET, POST } from '../../src/app/api/watchlist/route';

describe('Watchlist API', () => {
  it('returns empty array initially', async () => {
    const req = new Request('http://localhost/api/watchlist');
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });
});
