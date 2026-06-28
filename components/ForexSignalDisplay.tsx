/**
 * Forex Trading Signals - Clean & Simple
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Globe, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';

interface ForexSignal {
  pair: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  target1: number;
  riskInPips: number;
  rewardInPips: number;
  timestamp: string;
}

const FOREX_PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'NZDUSD', 'USDCAD', 'USDCHF', 'EURGBP', 'EURJPY', 'USDINR'];

export default function ForexSignalDisplay() {
  const [signals, setSignals] = useState<ForexSignal[]>([]);
  const [selectedPair, setSelectedPair] = useState<ForexSignal | null>(null);
  const [loading, setLoading] = useState(false);
  const [hiddenPairs, setHiddenPairs] = useState<Set<string>>(new Set());
  const [timeframe, setTimeframe] = useState<'1H' | '4H' | 'D' | 'W'>('1H');
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchForexSignals = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/forex-signals?timeframe=${timeframe}`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setSignals(data.signals || []);
        setChartData(Array.from({ length: 48 }, (_, i) => ({
          time: `${Math.floor(i / 2)}:${(i % 2) * 30}0`,
          price: 1.1 + Math.random() * 0.02
        })));
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchForexSignals();
  }, [timeframe]);

  const filteredSignals = signals.filter(s => !hiddenPairs.has(s.pair));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-black">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-950 border-b border-gray-800 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="h-6 w-6 text-cyan-400" />
              <h1 className="text-2xl font-bold text-white">Forex Trading</h1>
            </div>
            <button className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300">
              <RefreshCw className="h-4 w-4 inline mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Timeframe Selector */}
        <div className="flex gap-2 mb-8">
          {(['1H', '4H', 'D', 'W'] as const).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                timeframe === tf
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2 bg-gray-800 rounded-lg border border-gray-700 p-4">
            <h3 className="text-sm font-bold text-white mb-4">Price Action ({timeframe})</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9ca3af" style={{fontSize: '12px'}} />
                <YAxis stroke="#9ca3af" style={{fontSize: '12px'}} />
                <Tooltip contentStyle={{backgroundColor: '#1f2937', border: '1px solid #374151'}} />
                <Line type="monotone" dataKey="price" stroke="#06b6d4" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pair Stats */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 h-fit">
            <h3 className="text-sm font-bold text-white mb-4">Market Stats</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Active Pairs', value: signals.length },
                { label: 'Buy Signals', value: signals.filter(s => s.signal === 'BUY').length, color: 'text-green-400' },
                { label: 'Sell Signals', value: signals.filter(s => s.signal === 'SELL').length, color: 'text-red-400' },
                { label: 'Avg Confidence', value: signals.length ? Math.round(signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length) + '%' : '0%', color: 'text-blue-400' }
              ].map((stat, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-gray-400">{stat.label}</span>
                  <span className={`font-semibold ${stat.color || 'text-white'}`}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Signals Table */}
        <div className="mt-6 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-bold text-white">Trading Signals</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-300">Pair</th>
                  <th className="px-6 py-3 text-left font-semibold text-gray-300">Signal</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-300">Entry</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-300">S/L</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-300">Target</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-300">Risk/Reward</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-300">Confidence</th>
                  <th className="px-6 py-3 text-center font-semibold text-gray-300">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-400">Loading...</td>
                  </tr>
                ) : filteredSignals.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-400">No signals</td>
                  </tr>
                ) : (
                  filteredSignals.map((signal) => (
                    <tr
                      key={signal.pair}
                      onClick={() => setSelectedPair(signal)}
                      className={`hover:bg-gray-700 cursor-pointer transition border-l-4 ${
                        signal.signal === 'BUY' ? 'border-green-500' :
                        signal.signal === 'SELL' ? 'border-red-500' : 'border-yellow-500'
                      }`}
                    >
                      <td className="px-6 py-4 font-bold text-white">{signal.pair}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold text-white ${
                          signal.signal === 'BUY' ? 'bg-green-600' :
                          signal.signal === 'SELL' ? 'bg-red-600' : 'bg-yellow-600'
                        }`}>
                          {signal.signal}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-white">{signal.entryPrice.toFixed(5)}</td>
                      <td className="px-6 py-4 text-right font-mono text-red-400">{signal.stopLoss.toFixed(5)}</td>
                      <td className="px-6 py-4 text-right font-mono text-green-400">{signal.target1.toFixed(5)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-cyan-400">
                        {(signal.rewardInPips / signal.riskInPips).toFixed(2)}:1
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-white font-bold">{Math.round(signal.confidence)}%</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newHidden = new Set(hiddenPairs);
                            if (newHidden.has(signal.pair)) newHidden.delete(signal.pair);
                            else newHidden.add(signal.pair);
                            setHiddenPairs(newHidden);
                          }}
                          className="p-1 hover:bg-gray-600 rounded"
                        >
                          {hiddenPairs.has(signal.pair) ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Pair Details */}
        {selectedPair && (
          <div className="mt-6 bg-gradient-to-r from-cyan-900 to-blue-900 rounded-lg border border-cyan-700 p-6">
            <h3 className="text-xl font-bold text-white mb-4">{selectedPair.pair} Analysis</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-cyan-300 text-sm">Entry</p>
                <p className="text-2xl font-bold text-white">{selectedPair.entryPrice.toFixed(5)}</p>
              </div>
              <div>
                <p className="text-cyan-300 text-sm">Stop Loss</p>
                <p className="text-2xl font-bold text-red-400">{selectedPair.stopLoss.toFixed(5)}</p>
              </div>
              <div>
                <p className="text-cyan-300 text-sm">Target</p>
                <p className="text-2xl font-bold text-green-400">{selectedPair.target1.toFixed(5)}</p>
              </div>
              <div>
                <p className="text-cyan-300 text-sm">Confidence</p>
                <p className="text-2xl font-bold text-cyan-400">{Math.round(selectedPair.confidence)}%</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
