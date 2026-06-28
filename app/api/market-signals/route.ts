/**
 * Multi-Market Signal API Endpoint
 * Supports: Crypto, Forex, Equities, Commodities, Derivatives
 */

import { NextRequest, NextResponse } from 'next/server';
import { SASSignal } from '@/lib/engine/types';

// Mock signal generator for different markets
function generateMockSignals(market: string, count: number = 5): any[] {
  const signals: any[] = [];
  
  const marketConfigs: Record<string, any> = {
    CRYPTO: {
      symbols: ['BTC', 'ETH', 'XRP', 'SOL', 'ADA', 'DOGE', 'LINK', 'AVAX'],
      priceRanges: { BTC: [40000, 80000], ETH: [2000, 5000], XRP: [1, 3], SOL: [100, 250] },
    },
    EQUITY: {
      symbols: ['RELIANCE', 'INFY', 'TCS', 'HDFCBANK', 'ICICIBANK', 'WIPRO', 'LT'],
      priceRanges: { RELIANCE: [2000, 2500], INFY: [1500, 2500], TCS: [3000, 3500] },
    },
    FOREX: {
      symbols: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'EURGBP', 'USDINR'],
      priceRanges: { EURUSD: [1.08, 1.15], GBPUSD: [1.25, 1.35], USDJPY: [130, 145] },
    },
    COMMODITY: {
      symbols: ['GOLD', 'SILVER', 'CRUDE', 'NATGAS'],
      priceRanges: { GOLD: [1800, 2100], SILVER: [20, 30], CRUDE: [70, 90] },
    },
  };

  const config = marketConfigs[market] || marketConfigs.EQUITY;
  const selectedSymbols = config.symbols.slice(0, count);

  selectedSymbols.forEach((symbol: string) => {
    const priceRange = config.priceRanges[symbol] || [100, 500];
    const basePrice = (priceRange[0] + priceRange[1]) / 2;
    const currentPrice = basePrice * (0.98 + Math.random() * 0.04);
    const confidence = 65 + Math.random() * 30;
    const action = confidence > 80 ? 'BUY' : confidence < 50 ? 'SELL' : confidence > 70 ? 'BUY' : 'HOLD';

    signals.push({
      symbol,
      assetClass: market,
      action,
      confidence: Math.round(confidence),
      price: currentPrice,
      entryPrice: currentPrice * 0.98,
      stopLoss: currentPrice * 0.95,
      target1: currentPrice * 1.02,
      target2: currentPrice * 1.05,
      target3: currentPrice * 1.08,
      riskRewardRatio: (currentPrice * 1.05 - currentPrice) / (currentPrice - currentPrice * 0.95),
      timestamp: new Date().toISOString(),
      reasoning: [
        `Technical breakout above key resistance`,
        `High volume confirmation`,
        `Strong momentum indicators`,
      ],
    });
  });

  return signals;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const market = searchParams.get('market') || 'CRYPTO';
    const count = parseInt(searchParams.get('count') || '5');

    // Generate signals for the requested market
    const signals = generateMockSignals(market, count);

    return NextResponse.json({
      success: true,
      market,
      signals,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching market signals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch market signals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { market, symbols } = body;

    if (!market) {
      return NextResponse.json(
        { success: false, error: 'Market parameter required' },
        { status: 400 }
      );
    }

    // Generate signals for specific symbols
    const allSignals = generateMockSignals(market, 10);
    const filtered = symbols
      ? allSignals.filter((s) => symbols.includes(s.symbol))
      : allSignals;

    return NextResponse.json({
      success: true,
      market,
      signals: filtered,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error processing market signals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process market signals' },
      { status: 500 }
    );
  }
}
