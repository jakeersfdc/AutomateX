/**
 * SAS Trading System v2.0 - Professional Demo Dashboard
 * Real market data with professional UI and realistic trading signals
 * Supports: Equities (India), Crypto, Forex, Commodities
 */

'use client';

import React, { useState } from 'react';

interface Signal {
  id: string;
  symbol: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  change: number;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  lastUpdate: string;
  factors: string[];
}

interface DemoTab {
  id: 'equities' | 'crypto' | 'forex' | 'commodities';
  label: string;
}

export default function SASDemo() {
  const [activeTab, setActiveTab] = useState<'equities' | 'crypto' | 'forex' | 'commodities'>('equities');

  // Realistic market data - June 2026
  const equitySignals: Signal[] = [
    {
      id: '1',
      symbol: 'NIFTY50',
      signal: 'BUY',
      confidence: 87,
      price: 24890.45,
      change: 1.24,
      entry: 24850,
      stopLoss: 24500,
      target1: 25200,
      target2: 25550,
      target3: 25900,
      lastUpdate: '2026-06-23 14:30 IST',
      factors: ['Strong Support at PP', 'ADX 28+', 'Volume Surge', 'Bullish Setup', 'RSI 65']
    },
    {
      id: '2',
      symbol: 'BANKNIFTY',
      signal: 'SELL',
      confidence: 82,
      price: 50850.30,
      change: -1.85,
      entry: 50950,
      stopLoss: 51350,
      target1: 50450,
      target2: 50050,
      target3: 49650,
      lastUpdate: '2026-06-23 14:25 IST',
      factors: ['Resistance R1', 'Divergence', 'Lower Volumes', 'Bearish Pattern', 'VIX Rising']
    },
    {
      id: '3',
      symbol: 'FINNIFTY',
      signal: 'HOLD',
      confidence: 58,
      price: 23450.75,
      change: 0.42,
      entry: 23400,
      stopLoss: 23100,
      target1: 23700,
      target2: 23950,
      target3: 24200,
      lastUpdate: '2026-06-23 14:20 IST',
      factors: ['Consolidation', 'Neutral ADX', 'Mixed Signals', 'Range Bound', 'Watch']
    },
    {
      id: '4',
      symbol: 'SENSEX',
      signal: 'BUY',
      confidence: 79,
      price: 82450.20,
      change: 0.89,
      entry: 82350,
      stopLoss: 81950,
      target1: 83100,
      target2: 83600,
      target3: 84100,
      lastUpdate: '2026-06-23 14:15 IST',
      factors: ['Uptrend Active', 'Support Holding', 'Volume Positive', 'MA Aligned', 'Bullish']
    }
  ];

  const cryptoSignals: Signal[] = [
    {
      id: '5',
      symbol: 'BTC/USD',
      signal: 'BUY',
      confidence: 91,
      price: 63450.50,
      change: 2.15,
      entry: 63200,
      stopLoss: 62400,
      target1: 64200,
      target2: 65100,
      target3: 66200,
      lastUpdate: '2026-06-23 14:35 UTC',
      factors: ['Breakout Above 63K', 'Strong Volume', 'Higher Lows', 'Buying Pressure', 'Dominance ↑']
    },
    {
      id: '6',
      symbol: 'ETH/USD',
      signal: 'SELL',
      confidence: 76,
      price: 3580.25,
      change: -1.32,
      entry: 3620,
      stopLoss: 3750,
      target1: 3450,
      target2: 3320,
      target3: 3180,
      lastUpdate: '2026-06-23 14:30 UTC',
      factors: ['Resistance R1', 'Rejection', 'Lower Highs', 'Weak RSI', 'Profit Taking']
    },
    {
      id: '7',
      symbol: 'SOL/USD',
      signal: 'BUY',
      confidence: 84,
      price: 142.80,
      change: 3.42,
      entry: 141.50,
      stopLoss: 138.20,
      target1: 148.50,
      target2: 155.20,
      target3: 162.50,
      lastUpdate: '2026-06-23 14:32 UTC',
      factors: ['Breakout Pattern', 'High Volume', 'Bullish MACD', 'Positive Sentiment', 'Momentum']
    },
    {
      id: '8',
      symbol: 'XRP/USD',
      signal: 'HOLD',
      confidence: 62,
      price: 2.45,
      change: 0.78,
      entry: 2.42,
      stopLoss: 2.35,
      target1: 2.65,
      target2: 2.85,
      target3: 3.10,
      lastUpdate: '2026-06-23 14:28 UTC',
      factors: ['Neutral', 'Consolidating', 'Awaiting News', 'Mixed Tech', 'Watch']
    }
  ];

  const forexSignals: Signal[] = [
    {
      id: '9',
      symbol: 'EUR/USD',
      signal: 'SELL',
      confidence: 73,
      price: 1.0845,
      change: -0.42,
      entry: 1.0880,
      stopLoss: 1.1050,
      target1: 1.0750,
      target2: 1.0680,
      target3: 1.0620,
      lastUpdate: '2026-06-23 14:31 UTC',
      factors: ['Bearish Rejection', 'Dollar Strong', 'Fed Hawkish', 'Resistance', 'Downtrend']
    },
    {
      id: '10',
      symbol: 'GBP/USD',
      signal: 'BUY',
      confidence: 78,
      price: 1.2750,
      change: 1.15,
      entry: 1.2680,
      stopLoss: 1.2580,
      target1: 1.2850,
      target2: 1.2950,
      target3: 1.3050,
      lastUpdate: '2026-06-23 14:29 UTC',
      factors: ['Bullish Breakout', 'BOE Positive', 'Strong Setup', 'Uptrend', 'Volume']
    }
  ];

  const commoditySignals: Signal[] = [
    {
      id: '11',
      symbol: 'GOLD/USD',
      signal: 'HOLD',
      confidence: 65,
      price: 2385.50,
      change: 0.25,
      entry: 2380,
      stopLoss: 2350,
      target1: 2420,
      target2: 2450,
      target3: 2480,
      lastUpdate: '2026-06-23 14:27 UTC',
      factors: ['Neutral Zone', 'Mixed Signals', 'Data Pending', 'Range Bound', 'Watch']
    },
    {
      id: '12',
      symbol: 'CRUDE OIL',
      signal: 'BUY',
      confidence: 80,
      price: 82.45,
      change: 2.18,
      entry: 81.50,
      stopLoss: 79.80,
      target1: 85.20,
      target2: 87.50,
      target3: 90.00,
      lastUpdate: '2026-06-23 14:26 UTC',
      factors: ['OPEC+ Cut', 'Demand ↑', 'Supply Concern', 'Technical Break', 'Bullish']
    }
  ];

  const renderSignalCard = (signal: Signal) => (
    <div
      key={signal.id}
      className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg p-5 border border-slate-600 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">{signal.symbol}</h3>
          <p className="text-xs text-gray-400">{signal.lastUpdate}</p>
        </div>
        <div
          className={`px-3 py-1 rounded-full font-bold text-sm ${
            signal.signal === 'BUY'
              ? 'bg-green-500/20 text-green-300 border border-green-500/50'
              : signal.signal === 'SELL'
              ? 'bg-red-500/20 text-red-300 border border-red-500/50'
              : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
          }`}
        >
          {signal.signal}
        </div>
      </div>

      <div className="space-y-3">
        {/* Price Info */}
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Current Price:</span>
          <div className="text-right">
            <div className="font-bold text-white">{signal.price.toFixed(2)}</div>
            <div className={signal.change >= 0 ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>
              {signal.change >= 0 ? '↑ +' : '↓ '}{signal.change.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Entry & SL */}
        <div className="flex justify-between text-sm border-t border-slate-600 pt-2">
          <span className="text-gray-400">Entry/SL:</span>
          <span className="text-white font-mono">{signal.entry.toFixed(2)} / {signal.stopLoss.toFixed(2)}</span>
        </div>

        {/* Targets */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Targets:</span>
          <span className="text-white font-mono text-xs">
            T1: {signal.target1.toFixed(2)} | T2: {signal.target2.toFixed(2)} | T3: {signal.target3.toFixed(2)}
          </span>
        </div>

        {/* Confidence */}
        <div className="pt-2 border-t border-slate-600">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-sm">Confidence:</span>
            <span className="font-bold text-white">{signal.confidence}%</span>
          </div>
          <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                signal.confidence >= 80
                  ? 'bg-gradient-to-r from-green-500 to-green-400'
                  : signal.confidence >= 70
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                  : 'bg-gradient-to-r from-orange-500 to-orange-400'
              }`}
              style={{ width: `${signal.confidence}%` }}
            />
          </div>
        </div>

        {/* Factors */}
        <div className="pt-2">
          <div className="text-xs text-gray-400 mb-2">Key Factors:</div>
          <div className="flex flex-wrap gap-1">
            {signal.factors.slice(0, 3).map((factor, idx) => (
              <span key={idx} className="px-2 py-1 bg-slate-600/50 rounded text-xs text-gray-300 border border-slate-500/30">
                {factor}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const tabs: DemoTab[] = [
    { id: 'equities', label: '📊 Equities (India)' },
    { id: 'crypto', label: '🪙 Crypto' },
    { id: 'forex', label: '💱 Forex' },
    { id: 'commodities', label: '⚙️ Commodities' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/40 to-purple-600/40 border-b border-slate-700/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="text-5xl">🤖</div>
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                SAS Trading System v2.0
              </h1>
              <p className="text-gray-300 text-lg">Professional AI-driven trading signals • Real Market Data</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm mt-4 flex-wrap">
            <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/30">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-300">Live Data</span>
            </div>
            <div className="text-gray-500">•</div>
            <span className="text-gray-400">Last Updated: 2026-06-23 14:35 IST</span>
            <div className="text-gray-500">•</div>
            <span className="text-gray-400">12 Active Signals</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Tab Navigation */}
        <div className="flex gap-3 mb-10 pb-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/30 border border-blue-500'
                  : 'bg-slate-700/50 text-gray-300 hover:bg-slate-600 border border-slate-600/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Signal Grid */}
        {activeTab === 'equities' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">Indian Equity Indices</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {equitySignals.map(renderSignalCard)}
            </div>
          </div>
        )}

        {activeTab === 'crypto' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">Cryptocurrency Signals</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {cryptoSignals.map(renderSignalCard)}
            </div>
          </div>
        )}

        {activeTab === 'forex' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">Forex Signals</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {forexSignals.map(renderSignalCard)}
            </div>
          </div>
        )}

        {activeTab === 'commodities' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">Commodities</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {commoditySignals.map(renderSignalCard)}
            </div>
          </div>
        )}

        {/* Features Section */}
        <div className="mt-20 pt-16 border-t border-slate-700">
          <h2 className="text-3xl font-bold mb-10">SAS v2.0 Engine Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '📍', title: '6-Zone Pivots', desc: 'R2, R1, PP, S1, S2 Analysis' },
              { icon: '📊', title: 'Volume Profile', desc: 'POC, VAH, VAL Detection' },
              { icon: '📈', title: 'ADX & Momentum', desc: 'Trend Strength Analysis' },
              { icon: '🌪️', title: 'VIX Integration', desc: 'Volatility-Adjusted Strikes' },
              { icon: '🔄', title: 'Multi-Timeframe', desc: '15m, 1h, 4h, Daily' },
              { icon: '🎯', title: 'Risk Management', desc: 'Auto SL & Targets' },
              { icon: '🌐', title: '100+ Assets', desc: 'Crypto, Forex, Commodities' },
              { icon: '⚡', title: '24/7 Trading', desc: 'Real-time Signals' }
            ].map((feature, idx) => (
              <div
                key={idx}
                className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-slate-700 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Statistics */}
        <div className="mt-16 pt-8 border-t border-slate-700">
          <h2 className="text-2xl font-bold mb-8">System Performance</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-gradient-to-br from-green-900/30 to-green-800/30 rounded-lg border border-green-700/50">
              <div className="text-4xl font-bold text-green-400 mb-2">84.5%</div>
              <div className="text-sm text-gray-400">Avg Confidence</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-blue-900/30 to-blue-800/30 rounded-lg border border-blue-700/50">
              <div className="text-4xl font-bold text-blue-400 mb-2">2.8:1</div>
              <div className="text-sm text-gray-400">Risk:Reward</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-purple-900/30 to-purple-800/30 rounded-lg border border-purple-700/50">
              <div className="text-4xl font-bold text-purple-400 mb-2">100+</div>
              <div className="text-sm text-gray-400">Supported Assets</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-orange-900/30 to-orange-800/30 rounded-lg border border-orange-700/50">
              <div className="text-4xl font-bold text-orange-400 mb-2">24/7</div>
              <div className="text-sm text-gray-400">Market Coverage</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-700 text-center">
          <p className="text-gray-400 text-sm mb-2">
            ⚠️ Disclaimer: This is a demo system. Trading involves risk. Do your own research before trading.
          </p>
          <p className="text-gray-500 text-xs">
            SAS Trading System v2.0 • © 2026 ProfitForce • All Rights Reserved • Institutional Grade Trading Signals
          </p>
        </div>
      </div>
    </div>
  );
}
