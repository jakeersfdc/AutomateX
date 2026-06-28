/**
 * REAL-TIME SIGNAL DASHBOARD API
 * Provides live BUY/SELL signals for multiple assets
 * Updates continuously with market-open optimized timing
 * 
 * Endpoint: /api/signals/market-open
 * Usage: Fetch every bar close or tick for live signals
 */

import { MarketOpenSignalEngine, AssetMetadata, RealTimeSignal, ContinuousUpdate } from '@/lib/strategy/MarketOpenSignals';
import { NextRequest, NextResponse } from 'next/server';

const signalEngine = new MarketOpenSignalEngine();

// Asset metadata database (would be in real DB)
const ASSET_DATABASE: Record<string, AssetMetadata> = {
  // NSE STOCKS
  'INFY': {
    symbol: 'INFY',
    assetClass: 'equity',
    segment: 'NSE',
    exchange: 'NSE',
    tradingHours: { open: '09:15', close: '15:30' },
    minLotSize: 1,
    avgVolume24h: 50000000
  },
  'RELIANCE': {
    symbol: 'RELIANCE',
    assetClass: 'equity',
    segment: 'NSE',
    exchange: 'NSE',
    tradingHours: { open: '09:15', close: '15:30' },
    minLotSize: 1,
    avgVolume24h: 40000000
  },
  'TCS': {
    symbol: 'TCS',
    assetClass: 'equity',
    segment: 'NSE',
    exchange: 'NSE',
    tradingHours: { open: '09:15', close: '15:30' },
    minLotSize: 1,
    avgVolume24h: 35000000
  },
  
  // CRYPTO
  'BTC': {
    symbol: 'BTC',
    assetClass: 'crypto',
    segment: 'CRYPTO',
    exchange: 'Binance',
    tradingHours: { open: '00:00', close: '23:59' },
    minLotSize: 0.001,
    avgVolume24h: 500000000
  },
  'ETH': {
    symbol: 'ETH',
    assetClass: 'crypto',
    segment: 'CRYPTO',
    exchange: 'Binance',
    tradingHours: { open: '00:00', close: '23:59' },
    minLotSize: 0.01,
    avgVolume24h: 300000000
  },
  
  // F&O
  'NIFTY-FUT': {
    symbol: 'NIFTY-FUT',
    assetClass: 'futures',
    segment: 'MCX',
    exchange: 'MCX',
    tradingHours: { open: '09:00', close: '23:30' },
    minLotSize: 1,
    avgVolume24h: 100000000
  },
  'BANKNIFTY-FUT': {
    symbol: 'BANKNIFTY-FUT',
    assetClass: 'futures',
    segment: 'MCX',
    exchange: 'MCX',
    tradingHours: { open: '09:00', close: '23:30' },
    minLotSize: 1,
    avgVolume24h: 80000000
  },
  
  // OPTIONS
  'NIFTY-CE': {
    symbol: 'NIFTY-CE',
    assetClass: 'options',
    segment: 'NSE',
    exchange: 'NSE',
    tradingHours: { open: '09:15', close: '15:30' },
    minLotSize: 1,
    avgVolume24h: 50000000
  },

  // FOREX PAIRS (24/5 trading)
  'EURUSD': {
    symbol: 'EURUSD',
    assetClass: 'forex',
    segment: 'FOREX',
    exchange: 'OANDA',
    tradingHours: { open: '17:00', close: '16:59' }, // New York close to close
    minLotSize: 0.01,
    avgVolume24h: 1200000000
  },
  'GBPUSD': {
    symbol: 'GBPUSD',
    assetClass: 'forex',
    segment: 'FOREX',
    exchange: 'OANDA',
    tradingHours: { open: '17:00', close: '16:59' },
    minLotSize: 0.01,
    avgVolume24h: 800000000
  },
  'USDJPY': {
    symbol: 'USDJPY',
    assetClass: 'forex',
    segment: 'FOREX',
    exchange: 'OANDA',
    tradingHours: { open: '17:00', close: '16:59' },
    minLotSize: 0.01,
    avgVolume24h: 900000000
  },
  'AUDUSD': {
    symbol: 'AUDUSD',
    assetClass: 'forex',
    segment: 'FOREX',
    exchange: 'OANDA',
    tradingHours: { open: '17:00', close: '16:59' },
    minLotSize: 0.01,
    avgVolume24h: 350000000
  },
  'NZDUSD': {
    symbol: 'NZDUSD',
    assetClass: 'forex',
    segment: 'FOREX',
    exchange: 'OANDA',
    tradingHours: { open: '17:00', close: '16:59' },
    minLotSize: 0.01,
    avgVolume24h: 200000000
  },
  'USDCHF': {
    symbol: 'USDCHF',
    assetClass: 'forex',
    segment: 'FOREX',
    exchange: 'OANDA',
    tradingHours: { open: '17:00', close: '16:59' },
    minLotSize: 0.01,
    avgVolume24h: 400000000
  },
  'EURCAD': {
    symbol: 'EURCAD',
    assetClass: 'forex',
    segment: 'FOREX',
    exchange: 'OANDA',
    tradingHours: { open: '17:00', close: '16:59' },
    minLotSize: 0.01,
    avgVolume24h: 150000000
  },
  'EURGBP': {
    symbol: 'EURGBP',
    assetClass: 'forex',
    segment: 'FOREX',
    exchange: 'OANDA',
    tradingHours: { open: '17:00', close: '16:59' },
    minLotSize: 0.01,
    avgVolume24h: 250000000
  }
};

/**
 * POST /api/signals/market-open
 * Generate live buy/sell signals
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols, currentBars, historicalBars } = body;

    if (!symbols || !currentBars) {
      return NextResponse.json(
        { error: 'Missing symbols or currentBars' },
        { status: 400 }
      );
    }

    const signals: Record<string, RealTimeSignal | null> = {};
    const updates: Record<string, ContinuousUpdate> = {};

    // Generate signal for each symbol
    for (const symbol of symbols) {
      const metadata = ASSET_DATABASE[symbol];
      if (!metadata) continue;

      const currentBar = currentBars[symbol];
      const historicalBar = historicalBars?.[symbol] || [];

      // Generate signal
      const signal = signalEngine.generateSignal(
        symbol,
        currentBar,
        historicalBar,
        metadata
      );

      signals[symbol] = signal;

      // Generate continuous update
      const update = signalEngine.continuousUpdate(
        symbol,
        currentBar.close,
        currentBar,
        historicalBar
      );

      updates[symbol] = update;
    }

    // Return all signals + updates
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      signals,
      updates,
      summary: {
        totalSymbols: symbols.length,
        activeSignals: Object.values(signals).filter(s => s !== null).length,
        buySignals: Object.values(signals).filter(s => s?.action === 'BUY').length,
        sellSignals: Object.values(signals).filter(s => s?.action === 'SELL').length,
        holdSignals: Object.values(signals).filter(s => s?.action === 'HOLD').length
      }
    });
  } catch (error) {
    console.error('Signal generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate signals' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/signals/market-open?symbols=INFY,BTC,NIFTY-FUT
 * Stream live signals (Server-Sent Events)
 */
export async function GET(request: NextRequest) {
  const symbols = request.nextUrl.searchParams.get('symbols')?.split(',') || [];

  if (symbols.length === 0) {
    return NextResponse.json(
      { error: 'Provide symbols parameter' },
      { status: 400 }
    );
  }

  // Create server-sent events stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial connection message
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'CONNECTED',
              message: `Streaming signals for: ${symbols.join(', ')}`,
              timestamp: new Date().toISOString()
            })}\n\n`
          )
        );

        // Simulate live updates every 5 seconds
        // In production, this would connect to real market data
        let updateCount = 0;
        const maxUpdates = 120; // 10 minutes of updates

        while (updateCount < maxUpdates) {
          await new Promise(resolve => setTimeout(resolve, 5000)); // 5 sec interval

          // Generate mock current bars (would be real data in production)
          const currentBars: Record<string, any> = {};
          const historicalBars: Record<string, any> = {};

          for (const symbol of symbols) {
            // Mock data - replace with real market data
            currentBars[symbol] = {
              open: 100 + Math.random() * 10,
              high: 105 + Math.random() * 10,
              low: 95 + Math.random() * 10,
              close: 100 + Math.random() * 10,
              volume: 1000000 + Math.random() * 5000000
            };

            historicalBars[symbol] = Array(100)
              .fill(null)
              .map(() => ({
                open: 100 + Math.random() * 10,
                high: 105 + Math.random() * 10,
                low: 95 + Math.random() * 10,
                close: 100 + Math.random() * 10,
                volume: 1000000 + Math.random() * 5000000
              }));
          }

          // Generate signals
          const signals: Record<string, RealTimeSignal | null> = {};
          for (const symbol of symbols) {
            const metadata = ASSET_DATABASE[symbol];
            if (!metadata) continue;

            const signal = signalEngine.generateSignal(
              symbol,
              currentBars[symbol],
              historicalBars[symbol],
              metadata
            );
            signals[symbol] = signal;
          }

          // Send update
          const activeSignals = Object.values(signals).filter(s => s !== null);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'UPDATE',
                timestamp: new Date().toISOString(),
                signals,
                summary: {
                  activeSignals: activeSignals.length,
                  buySignals: activeSignals.filter(s => s.action === 'BUY').length,
                  sellSignals: activeSignals.filter(s => s.action === 'SELL').length
                }
              })}\n\n`
            )
          );

          updateCount++;
        }

        // Send final message
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'CLOSED',
              message: 'Stream ended'
            })}\n\n`
          )
        );

        controller.close();
      } catch (error) {
        console.error('Stream error:', error);
        controller.close();
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}

/**
 * GET /api/signals/market-open/assets
 * List all available assets for signaling
 */
export async function getAvailableAssets() {
  return Object.entries(ASSET_DATABASE).map(([key, metadata]) => ({
    ...metadata
  }));
}

/**
 * Example usage in frontend:
 * 
 * const symbols = ['INFY', 'BTC', 'NIFTY-FUT'];
 * 
 * // Option 1: One-time fetch
 * const response = await fetch('/api/signals/market-open', {
 *   method: 'POST',
 *   body: JSON.stringify({
 *     symbols,
 *     currentBars: {
 *       'INFY': { open: 1900, high: 1910, low: 1890, close: 1905, volume: 5000000 },
 *       'BTC': { open: 45000, high: 45500, low: 44500, close: 45200, volume: 50000 },
 *       'NIFTY-FUT': { open: 22000, high: 22100, low: 21900, close: 22050, volume: 100000 }
 *     },
 *     historicalBars: { ...100 bars for each symbol }
 *   })
 * });
 * const data = await response.json();
 * console.log(data.signals);
 * 
 * // Option 2: Live streaming
 * const eventSource = new EventSource(
 *   `/api/signals/market-open?symbols=${symbols.join(',')}`
 * );
 * 
 * eventSource.onmessage = (event) => {
 *   const data = JSON.parse(event.data);
 *   if (data.type === 'UPDATE') {
 *     console.log('Live signals:', data.signals);
 *     console.log('Summary:', data.summary);
 *   }
 * };
 */
