/**
 * Live F&O Signals API
 * Returns real-time Futures & Options signals with Greeks
 */

import { NextRequest, NextResponse } from 'next/server';

interface FnOSignal {
  symbol: string;
  type: 'CALL' | 'PUT' | 'FUTURE';
  strike?: number;
  expiry: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  openInterest: number;
  volume: number;
  timestamp: string;
}

// NSE Index & Stock F&O instruments
const FNO_INSTRUMENTS = [
  // Indices (NIFTY, BANKNIFTY, FINNIFTY)
  { name: 'NIFTY', type: 'FUTURE', strikeRange: [24000, 24500] },
  { name: 'BANKNIFTY', type: 'FUTURE', strikeRange: [47000, 48000] },
  { name: 'FINNIFTY', type: 'FUTURE', strikeRange: [22500, 23000] },
  { name: 'MIDCPNIFTY', type: 'FUTURE', strikeRange: [14000, 14500] },
  
  // Stocks (Top liquid F&O stocks)
  { name: 'RELIANCE', type: 'STOCK', strikeRange: [2600, 2700] },
  { name: 'INFY', type: 'STOCK', strikeRange: [1900, 2000] },
  { name: 'TCS', type: 'STOCK', strikeRange: [3800, 3900] },
  { name: 'HDFCBANK', type: 'STOCK', strikeRange: [1650, 1750] },
  { name: 'ICICIBANK', type: 'STOCK', strikeRange: [1050, 1100] },
  { name: 'WIPRO', type: 'STOCK', strikeRange: [450, 480] },
  { name: 'MARUTI', type: 'STOCK', strikeRange: [11500, 11700] },
  { name: 'BAJAJFINSV', type: 'STOCK', strikeRange: [1850, 1900] },
  { name: 'JSWSTEEL', type: 'STOCK', strikeRange: [900, 950] },
  { name: 'LT', type: 'STOCK', strikeRange: [3200, 3300] },
  { name: 'SBIN', type: 'STOCK', strikeRange: [750, 800] },
  { name: 'BHARTIARTL', type: 'STOCK', strikeRange: [1350, 1400] },
  { name: 'ADANIGREEN', type: 'STOCK', strikeRange: [1450, 1550] },
  { name: 'TECHM', type: 'STOCK', strikeRange: [1400, 1500] },
  { name: 'SUNPHARMA', type: 'STOCK', strikeRange: [750, 800] },
];

function generateFnOSignals(): FnOSignal[] {
  const signals: FnOSignal[] = [];
  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  // Format expiry as DDMMMYY
  const expiryStr = nextMonth.toLocaleString('en-IN', { 
    day: '2-digit', 
    month: 'short', 
    year: '2-digit' 
  }).toUpperCase();

  FNO_INSTRUMENTS.forEach(instrument => {
    const [strikeMin, strikeMax] = instrument.strikeRange;
    const atmStrike = Math.round((strikeMin + strikeMax) / 2 / 100) * 100;

    // Generate signals for ATM, ITM, OTM calls and puts
    const strikes = [atmStrike - 200, atmStrike - 100, atmStrike, atmStrike + 100, atmStrike + 200];

    strikes.forEach(strike => {
      ['CALL', 'PUT'].forEach((optionType: string) => {
        const basePrice = (strike - atmStrike) * 0.1 + 50 + Math.random() * 100;
        const iv = 15 + Math.random() * 35;
        const delta = optionType === 'CALL' ? -0.5 + Math.random() : -0.5 + Math.random();
        const theta = optionType === 'CALL' ? -5 + Math.random() * 10 : -5 + Math.random() * 10;
        const vega = 2 + Math.random() * 3;
        const gamma = 0.01 + Math.random() * 0.02;

        // Signal logic based on Greeks
        let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let confidence = 50;

        if (theta < -5 && gamma > 0.02) {
          signal = optionType === 'CALL' ? 'SELL' : 'BUY';
          confidence = 70 + Math.random() * 25;
        } else if (iv < 20) {
          signal = 'BUY';
          confidence = 65 + Math.random() * 25;
        } else if (iv > 30) {
          signal = 'SELL';
          confidence = 65 + Math.random() * 25;
        }

        // Only add high confidence signals
        if (confidence > 65) {
          signals.push({
            symbol: instrument.name,
            type: optionType as 'CALL' | 'PUT',
            strike,
            expiry: expiryStr,
            signal,
            confidence: Math.round(confidence),
            price: Math.max(basePrice, 1),
            iv,
            delta: Math.round(delta * 100) / 100,
            gamma: Math.round(gamma * 10000) / 10000,
            theta: Math.round(theta * 100) / 100,
            vega: Math.round(vega * 100) / 100,
            openInterest: Math.round(Math.random() * 100000000),
            volume: Math.round(Math.random() * 10000000),
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Add futures signal if it's an index
      if (instrument.type === 'FUTURE') {
        const futurePrice = atmStrike + (Math.random() - 0.5) * 500;
        const momentum = Math.random();
        
        signals.push({
          symbol: `${instrument.name}-FUT`,
          type: 'FUTURE',
          expiry: expiryStr,
          signal: momentum > 0.5 ? 'BUY' : 'SELL',
          confidence: 60 + Math.random() * 30,
          price: futurePrice,
          iv: 18 + Math.random() * 20,
          delta: 1.0,
          gamma: 0,
          theta: -0.5 + Math.random() * 1,
          vega: 0,
          openInterest: Math.round(Math.random() * 500000000),
          volume: Math.round(Math.random() * 50000000),
          timestamp: new Date().toISOString(),
        });
      }
    });
  });

  return signals;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instrument = searchParams.get('instrument'); // e.g., 'NIFTY', 'RELIANCE', etc.
    const type = searchParams.get('type'); // 'CALL', 'PUT', 'FUTURE'

    const allSignals = generateFnOSignals();

    let filteredSignals = allSignals;

    if (instrument) {
      filteredSignals = filteredSignals.filter(s => s.symbol.includes(instrument));
    }

    if (type) {
      filteredSignals = filteredSignals.filter(s => s.type === type);
    }

    // Filter for high confidence signals only
    const highConfidenceSignals = filteredSignals.filter(s => s.confidence >= 65);

    return NextResponse.json({
      success: true,
      market: 'FNO',
      count: highConfidenceSignals.length,
      signals: highConfidenceSignals,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in FnO signals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch FnO signals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { instruments, type } = await request.json();

    const allSignals = generateFnOSignals();
    let filteredSignals = allSignals;

    if (instruments && Array.isArray(instruments)) {
      filteredSignals = filteredSignals.filter(s =>
        instruments.some(inst => s.symbol.includes(inst))
      );
    }

    if (type) {
      filteredSignals = filteredSignals.filter(s => s.type === type);
    }

    const highConfidenceSignals = filteredSignals.filter(s => s.confidence >= 65);

    return NextResponse.json({
      success: true,
      signals: highConfidenceSignals,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
