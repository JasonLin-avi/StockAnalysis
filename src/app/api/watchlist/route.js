// Why: Enforce Next.js to not static-analyze or cache this API route at build time because watchlist data dynamically changes.
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
// Why: Import from the service layer to delegate database actions, keeping API routing concern thin.
import { getWatchlistSymbols, addSymbolToWatchlist } from '@/services/watchlist.service';

/**
 * Handles GET requests to retrieve the current user's stock watchlist.
 * @returns {Promise<NextResponse>} JSON response containing list of stock symbols
 */
export async function GET() {
  try {
    // Why: Call service layer which abstracts database queries and handles connection setup automatically.
    const symbols = await getWatchlistSymbols();
    return NextResponse.json(symbols);
  } catch (err) {
    // Why: Wrap DB exceptions with 500 status code to notify the client about database-side failures.
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * Handles POST requests to add a stock symbol to the watchlist.
 * @param {Request} req - The incoming request containing symbol in the JSON body
 * @returns {Promise<NextResponse>} JSON response indicating operation success
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const symbol = body.symbol;
    
    // Why: Ensure basic validation checks on HTTP payloads before querying the service layer.
    if (!symbol) {
      return NextResponse.json({ error: 'Missing symbol' }, { status: 400 });
    }
    
    // Why: Delegate saving logic to the watchlist service to ensure validation and formatting (e.g. UPPERCASE) occur correctly.
    await addSymbolToWatchlist(symbol);
    return NextResponse.json({ success: true });
  } catch (e) {
    // Why: Catch JSON parse errors or validation errors from the service layer, returning 400 bad request status.
    return NextResponse.json({ error: e.message || 'Invalid Request' }, { status: 400 });
  }
}
