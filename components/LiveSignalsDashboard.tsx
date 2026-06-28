'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Coins, TrendingUp, Zap, RefreshCw, Filter } from 'lucide-react';

interface Signal {
  symbol: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  timestamp: string;
  [key: string]: any;
}

export default function LiveSignalsDashboard() {
  const [cryptoSignals, setCryptoSignals] = useState<Signal[]>([]);
  const [stockSignals, setStockSignals] = useState<Signal[]>([]);
  const [fnoSignals, setFnoSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('crypto');
  const [selectedMarket, setSelectedMarket] = useState('all');

  const fetchSignals = async () => {
    try {
      setLoading(true);

      // Fetch crypto signals (100+)
      const cryptoRes = await fetch('/api/crypto-signals-live?count=50');
      if (cryptoRes.ok) {
        const data = await cryptoRes.json();
        setCryptoSignals(data.signals || []);
      }

      // Fetch stock signals
      const stockRes = await fetch('/api/stocks-signals?limit=30');
      if (stockRes.ok) {
        const data = await stockRes.json();
        setStockSignals(data.signals || []);
      }

      // Fetch F&O signals
      const fnoRes = await fetch('/api/fno-signals');
      if (fnoRes.ok) {
        const data = await fnoRes.json();
        setFnoSignals(data.signals || []);
      }
    } catch (error) {
      console.error('Error fetching signals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchSignals, 60000);
    return () => clearInterval(interval);
  }, []);

  const SignalRow = ({ signal }: { signal: Signal }) => {
    const signalColor = {
      BUY: 'bg-green-900 border-l-4 border-green-500',
      SELL: 'bg-red-900 border-l-4 border-red-500',
      HOLD: 'bg-yellow-900 border-l-4 border-yellow-500',
    };

    const signalBadge = {
      BUY: 'bg-green-600 text-white',
      SELL: 'bg-red-600 text-white',
      HOLD: 'bg-yellow-600 text-white',
    };

    return (
      <div
        key={signal.symbol}
        className={`p-4 rounded mb-2 text-gray-200 flex items-center justify-between ${signalColor[signal.signal]}`}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg">{signal.symbol}</span>
            <span className={`px-3 py-1 rounded text-sm font-semibold ${signalBadge[signal.signal]}`}>
              {signal.signal}
            </span>
          </div>
          <p className="text-sm text-gray-300 mt-1">
            Price: ₹{signal.price?.toFixed(2) || 'N/A'} | Confidence: {signal.confidence}%
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400">{new Date(signal.timestamp).toLocaleTimeString()}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-blue-400" />
              <h1 className="text-4xl font-bold text-white">Live Trading Signals</h1>
            </div>
            <button
              onClick={fetchSignals}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          <p className="text-gray-400">Real-time signals from Crypto, Stocks (NSE), and F&O markets</p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-gray-400 text-sm">Crypto Signals</p>
            <p className="text-3xl font-bold text-orange-400">{cryptoSignals.length}</p>
            <p className="text-xs text-gray-500 mt-1">24/7 Market</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-gray-400 text-sm">Stock Signals</p>
            <p className="text-3xl font-bold text-blue-400">{stockSignals.length}</p>
            <p className="text-xs text-gray-500 mt-1">NSE/BSE</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-gray-400 text-sm">F&O Signals</p>
            <p className="text-3xl font-bold text-purple-400">{fnoSignals.length}</p>
            <p className="text-xs text-gray-500 mt-1">Options & Futures</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-gray-400 text-sm">Total Signals</p>
            <p className="text-3xl font-bold text-green-400">{cryptoSignals.length + stockSignals.length + fnoSignals.length}</p>
            <p className="text-xs text-gray-500 mt-1">All Markets</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 gap-2 mb-8 bg-gray-800 border border-gray-700 p-2 rounded-lg">
            <TabsTrigger value="crypto" className="data-[state=active]:bg-orange-600">
              <Coins className="h-4 w-4 mr-2" />
              <span>Crypto ({cryptoSignals.length})</span>
            </TabsTrigger>
            <TabsTrigger value="stocks" className="data-[state=active]:bg-blue-600">
              <TrendingUp className="h-4 w-4 mr-2" />
              <span>Stocks ({stockSignals.length})</span>
            </TabsTrigger>
            <TabsTrigger value="fno" className="data-[state=active]:bg-purple-600">
              <Zap className="h-4 w-4 mr-2" />
              <span>F&O ({fnoSignals.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Crypto Signals Tab */}
          <TabsContent value="crypto" className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-gray-400">Showing top {cryptoSignals.length} crypto signals</span>
            </div>
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading signals...</div>
            ) : cryptoSignals.length > 0 ? (
              <div className="space-y-2">
                {cryptoSignals
                  .filter(s => s.confidence >= 60 || selectedMarket === 'all')
                  .slice(0, 20)
                  .map(signal => (
                    <SignalRow key={signal.symbol} signal={signal} />
                  ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">No signals available</div>
            )}
          </TabsContent>

          {/* Stock Signals Tab */}
          <TabsContent value="stocks" className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-gray-400">Showing top {stockSignals.length} stock signals</span>
            </div>
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading signals...</div>
            ) : stockSignals.length > 0 ? (
              <div className="space-y-2">
                {stockSignals
                  .filter(s => s.confidence >= 60 || selectedMarket === 'all')
                  .slice(0, 20)
                  .map(signal => (
                    <SignalRow key={signal.symbol} signal={signal} />
                  ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">No signals available</div>
            )}
          </TabsContent>

          {/* F&O Signals Tab */}
          <TabsContent value="fno" className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-gray-400">Showing top {fnoSignals.length} F&O signals</span>
            </div>
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading signals...</div>
            ) : fnoSignals.length > 0 ? (
              <div className="space-y-2">
                {fnoSignals
                  .filter(s => s.confidence >= 65 || selectedMarket === 'all')
                  .slice(0, 20)
                  .map(signal => (
                    <div
                      key={`${signal.symbol}-${signal.type}-${signal.strike}`}
                      className={`p-4 rounded mb-2 text-gray-200 flex items-center justify-between ${
                        signal.signal === 'BUY'
                          ? 'bg-green-900 border-l-4 border-green-500'
                          : signal.signal === 'SELL'
                          ? 'bg-red-900 border-l-4 border-red-500'
                          : 'bg-yellow-900 border-l-4 border-yellow-500'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg">
                            {signal.symbol} {signal.type === 'CALL' || signal.type === 'PUT' ? signal.strike : 'FUT'}{' '}
                            {signal.type}
                          </span>
                          <span
                            className={`px-3 py-1 rounded text-sm font-semibold ${
                              signal.signal === 'BUY'
                                ? 'bg-green-600'
                                : signal.signal === 'SELL'
                                ? 'bg-red-600'
                                : 'bg-yellow-600'
                            } text-white`}
                          >
                            {signal.signal}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 mt-1">
                          Price: ₹{signal.price?.toFixed(2)} | IV: {signal.iv?.toFixed(1)}% | Confidence:{' '}
                          {signal.confidence}%
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">No signals available</div>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm border-t border-gray-700 pt-6">
          <p>Last updated: {new Date().toLocaleTimeString()}</p>
          <p className="mt-1">⚠️ Live signals with 60%+ confidence | Refresh every 60 seconds</p>
        </div>
      </div>
    </div>
  );
}
