/**
 * Paper Trading System
 * Simulates live trading without real money
 */

export interface PaperTrade {
  id: string;
  signalId: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  quantity: number;
  entryTime: Date;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  status: 'OPEN' | 'CLOSED' | 'SL_HIT' | 'TP_HIT';
  exitPrice?: number;
  exitTime?: Date;
  exitReason?: string;
  pnl?: number;
  pnlPercent?: number;
  currentPrice?: number;
  unrealizedPnL?: number;
}

export interface PaperPortfolio {
  cash: number;
  positions: PaperTrade[];
  totalEquity: number;
  totalPnL: number;
  totalPnLPercent: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  openTrades: number;
}

export class PaperTradingSystem {
  private portfolio: PaperPortfolio = {
    cash: 100000,
    positions: [],
    totalEquity: 100000,
    totalPnL: 0,
    totalPnLPercent: 0,
    maxDrawdown: 0,
    winRate: 0,
    totalTrades: 0,
    openTrades: 0,
  };

  private maxEquity: number = 100000;

  /**
   * Execute paper trade
   */
  executeTrade(
    signalId: string,
    symbol: string,
    side: 'LONG' | 'SHORT',
    entryPrice: number,
    quantity: number,
    stopLoss: number,
    targets: { t1: number; t2: number; t3: number }
  ): PaperTrade {
    const trade: PaperTrade = {
      id: `PAPER-${Date.now()}`,
      signalId,
      symbol,
      side,
      entryPrice,
      quantity,
      entryTime: new Date(),
      stopLoss,
      target1: targets.t1,
      target2: targets.t2,
      target3: targets.t3,
      status: 'OPEN',
    };

    // Deduct from cash
    this.portfolio.cash -= entryPrice * quantity;
    this.portfolio.positions.push(trade);
    this.portfolio.openTrades++;

    return trade;
  }

  /**
   * Update position with current price
   */
  updatePosition(tradeId: string, currentPrice: number): void {
    const trade = this.portfolio.positions.find((p) => p.id === tradeId);
    if (!trade) return;

    trade.currentPrice = currentPrice;

    // Calculate unrealized P&L
    if (trade.side === 'LONG') {
      trade.unrealizedPnL = (currentPrice - trade.entryPrice) * trade.quantity;
    } else {
      trade.unrealizedPnL = (trade.entryPrice - currentPrice) * trade.quantity;
    }

    // Check for SL hit
    if (
      (trade.side === 'LONG' && currentPrice <= trade.stopLoss) ||
      (trade.side === 'SHORT' && currentPrice >= trade.stopLoss)
    ) {
      this.closeTrade(tradeId, trade.stopLoss, 'SL_HIT');
    }

    // Check for TP hit
    if (
      (trade.side === 'LONG' && currentPrice >= trade.target3) ||
      (trade.side === 'SHORT' && currentPrice <= trade.target3)
    ) {
      this.closeTrade(tradeId, trade.target3, 'TP_HIT');
    }
  }

  /**
   * Close paper trade
   */
  closeTrade(tradeId: string, exitPrice: number, reason: string): PaperTrade | null {
    const tradeIndex = this.portfolio.positions.findIndex((p) => p.id === tradeId);
    if (tradeIndex === -1) return null;

    const trade = this.portfolio.positions[tradeIndex];
    trade.exitPrice = exitPrice;
    trade.exitTime = new Date();
    trade.exitReason = reason;
    trade.status =
      reason === 'SL_HIT' ? 'SL_HIT' : reason === 'TP_HIT' ? 'TP_HIT' : 'CLOSED';

    // Calculate P&L
    if (trade.side === 'LONG') {
      trade.pnl = (exitPrice - trade.entryPrice) * trade.quantity;
    } else {
      trade.pnl = (trade.entryPrice - exitPrice) * trade.quantity;
    }

    trade.pnlPercent = (trade.pnl / (trade.entryPrice * trade.quantity)) * 100;

    // Return cash
    this.portfolio.cash += exitPrice * trade.quantity;

    // Update portfolio stats
    this.portfolio.totalPnL += trade.pnl;
    this.portfolio.totalTrades++;
    this.portfolio.openTrades--;
    this.updatePortfolioMetrics();

    return trade;
  }

  /**
   * Get current portfolio
   */
  getPortfolio(): PaperPortfolio {
    const unrealizedPnL = this.portfolio.positions
      .filter((p) => p.status === 'OPEN')
      .reduce((sum, p) => sum + (p.unrealizedPnL || 0), 0);

    return {
      ...this.portfolio,
      totalEquity: this.portfolio.cash + unrealizedPnL + this.portfolio.totalPnL,
      totalPnLPercent:
        (this.portfolio.totalPnL / 100000) * 100,
    };
  }

  /**
   * Get trade history
   */
  getTradeHistory(limit: number = 50): PaperTrade[] {
    return this.portfolio.positions
      .filter((p) => p.status !== 'OPEN')
      .slice(-limit);
  }

  /**
   * Get open positions
   */
  getOpenPositions(): PaperTrade[] {
    return this.portfolio.positions.filter((p) => p.status === 'OPEN');
  }

  /**
   * Update portfolio metrics
   */
  private updatePortfolioMetrics(): void {
    const closedTrades = this.portfolio.positions.filter((p) => p.status !== 'OPEN');
    const winningTrades = closedTrades.filter((p) => (p.pnl || 0) > 0);

    this.portfolio.winRate =
      closedTrades.length > 0
        ? (winningTrades.length / closedTrades.length) * 100
        : 0;

    const currentEquity = this.getPortfolio().totalEquity;
    this.portfolio.totalEquity = currentEquity;

    if (currentEquity > this.maxEquity) {
      this.maxEquity = currentEquity;
    }

    this.portfolio.maxDrawdown =
      ((currentEquity - this.maxEquity) / this.maxEquity) * 100;
  }

  /**
   * Reset portfolio
   */
  reset(initialCapital: number = 100000): void {
    this.portfolio = {
      cash: initialCapital,
      positions: [],
      totalEquity: initialCapital,
      totalPnL: 0,
      totalPnLPercent: 0,
      maxDrawdown: 0,
      winRate: 0,
      totalTrades: 0,
      openTrades: 0,
    };
    this.maxEquity = initialCapital;
  }
}
