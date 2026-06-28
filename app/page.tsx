'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MultiMarketDashboard from '@/components/MultiMarketDashboard';
import ForexSignalDisplay from '@/components/ForexSignalDisplay';
import CryptoSignalDisplay from '@/components/CryptoSignalDisplay';
import V2_1SignalDisplay from '@/components/V2_1SignalDisplay';
import PaperTradingTracker from '@/components/PaperTradingTracker';
import DualStrategyDashboard from '@/components/DualStrategyDashboard';
import LiveSignalsDashboard from '@/components/LiveSignalsDashboard';
import { Activity, Coins, Globe, BarChart3, Zap, Settings, Zap as Lightning } from 'lucide-react';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('live');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="h-8 w-8 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">Profitforce</h1>
          </div>
          <p className="text-gray-400">Professional multi-market trading platform</p>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-8 gap-2 mb-8 bg-gray-800 border border-gray-700 p-2 rounded-lg">
            <TabsTrigger value="live" className="data-[state=active]:bg-red-600">
              <Lightning className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline text-xs">Live</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-blue-600">
              <BarChart3 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline text-xs">Markets</span>
            </TabsTrigger>
            <TabsTrigger value="crypto" className="data-[state=active]:bg-orange-600">
              <Coins className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline text-xs">Crypto</span>
            </TabsTrigger>
            <TabsTrigger value="forex" className="data-[state=active]:bg-cyan-600">
              <Globe className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline text-xs">Forex</span>
            </TabsTrigger>
            <TabsTrigger value="v2-1" className="data-[state=active]:bg-purple-600">
              <Zap className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline text-xs">v2.1</span>
            </TabsTrigger>
            <TabsTrigger value="comparison" className="data-[state=active]:bg-pink-600">
              <span className="text-xs">Comp</span>
            </TabsTrigger>
            <TabsTrigger value="paper" className="data-[state=active]:bg-green-600">
              <span className="text-xs">Paper</span>
            </TabsTrigger>
            <TabsTrigger value="tools" className="data-[state=active]:bg-gray-700">
              <Settings className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>

          {/* Live Signals Tab */}
          <TabsContent value="live" className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <LiveSignalsDashboard />
          </TabsContent>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <MultiMarketDashboard />
          </TabsContent>

          {/* Crypto Tab */}
          <TabsContent value="crypto" className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <CryptoSignalDisplay />
          </TabsContent>

          {/* Forex Tab */}
          <TabsContent value="forex" className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <ForexSignalDisplay />
          </TabsContent>

          {/* v2.1 Tab */}
          <TabsContent value="v2-1" className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="bg-purple-900 bg-opacity-30 p-4 rounded-lg mb-6 border border-purple-700">
              <h3 className="font-semibold text-purple-300">NIFTY PRO v2.1 Strategy</h3>
              <p className="text-gray-300 text-sm mt-1">Ichimoku � Stochastic RSI � ROC</p>
            </div>
            <V2_1SignalDisplay />
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <DualStrategyDashboard />
          </TabsContent>

          {/* Paper Trading Tab */}
          <TabsContent value="paper" className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="bg-green-900 bg-opacity-30 p-4 rounded-lg mb-6 border border-green-700">
              <h3 className="font-semibold text-green-300">Paper Trading Simulator</h3>
              <p className="text-gray-300 text-sm mt-1">Risk-free practice trading</p>
            </div>
            <PaperTradingTracker />
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="text-center py-12 text-gray-400">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Settings & Tools</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
