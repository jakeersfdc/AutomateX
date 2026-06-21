'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowUp, TrendingDown, TrendingUp } from 'lucide-react';

interface PaperPosition {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

interface PaperStats {
  cash: number;
  totalEquity: number;
  totalPnL: number;
  winRate: number;
  openTrades: number;
  totalTrades: number;
  maxDrawdown: number;
}

export default function PaperTradingTracker() {
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [stats, setStats] = useState<PaperStats>({
    cash: 100000,
    totalEquity: 100000,
    totalPnL: 0,
    winRate: 0,
    openTrades: 0,
    totalTrades: 0,
    maxDrawdown: 0,
  });

  useEffect(() => {
    // Fetch paper trading data
    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchPortfolio = async () => {
    try {
      const res = await fetch('/api/paper-trading');
      const data = await res.json();
      if (data.success) {
        setPositions(data.positions);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Equity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalEquity)}</div>
            <p className="text-xs text-gray-500">
              Cash: {formatCurrency(stats.cash)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total P&L
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                stats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(stats.totalPnL)}
            </div>
            <p className="text-xs text-gray-500">
              {((stats.totalPnL / 100000) * 100).toFixed(2)}% return
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</div>
            <p className="text-xs text-gray-500">
              {stats.totalTrades} trades completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Open Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openTrades}</div>
            <p className="text-xs text-gray-500">
              Max Drawdown: {stats.maxDrawdown.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Open Positions */}
      <Card>
        <CardHeader>
          <CardTitle>Open Positions</CardTitle>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <p className="text-gray-500">No open positions</p>
          ) : (
            <div className="space-y-4">
              {positions.map((position) => (
                <div
                  key={position.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <Badge variant={position.side === 'LONG' ? 'default' : 'destructive'}>
                        {position.side}
                      </Badge>
                      <p className="font-medium mt-1">{position.symbol}</p>
                      <p className="text-sm text-gray-500">
                        {position.quantity} @ {formatCurrency(position.entryPrice)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-medium">
                      Current: {formatCurrency(position.currentPrice)}
                    </p>
                    <p
                      className={`text-sm font-semibold ${
                        position.unrealizedPnL >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {position.unrealizedPnL >= 0 ? (
                        <ArrowUp className="inline mr-1 h-4 w-4" />
                      ) : (
                        <ArrowDown className="inline mr-1 h-4 w-4" />
                      )}
                      {formatCurrency(position.unrealizedPnL)} (
                      {position.unrealizedPnLPercent.toFixed(2)}%)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Profitable Trades</span>
              <span className="font-semibold text-green-600">
                {Math.round((stats.totalTrades * stats.winRate) / 100)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Losing Trades</span>
              <span className="font-semibold text-red-600">
                {Math.round(stats.totalTrades * (1 - stats.winRate / 100))}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Max Drawdown</span>
              <span className="font-semibold">{stats.maxDrawdown.toFixed(2)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Starting Capital</span>
              <span className="font-semibold">₹100,000</span>
            </div>
            <div className="flex justify-between">
              <span>Current Equity</span>
              <span className="font-semibold text-blue-600">
                {formatCurrency(stats.totalEquity)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Available Cash</span>
              <span className="font-semibold">{formatCurrency(stats.cash)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
