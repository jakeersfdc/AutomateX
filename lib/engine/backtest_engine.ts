/**
 * Backtesting Engine for v2.1 Strategy
 * Tests strategy against historical market data
 */

import { V2_1SignalEngine } from './v2_1_signal_engine';
import { OHLCV } from './types';

export interface BacktestConfig {
  symbol: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  riskPerTrade: number; // 0-1 (e.g., 0.02 = 2%)
  slippagePercent: number; // e.g., 0.05 = 0.05%
  commissionPercent: number; // e.g., 0.05 = 0.05%
}

export interface BacktestResult {
  symbol: string;
  period: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  totalReturn: number;
  totalReturnPercent: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortino: number;
  trades: BacktestTrade[];
  equityCurve: EquityPoint[];
}

export interface BacktestTrade {
  entryTime: Date;
  entryPrice: number;
  exitTime: Date;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  signal: 'BUY' | 'SELL';
}

export interface EquityPoint {
  timestamp: Date;
  equity: number;
  drawdown: number;
}

export class BacktestEngine {
  private engine: V2_1SignalEngine;
  private config: BacktestConfig;

  constructor(config: BacktestConfig) {
    this.engine = new V2_1SignalEngine();
    this.config = config;
  }

  /**
   * Run backtest on historical data
   */
  async runBacktest(historicalData: OHLCV[]): Promise<BacktestResult> {
    const trades: BacktestTrade[] = [];
    const equityCurve: EquityPoint[] = [];

    let equity = this.config.initialCapital;
    let maxEquity = equity;
    let activePosition: {
      entryPrice: number;
      entryTime: Date;
      quantity: number;
      signal: 'BUY' | 'SELL';
    } | null = null;

    // Process each candle
    for (let i = 0; i < historicalData.length; i++) {
      const candles = historicalData.slice(0, i + 1);
      const signal = this.engine.generateSignal(candles);

      const currentPrice = candles[i].close;

      // Check for exit signal
      if (activePosition) {
        if (
          (activePosition.signal === 'BUY' && signal.signalStatus === 'SELL') ||
          (activePosition.signal === 'SELL' && signal.signalStatus === 'BUY')
        ) {
          // Close trade
          const exitPrice = currentPrice * (1 - this.config.slippagePercent / 100);
          const pnl = this.calculatePnL(
            activePosition.signal,
            activePosition.entryPrice,
            exitPrice,
            activePosition.quantity
          );

          trades.push({
            entryTime: activePosition.entryTime,
            entryPrice: activePosition.entryPrice,
            exitTime: new Date(candles[i].time),
            exitPrice,
            quantity: activePosition.quantity,
            pnl,
            pnlPercent: (pnl / activePosition.entryPrice) * 100,
            signal: activePosition.signal,
          });

          equity += pnl;
          activePosition = null;
        }
      }

      // Check for entry signal
      if (!activePosition && (signal.signalStatus === 'BUY' || signal.signalStatus === 'SELL')) {
        const entryPrice = currentPrice * (1 + this.config.slippagePercent / 100);
        const riskAmount = equity * this.config.riskPerTrade;
        const quantity = Math.floor(riskAmount / entryPrice);

        if (quantity > 0) {
          activePosition = {
            entryPrice,
            entryTime: new Date(candles[i].time),
            quantity,
            signal: signal.signalStatus as 'BUY' | 'SELL',
          };
        }
      }

      // Track equity
      if (activePosition) {
        const unrealizedPnL = this.calculatePnL(
          activePosition.signal,
          activePosition.entryPrice,
          currentPrice,
          activePosition.quantity
        );
        equityCurve.push({
          timestamp: new Date(candles[i].time),
          equity: equity + unrealizedPnL,
          drawdown: ((equity + unrealizedPnL - maxEquity) / maxEquity) * 100,
        });
      } else {
        equityCurve.push({
          timestamp: new Date(candles[i].time),
          equity,
          drawdown: ((equity - maxEquity) / maxEquity) * 100,
        });
      }

      maxEquity = Math.max(maxEquity, equity);
    }

    // Calculate statistics
    return this.calculateStats(trades, equityCurve);
  }

  /**
   * Calculate trade P&L
   */
  private calculatePnL(
    signal: 'BUY' | 'SELL',
    entryPrice: number,
    exitPrice: number,
    quantity: number
  ): number {
    if (signal === 'BUY') {
      return (exitPrice - entryPrice) * quantity;
    } else {
      return (entryPrice - exitPrice) * quantity;
    }
  }

  /**
   * Calculate backtest statistics
   */
  private calculateStats(trades: BacktestTrade[], equityCurve: EquityPoint[]): BacktestResult {
    const winningTrades = trades.filter((t) => t.pnl > 0);
    const losingTrades = trades.filter((t) => t.pnl < 0);

    const totalReturn = equityCurve[equityCurve.length - 1].equity - this.config.initialCapital;
    const totalReturnPercent = (totalReturn / this.config.initialCapital) * 100;

    const avgWin = winningTrades.length > 0 ? winningTrades.reduce((s, t) => s + t.pnl, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((s, t) => s + t.pnl, 0) / losingTrades.length) : 0;

    const returns = equityCurve.map((p) => (p.equity - this.config.initialCapital) / this.config.initialCapital);
    const sharpeRatio = this.calculateSharpeRatio(returns);
    const sortino = this.calculateSortino(returns);

    const maxDrawdown = Math.min(...equityCurve.map((p) => p.drawdown));

    return {
      symbol: this.config.symbol,
      period: `${this.config.startDate.toDateString()} - ${this.config.endDate.toDateString()}`,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
      avgWin,
      avgLoss,
      profitFactor: avgLoss > 0 ? avgWin / avgLoss : Infinity,
      totalReturn,
      totalReturnPercent,
      maxDrawdown,
      sharpeRatio,
      sortino,
      trades,
      equityCurve,
    };
  }

  /**
   * Calculate Sharpe Ratio
   */
  private calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.02): number {
    const mean = returns.reduce((a, b) => a + b) / returns.length;
    const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    return (mean - riskFreeRate) / stdDev;
  }

  /**
   * Calculate Sortino Ratio
   */
  private calculateSortino(returns: number[], riskFreeRate: number = 0.02): number {
    const mean = returns.reduce((a, b) => a + b) / returns.length;
    const downside = returns
      .filter((r) => r < riskFreeRate)
      .reduce((s, r) => s + Math.pow(r - riskFreeRate, 2), 0) / returns.length;

    const downstdDev = Math.sqrt(downside);

    return (mean - riskFreeRate) / downstdDev;
  }
}
