/**
 * API Route: /api/execute/trade
 * Execute trades from signals with broker integration
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock execution engine (replace with real TradeExecutor in production)
const executedTrades: any[] = [];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      broker = 'ZERODHA',
      symbol = 'NSE:NIFTY',
      signal = 'BUY',
      entryPrice = 19500,
      stopLoss = 19400,
      targets = { t1: 19600, t2: 19700, t3: 19800 },
      quantity = 1,
    } = body;

    // Validate inputs
    if (!symbol || !signal || !entryPrice) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create trade execution
    const trade = {
      id: `EXEC-${Date.now()}`,
      broker,
      symbol,
      signal,
      entryPrice,
      stopLoss,
      targets,
      quantity,
      status: 'EXECUTED',
      timestamp: new Date(),
      orderId: `ORD-${Math.random().toString(36).substr(2, 9)}`,
    };

    executedTrades.push(trade);

    return NextResponse.json(
      {
        success: true,
        trade,
        message: `Trade executed: ${signal} ${quantity} ${symbol} @ ₹${entryPrice}`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Trade execution failed' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'list';

    if (action === 'list') {
      return NextResponse.json(
        {
          success: true,
          trades: executedTrades,
          count: executedTrades.length,
        },
        { status: 200 }
      );
    }

    if (action === 'stats') {
      const closed = executedTrades.filter((t) => t.status === 'CLOSED');
      const wins = closed.filter((t) => (t.pnl || 0) > 0).length;

      return NextResponse.json(
        {
          success: true,
          stats: {
            totalExecuted: executedTrades.length,
            winRate: closed.length > 0 ? (wins / closed.length) * 100 : 0,
            totalTrades: closed.length,
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
