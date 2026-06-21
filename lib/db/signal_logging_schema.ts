/**
 * Signal History & Logging - Database Schema
 * Tracks all generated signals and their outcomes
 */

export interface SignalLog {
  id: string;
  symbol: string;
  timestamp: Date;
  signalType: 'BUY' | 'SELL' | 'NO_TRADE';
  entryPrice: number;
  bullScore: number;
  bearScore: number;
  confidence: number;
  indicators: {
    ichimoku: string;
    stochRSI: string;
    roc: string;
    rsi: number;
    macd: string;
    volume: string;
    vix: string;
  };
  exitPrice?: number;
  exitTime?: Date;
  pnl?: number;
  pnlPercent?: number;
  status: 'ACTIVE' | 'CLOSED' | 'SL_HIT' | 'TP_HIT' | 'CANCELLED';
  trades: TradeLog[];
}

export interface TradeLog {
  id: string;
  signalId: string;
  entryTime: Date;
  entryPrice: number;
  quantity: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  exitTime?: Date;
  exitPrice?: number;
  exitReason?: string;
  pnl?: number;
  status: 'OPEN' | 'CLOSED';
}

export interface StrategyStats {
  totalSignals: number;
  buySignals: number;
  sellSignals: number;
  noTradeSignals: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  totalPnL: number;
  totalTrades: number;
  maxDrawdown: number;
  successTrades: number;
  failedTrades: number;
  period: string; // "today" | "week" | "month" | "all"
}

/**
 * Migration: Create signal_logs table
 */
export const CREATE_SIGNAL_LOGS_TABLE = `
CREATE TABLE IF NOT EXISTS signal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  signal_type VARCHAR(20) NOT NULL,
  entry_price DECIMAL(10, 2),
  bull_score INT,
  bear_score INT,
  confidence DECIMAL(5, 2),
  indicators JSONB,
  exit_price DECIMAL(10, 2),
  exit_time TIMESTAMP,
  pnl DECIMAL(10, 2),
  pnl_percent DECIMAL(5, 2),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_symbol (symbol),
  INDEX idx_timestamp (timestamp),
  INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS trade_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID REFERENCES signal_logs(id) ON DELETE CASCADE,
  entry_time TIMESTAMP NOT NULL,
  entry_price DECIMAL(10, 2) NOT NULL,
  quantity INT NOT NULL,
  stop_loss DECIMAL(10, 2),
  target1 DECIMAL(10, 2),
  target2 DECIMAL(10, 2),
  target3 DECIMAL(10, 2),
  exit_time TIMESTAMP,
  exit_price DECIMAL(10, 2),
  exit_reason VARCHAR(50),
  pnl DECIMAL(10, 2),
  status VARCHAR(20) DEFAULT 'OPEN',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_signal_id (signal_id),
  INDEX idx_status (status)
);
`;
