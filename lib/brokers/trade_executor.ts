/**
 * Automated Trade Execution Service
 * Executes trades from signals with risk management
 */

import { createBrokerClient, BrokerConfig, BrokerOrder, BrokerBase } from './broker_integration';

export interface TradeConfig {
  maxCapital: number;
  riskPerTrade: number; // 0.01 = 1%
  maxOpenTrades: number;
  autoExit: boolean;
  exitProfit: number;
  exitLoss: number;
}

export interface ExecutedTrade {
  id: string;
  symbol: string;
  entryOrderId: string;
  exitOrderId?: string;
  signal: string;
  entryPrice: number;
  quantity: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  entryTime: Date;
  exitTime?: Date;
  exitPrice?: number;
  pnl?: number;
  status: 'ACTIVE' | 'CLOSED';
}

export class TradeExecutor {
  private broker: BrokerBase;
  private config: TradeConfig;
  private activeTrades: Map<string, ExecutedTrade> = new Map();

  constructor(brokerConfig: BrokerConfig, tradeConfig: TradeConfig) {
    this.broker = createBrokerClient(brokerConfig);
    this.config = tradeConfig;
  }

  /**
   * Execute trade from signal
   */
  async executeTrade(
    symbol: string,
    signal: 'BUY' | 'SELL',
    entryPrice: number,
    stopLoss: number,
    targets: { t1: number; t2: number; t3: number }
  ): Promise<ExecutedTrade | null> {
    try {
      // Risk management checks
      if (this.activeTrades.size >= this.config.maxOpenTrades) {
        console.log('Max open trades reached');
        return null;
      }

      // Calculate quantity based on risk
      const riskAmount = this.config.maxCapital * this.config.riskPerTrade;
      const slDistance = Math.abs(entryPrice - stopLoss);
      const quantity = Math.floor(riskAmount / slDistance);

      if (quantity <= 0) {
        console.log('Invalid quantity calculated');
        return null;
      }

      // Place entry order
      const entryOrder = await this.broker.placeOrder(
        symbol,
        quantity,
        entryPrice,
        signal as 'BUY' | 'SELL',
        'MIS'
      );

      if (!entryOrder.orderId) {
        console.error('Failed to place entry order');
        return null;
      }

      // Create trade record
      const tradeId = `TRADE-${Date.now()}`;
      const trade: ExecutedTrade = {
        id: tradeId,
        symbol,
        entryOrderId: entryOrder.orderId,
        signal,
        entryPrice,
        quantity,
        stopLoss,
        target1: targets.t1,
        target2: targets.t2,
        target3: targets.t3,
        entryTime: new Date(),
        status: 'ACTIVE',
      };

      this.activeTrades.set(tradeId, trade);

      // Start monitoring
      this.monitorTrade(tradeId);

      console.log(`Trade executed: ${tradeId}`);
      return trade;
    } catch (error) {
      console.error('Trade execution error:', error);
      return null;
    }
  }

  /**
   * Monitor trade and auto-exit on SL/TP
   */
  private async monitorTrade(tradeId: string): Promise<void> {
    const trade = this.activeTrades.get(tradeId);
    if (!trade) return;

    const checkInterval = setInterval(async () => {
      try {
        const marketData = await this.broker.getMarketData(trade.symbol);
        const currentPrice = marketData.lastPrice;

        // Check SL
        if (trade.signal === 'BUY' && currentPrice <= trade.stopLoss) {
          await this.closeTrade(tradeId, currentPrice, 'SL_HIT');
          clearInterval(checkInterval);
          return;
        }

        if (trade.signal === 'SELL' && currentPrice >= trade.stopLoss) {
          await this.closeTrade(tradeId, currentPrice, 'SL_HIT');
          clearInterval(checkInterval);
          return;
        }

        // Check targets
        if (trade.signal === 'BUY' && currentPrice >= trade.target3) {
          await this.closeTrade(tradeId, currentPrice, 'TP_HIT');
          clearInterval(checkInterval);
          return;
        }

        if (trade.signal === 'SELL' && currentPrice <= trade.target3) {
          await this.closeTrade(tradeId, currentPrice, 'TP_HIT');
          clearInterval(checkInterval);
          return;
        }
      } catch (error) {
        console.error('Monitor trade error:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Close trade
   */
  async closeTrade(
    tradeId: string,
    exitPrice: number,
    reason: string
  ): Promise<void> {
    const trade = this.activeTrades.get(tradeId);
    if (!trade) return;

    try {
      // Place exit order
      const exitOrder = await this.broker.placeOrder(
        trade.symbol,
        trade.quantity,
        exitPrice,
        trade.signal === 'BUY' ? 'SELL' : 'BUY',
        'MIS'
      );

      // Update trade
      trade.exitOrderId = exitOrder.orderId;
      trade.exitPrice = exitPrice;
      trade.exitTime = new Date();
      trade.status = 'CLOSED';

      // Calculate P&L
      if (trade.signal === 'BUY') {
        trade.pnl = (exitPrice - trade.entryPrice) * trade.quantity;
      } else {
        trade.pnl = (trade.entryPrice - exitPrice) * trade.quantity;
      }

      console.log(
        `Trade closed: ${tradeId} | P&L: ${trade.pnl} | Reason: ${reason}`
      );
    } catch (error) {
      console.error('Close trade error:', error);
    }
  }

  /**
   * Get active trades
   */
  getActiveTrades(): ExecutedTrade[] {
    return Array.from(this.activeTrades.values()).filter(
      (t) => t.status === 'ACTIVE'
    );
  }

  /**
   * Get closed trades
   */
  getClosedTrades(): ExecutedTrade[] {
    return Array.from(this.activeTrades.values()).filter(
      (t) => t.status === 'CLOSED'
    );
  }

  /**
   * Get portfolio metrics
   */
  getMetrics() {
    const trades = Array.from(this.activeTrades.values());
    const closedTrades = trades.filter((t) => t.status === 'CLOSED');
    const activeTrades = trades.filter((t) => t.status === 'ACTIVE');

    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winCount = closedTrades.filter((t) => (t.pnl || 0) > 0).length;
    const loseCount = closedTrades.filter((t) => (t.pnl || 0) < 0).length;

    return {
      totalTrades: closedTrades.length,
      activeTrades: activeTrades.length,
      winRate: closedTrades.length > 0 ? (winCount / closedTrades.length) * 100 : 0,
      totalPnL,
      avgWin: winCount > 0 ? closedTrades.filter((t) => (t.pnl || 0) > 0).reduce((sum, t) => sum + (t.pnl || 0), 0) / winCount : 0,
      avgLoss: loseCount > 0 ? closedTrades.filter((t) => (t.pnl || 0) < 0).reduce((sum, t) => sum + (t.pnl || 0), 0) / loseCount : 0,
    };
  }
}
