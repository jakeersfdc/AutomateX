'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Eye, EyeOff, 
  Activity, Globe, Coins, RefreshCw, BarChart3
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface Signal {
  symbol: string;
  assetClass: 'EQUITY' | 'CRYPTO' | 'FOREX' | 'COMMODITY';
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  entryPrice: number;
  stopLoss: number;
  target1: number;
  riskRewardRatio: number;
  timestamp: string;
}

const MARKETS = {
  CRYPTO: { name: '🪙 Crypto', color: 'from-orange-500 to-yellow-500' },
  FOREX: { name: '💱 Forex', color: 'from-cyan-500 to-green-500' },
  EQUITY: { name: '📈 Equities', color: 'from-blue-500 to-purple-500' },
  COMMODITY: { name: '⚱️ Commodities', color: 'from-amber-500 to-orange-600' },
};

export default function MultiMarketDashboard() {
  const [activeMarket, setActiveMarket] = useState<string>('CRYPTO');
  const [signals, setSignals] = useState<Signal[]>([]);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(false);
  const [hiddenSignals, setHiddenSignals] = useState<Set<string>>(new Set());
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchSignals = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/market-signals?market=${activeMarket}`);
        if (!response.ok) throw new Error('Failed to fetch signals');
        const data = await response.json();
        setSignals(data.signals || []);
        setChartData(Array.from({ length: 24 }, (_, i) => ({
          time: `${i}:00`,
          value: 50 + Math.random() * 50
        })));
      } catch (error) {
        console.error('Error:', error);
        setSignals([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSignals();
  }, [activeMarket]);

  const filteredSignals = signals.filter(s => !hiddenSignals.has(s.symbol));
  const stats = {
    total: signals.length,
    buy: signals.filter(s => s.action === 'BUY').length,
    sell: signals.filter(s => s.action === 'SELL').length,
    avgConfidence: signals.length ? Math.round(signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length) : 0
  };

  const currentMarket = MARKETS[activeMarket as keyof typeof MARKETS];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-black">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-950 border-b border-gray-800 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">Profitforce</h1>
          </div>
          <button className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300">
            <RefreshCw className="h-4 w-4 inline mr-2" />
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Market Tabs */}
        <div className="flex gap-2 mb-8">
          {Object.entries(MARKETS).map(([key, market]) => (
            <button
              key={key}
              onClick={() => setActiveMarket(key)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeMarket === key
                  ? `bg-gradient-to-r ${market.color} text-white shadow-lg`
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {market.name}
            </button>
          ))}
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Active Signals', value: stats.total },
            { label: 'Buy', value: stats.buy, color: 'text-green-400' },
            { label: 'Sell', value: stats.sell, color: 'text-red-400' },
            { label: 'Confidence', value: `${stats.avgConfidence}%`, color: 'text-blue-400' }
          ].map((stat, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color || 'text-white'}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Signals List */}
          <div className="lg:col-span-2 bg-gray-800 rounded-lg border border-gray-700">
            <div className="border-b border-gray-700 px-6 py-4">
              <h2 className="text-lg font-bold text-white">Trading Signals</h2>
            </div>
            <div className="divide-y divide-gray-700 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-400">Loading...</div>
              ) : filteredSignals.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No signals</div>
              ) : (
                filteredSignals.map((signal) => (
                  <div
                    key={signal.symbol}
                    onClick={() => setSelectedSignal(signal)}
                    className={`p-4 hover:bg-gray-700 cursor-pointer transition border-l-4 ${
                      signal.action === 'BUY'
                        ? 'border-green-500'
                        : signal.action === 'SELL'
                        ? 'border-red-500'
                        : 'border-yellow-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-white">{signal.symbol}</h3>
                          <span className={`px-2 py-1 rounded text-xs font-bold text-white ${
                            signal.action === 'BUY' ? 'bg-green-600' :
                            signal.action === 'SELL' ? 'bg-red-600' : 'bg-yellow-600'
                          }`}>
                            {signal.action}
                          </span>
                          <span className="text-xs font-semibold text-gray-400">{Math.round(signal.confidence)}%</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm text-gray-300">
                          <div>Entry: <span className="text-white font-semibold">${signal.entryPrice.toFixed(2)}</span></div>
                          <div>S/L: <span className="text-red-400 font-semibold">${signal.stopLoss.toFixed(2)}</span></div>
                          <div>R:R: <span className="text-blue-400 font-semibold">{signal.riskRewardRatio.toFixed(2)}</span></div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newHidden = new Set(hiddenSignals);
                          if (newHidden.has(signal.symbol)) newHidden.delete(signal.symbol);
                          else newHidden.add(signal.symbol);
                          setHiddenSignals(newHidden);
                        }}
                        className="p-2 hover:bg-gray-600 rounded"
                      >
                        {hiddenSignals.has(signal.symbol) ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            {/* Chart */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <h3 className="text-sm font-bold text-white mb-4">Market Activity</h3>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#666" style={{fontSize: '11px'}} />
                  <YAxis stroke="#666" style={{fontSize: '11px'}} />
                  <Tooltip contentStyle={{backgroundColor: '#1f2937', border: '1px solid #374151'}} />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#colorArea)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Selected Signal Details */}
            {selectedSignal && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                <h3 className="text-sm font-bold text-white mb-4">Signal Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Symbol</span>
                    <span className="font-semibold text-white">{selectedSignal.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Action</span>
                    <span className={`font-semibold ${
                      selectedSignal.action === 'BUY' ? 'text-green-400' :
                      selectedSignal.action === 'SELL' ? 'text-red-400' : 'text-yellow-400'
                    }`}>{selectedSignal.action}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Entry</span>
                    <span className="font-semibold text-white">${selectedSignal.entryPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Stop Loss</span>
                    <span className="font-semibold text-red-400">${selectedSignal.stopLoss.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Target</span>
                    <span className="font-semibold text-green-400">${selectedSignal.target1.toFixed(2)}</span>
                  </div>
                  <button className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded transition-colors">
                    Execute Trade
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
