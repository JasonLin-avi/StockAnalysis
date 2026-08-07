// Why: Exposes preset backtest scenarios for users to quickly explore historical point-in-time LLM backtesting.
import { NextResponse } from 'next/server';
import { PRESET_CASES } from '@/services/backtest.service';

export async function GET() {
  // Why: Return curated preset cases so frontend users can load pre-configured stock and cutoff date setups.
  return NextResponse.json({ success: true, presets: PRESET_CASES });
}
