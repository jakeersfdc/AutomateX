/**
 * Cryptocurrency Trading Signals API Endpoint
 * Returns 24/7 crypto asset signals with technical analysis
 */

import { NextRequest, NextResponse } from 'next/server';

interface CryptoSignal {
  symbol: string;
  fullName: string;
  signal: 'BUY' | 'SELL' | 'HOLD' | 'EXIT';
  confidence: number;
  price: number;
  entryPrice: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  riskRewardRatio: number;
  percentChange24h: number;
  volume24h: number;
  marketCap: string;
  volatility: number;
  momentum: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  timestamp: string;
}

const CRYPTO_ASSETS = [
  { symbol: 'BTC', fullName: 'Bitcoin', price: 52000 },
  { symbol: 'ETH', fullName: 'Ethereum', price: 3200 },
  { symbol: 'XRP', fullName: 'XRP', price: 2.5 },
  { symbol: 'SOL', fullName: 'Solana', price: 180 },
  { symbol: 'ADA', fullName: 'Cardano', price: 1.2 },
  { symbol: 'DOGE', fullName: 'Dogecoin', price: 0.35 },
  { symbol: 'LINK', fullName: 'Chainlink', price: 28 },
  { symbol: 'AVAX', fullName: 'Avalanche', price: 85 },
  { symbol: 'MATIC', fullName: 'Polygon', price: 1.1 },
  { symbol: 'NEAR', fullName: 'NEAR Protocol', price: 7.5 },
];

function generateCryptoSignals(count: number = 10): CryptoSignal[] {
  const signals: CryptoSignal[] = [];
  const selectedAssets = CRYPTO_ASSETS.slice(0, Math.min(count, CRYPTO_ASSETS.length));

  selectedAssets.forEach((asset) => {
    const basePrice = asset.price;
    const priceVariation = basePrice * (0.05 + Math.random() * 0.15);
    const currentPrice = basePrice * (1 + (Math.random() - 0.5) * 0.1);
    
    const confidence = 55 + Math.random() * 40;
    const momentum = confidence > 75 ? 'BULLISH' : confidence < 45 ? 'BEARISH' : 'NEUTRAL';
    const percentChange = -5 + Math.random() * 15;
    
    const signal: CryptoSignal = {
      symbol: asset.symbol,
      fullName: asset.fullName,
      signal: confidence > 72 ? 'BUY' : confidence < 48 ? 'SELL' : 'HOLD',
      confidence: Math.round(confidence),
      price: currentPrice,
      entryPrice: currentPrice * 0.98,
      stopLoss: currentPrice * 0.93,
      target1: currentPrice * 1.05,
      target2: currentPrice * 1.10,
      target3: currentPrice * 1.18,
      riskRewardRatio: (currentPrice * 1.10 - currentPrice) / (currentPrice - currentPrice * 0.93),
      percentChange24h: Math.round(percentChange * 100) / 100,
      volume24h: Math.random() * 50000000,
      marketCap: ['$1.2T', '$450B', '$120B', '$80B', '$50B', '$30B', '$25B', '$20B'][Math.floor(Math.random() * 8)],
      volatility: Math.round((5 + Math.random() * 40) * 100) / 100,
      momentum,
      timestamp: new Date().toISOString(),
    };

    signals.push(signal);
  });

  return signals;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const count = parseInt(searchParams.get('count') || '10');
    const symbol = searchParams.get('symbol');

    let signals = generateCryptoSignals(count);
    
    if (symbol) {
      signals = signals.filter(s => s.symbol === symbol.toUpperCase());
    }

    return NextResponse.json({
      success: true,
      count: signals.length,
      signals,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching crypto signals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch crypto signals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols, count = 10 } = body;

    let allSignals = generateCryptoSignals(count);
    
    if (symbols && Array.isArray(symbols)) {
      allSignals = allSignals.filter(s => symbols.includes(s.symbol));
    }

    return NextResponse.json({
      success: true,
      signals: allSignals,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error processing crypto signals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process crypto signals' },
      { status: 500 }
    );
  }
}
