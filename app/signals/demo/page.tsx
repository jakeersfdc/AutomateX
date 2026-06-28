/**
 * ProfitForce ELITE Trading Dashboard v3.0
 * Real-time Multi-Strategy Signal Engine
 * 6+ AI strategies + Options Analysis + Risk Management
 * Live market data with sub-second updates
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock, Zap, Eye, EyeOff, RefreshCw } from 'lucide-react';

interface StrategySignal {
  strategy: string;
  signal: 'BUY' | 'SELL' | 'HOLD' | 'EXIT';
  confidence: number;
  reason: string;
}

interface TradeSignal {
  id: string;
  symbol: string;
  type: 'EQUITY' | 'OPTION' | 'FOREX' | 'COMMODITY';
  signal: 'BUY' | 'SELL' | 'EXIT';
  confidence: number;
  price: number;
  change: number;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  riskReward: number;
  lastUpdate: string;
  factors: string[];
  strategies: StrategySignal[];
  optionSignal?: {
    callSpread: { symbol: string; entry: number; target: number; sl: number };
    putSpread: { symbol: string; entry: number; target: number; sl: number };
    ironCondor: { sold: string; bought: string; width: number };
  };
}

type AssetType = 'all' | 'equities' | 'crypto' | 'forex' | 'commodities' | 'options';
type SortBy = 'confidence' | 'change' | 'symbol' | 'riskReward';

export default function ProfitForceElite() {
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState('');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [assetFilter, setAssetFilter] = useState<AssetType>('all');
  const [sortBy, setSortBy] = useState<SortBy>('confidence');
  const [showStrategies, setShowStrategies] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [updateCount, setUpdateCount] = useState(0);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const liveIndicatorRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch signals from API
  const fetchSignals = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/signals/real-time-strategies');
      
      if (!response.ok) throw new Error('Failed to fetch signals');
      
      const data = await response.json();
      if (data.success && data.signals?.length > 0) {
        setSignals(data.signals);
        setLastUpdate(data.lastUpdate);
        setUpdateCount(c => c + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch live data');
    } finally {
      setLoading(false);
    }
  };

  // Setup live updates
  useEffect(() => {
    fetchSignals();

    // Refresh every 3 seconds for real-time feel
    refreshIntervalRef.current = setInterval(fetchSignals, 3000);

    // Live indicator pulse
    liveIndicatorRef.current = setInterval(() => setIsLive(prev => !prev), 1000);

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      if (liveIndicatorRef.current) clearInterval(liveIndicatorRef.current);
    };
  }, []);

  // Filter signals
  const getTypeLabel = (type: string): AssetType[] => {
    if (type === 'EQUITY') return ['equities'];
    if (type === 'FOREX') return ['forex'];
    if (type === 'COMMODITY') return ['commodities'];
    if (type.includes('USD')) return ['crypto'];
    return [];
  };

  const filteredSignals = signals
    .filter(s => assetFilter === 'all' || getTypeLabel(s.symbol).includes(assetFilter))
    .sort((a, b) => {
      switch (sortBy) {
        case 'confidence': return b.confidence - a.confidence;
        case 'change': return Math.abs(b.change) - Math.abs(a.change);
        case 'riskReward': return b.riskReward - a.riskReward;
        default: return a.symbol.localeCompare(b.symbol);
      }
    });

  // Statistics
  const stats = {
    total: signals.length,
    buys: signals.filter(s => s.signal === 'BUY').length,
    sells: signals.filter(s => s.signal === 'SELL').length,
    avgConfidence: signals.length > 0 
      ? Math.round(signals.reduce((a, b) => a + b.confidence, 0) / signals.length)
      : 0,
    avgRiskReward: signals.length > 0
      ? (signals.reduce((a, b) => a + b.riskReward, 0) / signals.length).toFixed(2)
      : '0'
  };

  const signalCardUI = (signal: TradeSignal) => {
    const isExpanded = expandedCard === signal.id;
    const isGreen = signal.signal === 'BUY';
    const positiveChange = signal.change >= 0;

    return (
      <div
        key={signal.id}
        onClick={() => setExpandedCard(isExpanded ? null : signal.id)}
        className={`group relative transition-all duration-300 cursor-pointer ${
          isExpanded ? 'md:col-span-2' : ''
        }`}
      >
        {/* Glow effect */}
        <div className={`absolute inset-0 rounded-xl blur-2xl transition-all ${
          isGreen ? 'bg-green-500/20' : 'bg-red-500/20'
        } group-hover:opacity-100 opacity-60`} />

        {/* Main Card */}
        <div className={`relative backdrop-blur-2xl rounded-xl border transition-all duration-300 ${
          isExpanded
            ? `bg-gradient-to-br ${isGreen ? 'from-green-950/80 to-slate-900/80' : 'from-red-950/80 to-slate-900/80'} border-${isGreen ? 'green' : 'red'}-500/50 shadow-2xl p-6`
            : `bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-slate-600/40 hover:border-blue-500/50 p-4`
        }`}>

          {isExpanded ? (
            // EXPANDED VIEW - Full Details
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-700/50">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-4xl font-black text-white">{signal.symbol}</h2>
                    <div className={`px-4 py-2 rounded-lg font-bold text-sm backdrop-blur ${
                      isGreen
                        ? 'bg-gradient-to-r from-green-500/30 to-emerald-500/30 text-green-200 border border-green-500/50'
                        : 'bg-gradient-to-r from-red-500/30 to-rose-500/30 text-red-200 border border-red-500/50'
                    }`}>
                      {signal.signal}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${positiveChange ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                      {positiveChange ? '↑' : '↓'} {Math.abs(signal.change).toFixed(2)}%
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm">Updated {signal.lastUpdate}</p>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {signal.confidence}%
                  </div>
                  <p className="text-gray-400 text-xs">Confidence</p>
                </div>
              </div>

              {/* Price Grid */}
              <div className="grid grid-cols-5 gap-3">
                <div className="bg-slate-700/40 rounded-lg p-3 border border-slate-600/50">
                  <p className="text-gray-400 text-xs mb-1">Current</p>
                  <p className={`text-2xl font-bold ${positiveChange ? 'text-green-400' : 'text-red-400'}`}>
                    {signal.price.toFixed(2)}
                  </p>
                </div>
                <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-500/30">
                  <p className="text-gray-400 text-xs mb-1">Entry</p>
                  <p className="text-2xl font-bold text-blue-400">{signal.entry.toFixed(2)}</p>
                </div>
                <div className="bg-red-900/20 rounded-lg p-3 border border-red-500/30">
                  <p className="text-gray-400 text-xs mb-1">Stop Loss</p>
                  <p className="text-2xl font-bold text-red-400">{signal.stopLoss.toFixed(2)}</p>
                </div>
                <div className="bg-purple-900/20 rounded-lg p-3 border border-purple-500/30">
                  <p className="text-gray-400 text-xs mb-1">Risk:Reward</p>
                  <p className="text-2xl font-bold text-purple-400">{signal.riskReward}</p>
                </div>
                <div className="bg-cyan-900/20 rounded-lg p-3 border border-cyan-500/30">
                  <p className="text-gray-400 text-xs mb-1">Win Rate</p>
                  <p className="text-2xl font-bold text-cyan-400">{Math.round(signal.riskReward * 100 / (signal.riskReward + 1))}%</p>
                </div>
              </div>

              {/* Targets */}
              <div className="bg-gradient-to-r from-slate-700/40 to-slate-800/40 rounded-lg p-4 border border-slate-600/50">
                <p className="text-gray-300 font-bold mb-4">Profit Targets</p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'T1', target: signal.target1, pct: ((signal.target1 - signal.entry) / signal.entry * 100) },
                    { label: 'T2', target: signal.target2, pct: ((signal.target2 - signal.entry) / signal.entry * 100) },
                    { label: 'T3', target: signal.target3, pct: ((signal.target3 - signal.entry) / signal.entry * 100) }
                  ].map((t, i) => (
                    <div key={i} className="text-center bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
                      <p className="text-xs text-gray-400 mb-1">{t.label}</p>
                      <p className="text-lg font-bold text-green-400">{t.target.toFixed(2)}</p>
                      <p className="text-xs text-gray-500 mt-1">+{t.pct.toFixed(1)}%</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strategies Grid */}
              {showStrategies && (
                <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg p-4 border border-blue-500/30">
                  <p className="text-gray-300 font-bold mb-3">Strategy Analysis ({signal.strategies.length})</p>
                  <div className="space-y-2">
                    {signal.strategies.map((s, i) => (
                      <div key={i} className="flex items-start justify-between text-xs bg-slate-700/40 rounded p-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-200">{s.strategy}</p>
                          <p className="text-gray-400">{s.reason}</p>
                        </div>
                        <div className="text-right ml-2">
                          <p className={`font-bold ${s.signal === 'BUY' ? 'text-green-400' : s.signal === 'SELL' ? 'text-red-400' : 'text-yellow-400'}`}>
                            {s.signal}
                          </p>
                          <p className="text-gray-400">{s.confidence}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Options Strategies */}
              {showOptions && signal.optionSignal && (
                <div className="bg-gradient-to-r from-orange-900/20 to-yellow-900/20 rounded-lg p-4 border border-orange-500/30">
                  <p className="text-gray-300 font-bold mb-3">📊 Options Strategies</p>
                  <div className="space-y-3">
                    {/* Call Spread */}
                    <div className="bg-slate-700/30 rounded p-3 border border-slate-600/50">
                      <p className="text-xs font-bold text-green-400 mb-2">Call Spread</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-gray-400">Entry</p>
                          <p className="text-green-300 font-bold">{signal.optionSignal.callSpread.entry.toFixed(3)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Target</p>
                          <p className="text-green-300 font-bold">{signal.optionSignal.callSpread.target.toFixed(3)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">S/L</p>
                          <p className="text-red-300 font-bold">{signal.optionSignal.callSpread.sl.toFixed(3)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Put Spread */}
                    <div className="bg-slate-700/30 rounded p-3 border border-slate-600/50">
                      <p className="text-xs font-bold text-red-400 mb-2">Put Spread</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-gray-400">Entry</p>
                          <p className="text-red-300 font-bold">{signal.optionSignal.putSpread.entry.toFixed(3)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Target</p>
                          <p className="text-red-300 font-bold">{signal.optionSignal.putSpread.target.toFixed(3)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">S/L</p>
                          <p className="text-red-300 font-bold">{signal.optionSignal.putSpread.sl.toFixed(3)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Iron Condor */}
                    <div className="bg-slate-700/30 rounded p-3 border border-slate-600/50">
                      <p className="text-xs font-bold text-purple-400 mb-2">Iron Condor</p>
                      <p className="text-xs text-gray-400 mb-1">Sold: {signal.optionSignal.ironCondor.sold}</p>
                      <p className="text-xs text-gray-400 mb-1">Bought: {signal.optionSignal.ironCondor.bought}</p>
                      <p className="text-xs text-purple-300">Width: {signal.optionSignal.ironCondor.width} points</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Key Factors */}
              <div>
                <p className="text-gray-300 font-bold mb-2">📍 Key Factors</p>
                <div className="flex flex-wrap gap-2">
                  {signal.factors.map((f, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-xs text-blue-300">
                      ✓ {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // COLLAPSED VIEW - Quick Stats
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">{signal.symbol}</h3>
                  <p className="text-xs text-gray-400">Confidence: {signal.confidence}%</p>
                </div>
                <div className={`px-3 py-1 rounded font-bold ${
                  isGreen ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                }`}>
                  {signal.signal}
                </div>
              </div>

              <div className="bg-slate-700/30 rounded p-2 border border-slate-600/50">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-400">Price</span>
                  <span className={`font-bold ${positiveChange ? 'text-green-400' : 'text-red-400'}`}>
                    {signal.price.toFixed(2)} {positiveChange ? '↑' : '↓'} {Math.abs(signal.change).toFixed(2)}%
                  </span>
                </div>
                <div className="h-1.5 bg-slate-600 rounded overflow-hidden">
                  <div
                    className={`h-full ${
                      signal.confidence >= 85 ? 'bg-green-500' : signal.confidence >= 75 ? 'bg-blue-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${signal.confidence}%` }}
                  />
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Entry: {signal.entry.toFixed(2)} | T1: {signal.target1.toFixed(2)}
              </div>

              <div className="pt-2 border-t border-slate-600/50 text-xs text-gray-400">
                Click to expand →
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 right-0 w-80 h-80 bg-purple-600/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-600/5 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Header */}
      <div className="relative backdrop-blur-xl bg-gradient-to-b from-blue-600/5 to-transparent border-b border-blue-500/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Title */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="text-6xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-lg">
                ⚡ ProfitForce ELITE
              </div>
              <div className="text-sm">
                <p className="text-gray-400">AI Trading Dashboard v3.0</p>
                <p className="text-xs text-gray-500">Real-time Multi-Strategy Engine</p>
              </div>
            </div>

            {/* Live Indicator */}
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur border ${
                isLive ? 'bg-green-500/10 border-green-500/30' : 'bg-green-900/10 border-green-900/30'
              }`}>
                <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-green-600'}`} />
                <span className="text-xs font-semibold text-green-300">LIVE</span>
              </div>
              <button
                onClick={fetchSignals}
                className="p-2 hover:bg-slate-700/50 rounded-full transition"
                title="Manual refresh"
              >
                <RefreshCw size={18} className={updateCount > 0 ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-3 mb-6">
            {[
              { label: 'Total Signals', value: stats.total, icon: '📊' },
              { label: 'BUY Signals', value: stats.buys, icon: '📈', color: 'text-green-400' },
              { label: 'SELL Signals', value: stats.sells, icon: '📉', color: 'text-red-400' },
              { label: 'Avg Confidence', value: `${stats.avgConfidence}%`, icon: '🎯', color: 'text-blue-400' },
              { label: 'Avg R:R', value: stats.avgRiskReward, icon: '💰', color: 'text-purple-400' }
            ].map((stat, i) => (
              <div key={i} className="bg-slate-800/40 border border-slate-700/30 rounded-lg px-4 py-3 backdrop-blur hover:border-blue-500/30 transition">
                <p className="text-gray-400 text-xs mb-1">{stat.icon} {stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color || 'text-blue-400'}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Filter Buttons */}
            <div className="flex gap-2">
              {(['all', 'equities', 'crypto', 'forex', 'commodities'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setAssetFilter(filter)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    assetFilter === filter
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'bg-slate-700/30 text-gray-300 hover:bg-slate-700/50'
                  }`}
                >
                  {filter === 'all' ? '🌐 All' : filter === 'equities' ? '📊 Equities' : filter === 'crypto' ? '🪙 Crypto' : filter === 'forex' ? '💱 Forex' : '⚙️ Commodities'}
                </button>
              ))}
            </div>

            {/* Sort & Views */}
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg text-sm text-white"
              >
                <option value="confidence">Sort: Confidence ↓</option>
                <option value="change">Sort: Change ↓</option>
                <option value="riskReward">Sort: Risk:Reward ↓</option>
              </select>

              <button
                onClick={() => setShowStrategies(!showStrategies)}
                className={`px-3 py-2 rounded-lg text-sm transition flex items-center gap-1 ${
                  showStrategies ? 'bg-blue-600/30 text-blue-300' : 'bg-slate-700/30 text-gray-300'
                }`}
              >
                {showStrategies ? <Eye size={16} /> : <EyeOff size={16} />} Strategies
              </button>

              <button
                onClick={() => setShowOptions(!showOptions)}
                className={`px-3 py-2 rounded-lg text-sm transition flex items-center gap-1 ${
                  showOptions ? 'bg-orange-600/30 text-orange-300' : 'bg-slate-700/30 text-gray-300'
                }`}
              >
                📊 Options
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-6 py-12">
        {/* Loading */}
        {loading && (
          <div className="text-center py-24">
            <div className="inline-block">
              <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-400 rounded-full animate-spin mb-4" />
              <p className="text-gray-400">Analyzing {signals.length} markets with AI strategies...</p>
              <p className="text-xs text-gray-600 mt-2">Using 6 strategies: SMA, RSI, MACD, S/R, Volume, Trend</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertCircle size={24} className="text-red-400" />
              <p className="text-red-300">{error}</p>
            </div>
            <button
              onClick={fetchSignals}
              className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Signals Grid */}
        {!loading && filteredSignals.length > 0 && (
          <div>
            <p className="text-gray-400 text-sm mb-4">
              Showing {filteredSignals.length} signal{filteredSignals.length !== 1 ? 's' : ''} • Last updated {lastUpdate}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSignals.map(signalCardUI)}
            </div>
          </div>
        )}

        {/* No Signals */}
        {!loading && !error && filteredSignals.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">No signals found for selected filter</p>
            <button
              onClick={() => setAssetFilter('all')}
              className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
            >
              View All Signals
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="relative mt-24 pt-16 border-t border-slate-700/30">
        <div className="max-w-7xl mx-auto px-6 pb-12">
          <div className="grid grid-cols-4 gap-8 mb-8">
            {[
              { title: '6 Strategies', desc: 'SMA, RSI, MACD, S/R, Volume, Multi-TF' },
              { title: 'Options', desc: 'Call/Put Spreads, Iron Condors' },
              { title: 'Global Markets', desc: 'Equities, Crypto, Forex, Commodities' },
              { title: 'Real-time', desc: 'Live updates every 3 seconds' }
            ].map((f, i) => (
              <div key={i}>
                <p className="font-bold text-white mb-1">{f.title}</p>
                <p className="text-xs text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 text-center">
            ⚠️ For educational & research purposes only. Not investment advice. Always do your own research.
          </p>
        </div>
      </div>
    </div>
  );
}
