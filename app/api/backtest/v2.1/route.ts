/**
 * API Route: /api/backtest/v2.1
 * Backtest v2.1 indicator system
 */

import { NextRequest, NextResponse } from 'next/server';
import { BacktestEngine } from '@/lib/engine/backtest_engine';
import { fetchMarketDataCached } from '@/lib/engine/market_data_service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      symbol = 'NSE:NIFTY',
      startDate,
      endDate,
      initialCapital = 100000,
      riskPerTrade = 0.02,
      slippagePercent = 0.05,
      commissionPercent = 0.05,
    } = body;

    // Fetch historical data
    const historicalData = await fetchMarketDataCached({
      source: 'mock',
      symbol,
      interval: '5m',
      lookback: 500,
    });

    if (historicalData.length === 0) {
      return NextResponse.json(
        { error: 'No historical data available' },
        { status: 400 }
      );
    }

    // Run backtest
    const engine = new BacktestEngine({
      symbol,
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate) : new Date(),
      initialCapital,
      riskPerTrade,
      slippagePercent,
      commissionPercent,
    });

    const result = await engine.runBacktest(historicalData);

    return NextResponse.json(
      {
        success: true,
        backtest: result,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('V2.1 Backtest error:', error);
    return NextResponse.json(
      { error: error.message || 'Backtest failed' },
      { status: 500 }
    );
  }
}
