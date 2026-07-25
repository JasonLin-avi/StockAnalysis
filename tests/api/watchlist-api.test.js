// Why: Integration tests for the Watchlist API route handler, verifying HTTP GET and POST behaviors.
// We mock and seed an in-memory SQLite database connection beforehand to prevent mutating physical on-disk databases.

import { GET, POST, DELETE } from '../../src/app/api/watchlist/route';
import { connectToDatabase } from '../../src/external/database/connection';

describe('Watchlist API', () => {
  let db;

  beforeEach(async () => {
    // Why: Ensure the API routes run against an isolated database to prevent side effects.
    db = await connectToDatabase(':memory:');
  });

  afterEach((done) => {
    // Why: Prevent handle leaks by closing the connection after test runs.
    db.close(done);
  });

  it('returns empty array initially', async () => {
    // Why: The API must return a 200 OK and an empty list when no stocks are watchlisted.
    const req = new Request('http://localhost/api/watchlist');
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });

  it('adds a symbol and then retrieves it', async () => {
    // Why: Test adding TSLA to the watchlist via POST.
    const postReq = new Request('http://localhost/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: 'TSLA' }),
    });
    
    const postRes = await POST(postReq);
    const postData = await postRes.json();
    
    expect(postRes.status).toBe(200);
    expect(postData.success).toBe(true);

    // Why: Verify the symbol actually appears in GET response.
    const getReq = new Request('http://localhost/api/watchlist');
    const getRes = await GET(getReq);
    const getData = await getRes.json();
    
    expect(getRes.status).toBe(200);
    expect(getData).toContain('TSLA');
  });

  it('returns 400 bad request if symbol is missing', async () => {
    // Why: A POST request without a symbol payload is invalid and should fail with 400.
    const req = new Request('http://localhost/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    
    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(400);
    expect(data.error).toBe('Missing symbol');
  });

  it('returns 400 bad request if JSON payload is invalid', async () => {
    // Why: Verify the error handler catches parsing errors correctly.
    const req = new Request('http://localhost/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-json-string',
    });
    
    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  describe('DELETE endpoint', () => {
    it('removes a symbol using URL query parameter', async () => {
      // Why: Seed TSLA and verify it gets removed via DELETE query parameter request.
      const postReq = new Request('http://localhost/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 'TSLA' }),
      });
      await POST(postReq);

      const deleteReq = new Request('http://localhost/api/watchlist?symbol=TSLA', {
        method: 'DELETE',
      });
      const deleteRes = await DELETE(deleteReq);
      const deleteData = await deleteRes.json();

      expect(deleteRes.status).toBe(200);
      expect(deleteData.success).toBe(true);

      const getReq = new Request('http://localhost/api/watchlist');
      const getRes = await GET(getReq);
      const getData = await getRes.json();
      expect(getData).not.toContain('TSLA');
    });

    it('removes a symbol using JSON request body', async () => {
      // Why: Seed NVDA and verify it gets removed via DELETE request with JSON body.
      const postReq = new Request('http://localhost/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 'NVDA' }),
      });
      await POST(postReq);

      const deleteReq = new Request('http://localhost/api/watchlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 'NVDA' }),
      });
      const deleteRes = await DELETE(deleteReq);
      const deleteData = await deleteRes.json();

      expect(deleteRes.status).toBe(200);
      expect(deleteData.success).toBe(true);

      const getReq = new Request('http://localhost/api/watchlist');
      const getRes = await GET(getReq);
      const getData = await getRes.json();
      expect(getData).not.toContain('NVDA');
    });

    it('returns 400 bad request if symbol is missing in query and body', async () => {
      // Why: Ensure the DELETE API handler rejects requests lacking any symbol identification.
      const deleteReq = new Request('http://localhost/api/watchlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const deleteRes = await DELETE(deleteReq);
      const deleteData = await deleteRes.json();

      expect(deleteRes.status).toBe(400);
      expect(deleteData.error).toBe('Missing symbol');
    });

    it('returns 400 bad request if symbol is invalid (e.g. whitespace)', async () => {
      // Why: Validate that empty or whitespace symbol deletes are blocked at API level.
      const deleteReq = new Request('http://localhost/api/watchlist?symbol=   ', {
        method: 'DELETE',
      });
      const deleteRes = await DELETE(deleteReq);
      const deleteData = await deleteRes.json();

      expect(deleteRes.status).toBe(400);
      expect(deleteData.error).toBe('Missing symbol');
    });
  });
});
