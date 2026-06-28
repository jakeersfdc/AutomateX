'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertCircle, TrendingUp, TrendingDown, Clock, Target, Shield, DollarSign, Activity, Zap } from 'lucide-react';

interface Signal {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD' | 'EXIT';
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  winProbability: number;
  riskRewardRatio: number;
  marketSession: string;
  reasoning: string[];
  alerts: any[];
  assetClass: string;
}

interface Dashboard {
  signals: Record<string, Signal | null>;
  summary: {
    totalSymbols: number;
    activeSignals: number;
    buySignals: number;
    sellSignals: number;
    holdSignals: number;
  };
  timestamp: string;
}

const COLORS = {
  BUY: '#10b981',
  SELL: '#ef4444',
  HOLD: '#f59e0b',
  EXIT: '#8b5cf6',
  equity: '#3b82f6',
  crypto: '#f59e0b',
  futures: '#8b5cf6',
  options: '#ec4899',
  forex: '#06b6d4'
};

export function ProfessionalTradingDashboard() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [chartData, setChartData] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch signals on mount and set up real-time updates
  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const response = await fetch('/api/signals/market-open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbols: ['INFY', 'RELIANCE', 'TCS', 'BTC', 'ETH', 'EURUSD', 'NIFTY-FUT', 'BANKNIFTY-FUT', 'NIFTY-CE'],
            currentBars: generateMockBars(),
            historicalBars: generateMockHistoricalBars()
          })
        });

        const data = await response.json();
        setDashboard(data);
        setIsConnected(true);

        // Update chart data
        updateChartData(data.signals);
      } catch (error) {
        console.error('Failed to fetch signals:', error);
        setIsConnected(false);
      }
    };

    fetchSignals();
    const interval = setInterval(fetchSignals, 5000);
    return () => clearInterval(interval);
  }, []);

  const generateMockBars = () => {
    const symbols = ['INFY', 'RELIANCE', 'TCS', 'BTC', 'ETH', 'EURUSD', 'NIFTY-FUT', 'BANKNIFTY-FUT', 'NIFTY-CE'];
    const bars: Record<string, any> = {};
    
    symbols.forEach(symbol => {
      const basePrice = Math.random() * 100 + 100;
      bars[symbol] = {
        open: basePrice,
        high: basePrice + Math.random() * 5,
        low: basePrice - Math.random() * 5,
        close: basePrice + (Math.random() - 0.5) * 10,
        volume: Math.random() * 10000000
      };
    });
    
    return bars;
  };

  const generateMockHistoricalBars = () => {
    const symbols = ['INFY', 'RELIANCE', 'TCS', 'BTC', 'ETH', 'EURUSD', 'NIFTY-FUT', 'BANKNIFTY-FUT', 'NIFTY-CE'];
    const historicalBars: Record<string, any[]> = {};
    
    symbols.forEach(symbol => {
      historicalBars[symbol] = Array(100).fill(null).map((_, i) => ({
        open: 100 + Math.random() * 20,
        high: 105 + Math.random() * 20,
        low: 95 + Math.random() * 20,
        close: 100 + (Math.random() - 0.5) * 20,
        volume: Math.random() * 5000000
      }));
    });
    
    return historicalBars;
  };

  const updateChartData = (signals: Record<string, Signal | null>) => {
    const data = Object.entries(signals)
      .filter(([_, signal]) => signal !== null)
      .map(([symbol, signal]) => ({
        symbol,
        confidence: (signal?.confidence || 0),
        winRate: (signal?.winProbability || 0) * 100,
        riskReward: signal?.riskRewardRatio || 0,
        type: signal?.assetClass
      }));
    
    setChartData(data);
  };

  if (!dashboard) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-center">
          <Activity className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <p className="text-white text-lg">Loading real-time signals...</p>
        </div>
      </div>
    );
  }

  const activeSignals = Object.values(dashboard.signals).filter(s => s !== null) as Signal[];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4 md:p-8">
      {/* HEADER */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-black text-white mb-2">Professional Trading Dashboard</h1>
            <p className="text-slate-400 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Real-time signals across 5 asset classes
            </p>
          </div>
          <div className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${
            isConnected 
              ? 'bg-green-500/10 text-green-400 border border-green-500/30' 
              : 'bg-red-500/10 text-red-400 border border-red-500/30'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <SummaryCard 
            title="Active Signals" 
            value={dashboard.summary.activeSignals} 
            icon={<Zap className="w-5 h-5" />}
            color="from-blue-600 to-blue-400"
          />
          <SummaryCard 
            title="Buy Signals" 
            value={dashboard.summary.buySignals} 
            icon={<TrendingUp className="w-5 h-5" />}
            color="from-green-600 to-green-400"
          />
          <SummaryCard 
            title="Sell Signals" 
            value={dashboard.summary.sellSignals} 
            icon={<TrendingDown className="w-5 h-5" />}
            color="from-red-600 to-red-400"
          />
          <SummaryCard 
            title="Hold Signals" 
            value={dashboard.summary.holdSignals} 
            icon={<Clock className="w-5 h-5" />}
            color="from-amber-600 to-amber-400"
          />
          <SummaryCard 
            title="Total Symbols" 
            value={dashboard.summary.totalSymbols} 
            icon={<Activity className="w-5 h-5" />}
            color="from-purple-600 to-purple-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* MAIN SIGNALS PANEL */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 backdrop-blur">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-400" />
              Active Trading Signals
            </h2>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {activeSignals.length === 0 ? (
                <p className="text-slate-400 text-center py-8">Waiting for signals...</p>
              ) : (
                activeSignals.map((signal) => (
                  <SignalCard
                    key={signal.symbol}
                    signal={signal}
                    isSelected={selectedSignal?.symbol === signal.symbol}
                    onSelect={setSelectedSignal}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* SELECTED SIGNAL DETAILS */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 backdrop-blur">
          <h2 className="text-xl font-bold text-white mb-4">Signal Details</h2>
          
          {selectedSignal ? (
            <SignalDetails signal={selectedSignal} />
          ) : (
            <p className="text-slate-400 text-center py-8">Select a signal for details</p>
          )}
        </div>
      </div>

      {/* ANALYTICS & CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CONFIDENCE DISTRIBUTION */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 backdrop-blur">
          <h3 className="text-lg font-bold text-white mb-4">Confidence Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="symbol" stroke="rgba(255,255,255,0.5)" />
              <YAxis stroke="rgba(255,255,255,0.5)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="confidence" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* WIN PROBABILITY */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 backdrop-blur">
          <h3 className="text-lg font-bold text-white mb-4">Win Probability vs Risk/Reward</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorWin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorRR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="symbol" stroke="rgba(255,255,255,0.5)" />
              <YAxis stroke="rgba(255,255,255,0.5)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px'
                }}
              />
              <Area type="monotone" dataKey="winRate" stroke="#10b981" fillOpacity={1} fill="url(#colorWin)" />
              <Area type="monotone" dataKey="riskReward" stroke="#f59e0b" fillOpacity={1} fill="url(#colorRR)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ASSET CLASS DISTRIBUTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 backdrop-blur">
          <h3 className="text-lg font-bold text-white mb-4">Asset Class Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={Object.entries(
                  activeSignals.reduce((acc, signal) => {
                    acc[signal.assetClass] = (acc[signal.assetClass] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([name, value]) => ({ name, value }))}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {Object.keys(COLORS).slice(5).map((key) => (
                  <Cell key={key} fill={COLORS[key as keyof typeof COLORS]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* SIGNAL BREAKDOWN */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 backdrop-blur">
          <h3 className="text-lg font-bold text-white mb-4">Signal Type Breakdown</h3>
          <div className="space-y-3">
            {(['BUY', 'SELL', 'HOLD', 'EXIT'] as const).map((type) => {
              const count = activeSignals.filter(s => s.action === type).length;
              const percentage = activeSignals.length > 0 ? (count / activeSignals.length) * 100 : 0;
              
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-white">{type}</span>
                    <span className="text-sm text-slate-400">{count} signals</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: COLORS[type]
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-8 text-center text-sm text-slate-500">
        <p>Last updated: {new Date(dashboard.timestamp).toLocaleTimeString()}</p>
        <p className="mt-2">ProfitForce © 2026 | Professional Trading Signals</p>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon, color }: any) {
  return (
    <div className={`bg-gradient-to-br ${color} bg-opacity-10 border border-white/10 rounded-lg p-4 backdrop-blur`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          <p className="text-3xl font-black text-white mt-1">{value}</p>
        </div>
        <div className="text-white opacity-20">{icon}</div>
      </div>
    </div>
  );
}

function SignalCard({ signal, isSelected, onSelect }: any) {
  return (
    <button
      onClick={() => onSelect(signal)}
      className={`w-full text-left p-4 rounded-lg transition-all border ${
        isSelected
          ? 'bg-slate-700/50 border-blue-500/50 shadow-lg shadow-blue-500/20'
          : 'bg-slate-700/20 border-slate-600/30 hover:bg-slate-700/30'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-white text-lg">{signal.symbol}</span>
        <span
          className={`px-3 py-1 rounded-full text-sm font-bold ${
            signal.action === 'BUY'
              ? 'bg-green-500/20 text-green-400'
              : signal.action === 'SELL'
              ? 'bg-red-500/20 text-red-400'
              : signal.action === 'HOLD'
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-purple-500/20 text-purple-400'
          }`}
        >
          {signal.action}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-slate-500">Confidence</p>
          <p className="text-white font-semibold">{signal.confidence}%</p>
        </div>
        <div>
          <p className="text-slate-500">Win Rate</p>
          <p className="text-white font-semibold">{(signal.winProbability * 100).toFixed(0)}%</p>
        </div>
        <div>
          <p className="text-slate-500">R:R Ratio</p>
          <p className="text-white font-semibold">{signal.riskRewardRatio.toFixed(1)}:1</p>
        </div>
      </div>
    </button>
  );
}

function SignalDetails({ signal }: { signal: Signal }) {
  return (
    <div className="space-y-4">
      {/* Entry & Stops */}
      <div>
        <label className="text-xs text-slate-400 uppercase font-semibold">Entry Price</label>
        <p className="text-2xl font-bold text-white">{signal.entryPrice.toFixed(2)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
          <label className="text-xs text-red-400 uppercase font-semibold">Stop Loss</label>
          <p className="text-lg font-bold text-red-300">{signal.stopLoss.toFixed(2)}</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded p-3">
          <label className="text-xs text-green-400 uppercase font-semibold">Risk Amount</label>
          <p className="text-lg font-bold text-green-300">
            {(Math.abs(signal.entryPrice - signal.stopLoss)).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Targets */}
      <div>
        <label className="text-xs text-slate-400 uppercase font-semibold mb-2 block">Targets</label>
        <div className="space-y-2">
          <TargetLevel level="T1" price={signal.target1} confidence={0.85} />
          <TargetLevel level="T2" price={signal.target2} confidence={0.72} />
          <TargetLevel level="T3" price={signal.target3} confidence={0.58} />
        </div>
      </div>

      {/* Reasoning */}
      <div>
        <label className="text-xs text-slate-400 uppercase font-semibold mb-2 block">Analysis</label>
        <div className="space-y-1">
          {signal.reasoning.slice(0, 3).map((reason, i) => (
            <p key={i} className="text-xs text-slate-300 leading-relaxed">
              • {reason}
            </p>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-600">
        <div>
          <p className="text-xs text-slate-500">R:R Ratio</p>
          <p className="text-sm font-bold text-blue-400">{signal.riskRewardRatio.toFixed(1)}:1</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Session</p>
          <p className="text-sm font-bold text-slate-300">{signal.marketSession}</p>
        </div>
      </div>
    </div>
  );
}

function TargetLevel({ level, price, confidence }: any) {
  return (
    <div className="bg-slate-700/30 border border-slate-600/30 rounded p-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300">{level}</span>
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-white">{price.toFixed(2)}</span>
          <div className="w-12 bg-slate-600 rounded-full h-1">
            <div
              className="bg-gradient-to-r from-green-400 to-blue-400 h-1 rounded-full"
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
