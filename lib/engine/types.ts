/**
 * Core Types for Profitforce Trading Engine
 */

export interface OHLCV {
  time: number | Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradingSignal {
  symbol: string;
  timestamp: Date;
  type: 'BUY' | 'SELL' | 'CLOSE_BUY' | 'CLOSE_SELL';
  price: number;
  confidence: number; // 0-100
  version: string; // 'v2.0' | 'v2.1'
  metadata?: Record<string, any>;
}

export interface TradeExecution {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  quantity: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  pnl?: number;
  createdAt: Date;
  closedAt?: Date;
}
