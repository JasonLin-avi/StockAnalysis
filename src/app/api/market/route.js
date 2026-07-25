import { NextResponse } from 'next/server';
import yahooFinance from '../../../external/data-fetcher/yahoo-finance';
const { fetchStockData } = yahooFinance;

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch Taiwan Index (^TWII) and S&P 500 Index (^GSPC) in parallel
    const [twii, gspc] = await Promise.all([
      fetchStockData('^TWII').catch(err => {
        console.error('Failed to fetch ^TWII:', err);
        return { price: 23450.80, changePercent: 0.85 }; // static fallback
      }),
      fetchStockData('^GSPC').catch(err => {
        console.error('Failed to fetch ^GSPC:', err);
        return { price: 5632.10, changePercent: -0.21 }; // static fallback
      })
    ]);

    return NextResponse.json({
      twii: {
        price: twii.price,
        changePercent: twii.changePercent,
        displayPrice: Number(twii.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        displayChange: `${twii.changePercent >= 0 ? '▲ +' : '▼ '}${Number(twii.changePercent).toFixed(2)}%`,
        color: twii.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
      },
      gspc: {
        price: gspc.price,
        changePercent: gspc.changePercent,
        displayPrice: Number(gspc.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        displayChange: `${gspc.changePercent >= 0 ? '▲ +' : '▼ '}${Number(gspc.changePercent).toFixed(2)}%`,
        color: gspc.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
