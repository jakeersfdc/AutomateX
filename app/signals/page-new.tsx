/**
 * Enhanced Signals Page with Paper Trading & Analytics
 */

'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import V2_1SignalDisplay from '@/components/V2_1SignalDisplay';
import PaperTradingTracker from '@/components/PaperTradingTracker';

// Lazy load stats page to avoid bundle bloat
const StrategyStatsPage = React.lazy(() => import('./stats/page'));
const ApiTesterPage = React.lazy(() => import('../debug/api-tester/page'));

export default function SignalsPage() {
  const [activeTab, setActiveTab] = useState('live-signals');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">NIFTY PRO v2.1</h1>
          <p className="text-gray-600 mt-2">
            Advanced Trading Signals with Ichimoku, Stochastic RSI & ROC Indicators
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-5 gap-2 mb-8">
            <TabsTrigger value="live-signals">Live Signals</TabsTrigger>
            <TabsTrigger value="paper-trading">Paper Trading</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
            <TabsTrigger value="api-tester">API Tester</TabsTrigger>
            <TabsTrigger value="documentation" className="hidden lg:flex">
              Docs
            </TabsTrigger>
          </TabsList>

          {/* Live Signals Tab */}
          <TabsContent value="live-signals">
            <V2_1SignalDisplay />
          </TabsContent>

          {/* Paper Trading Tab */}
          <TabsContent value="paper-trading">
            <PaperTradingTracker />
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="statistics">
            <React.Suspense fallback={<div>Loading stats...</div>}>
              <StrategyStatsPage />
            </React.Suspense>
          </TabsContent>

          {/* API Tester Tab */}
          <TabsContent value="api-tester">
            <React.Suspense fallback={<div>Loading API tester...</div>}>
              <ApiTesterPage />
            </React.Suspense>
          </TabsContent>

          {/* Documentation Tab */}
          <TabsContent value="documentation">
            <div className="bg-white rounded-lg p-8 shadow-sm">
              <div className="max-w-3xl">
                <h2 className="text-2xl font-bold mb-4">NIFTY PRO v2.1 Documentation</h2>

                <div className="space-y-6">
                  <section>
                    <h3 className="text-lg font-semibold mb-2">Signal Indicators</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      <li>
                        <strong>Ichimoku Cloud (±3):</strong> Bull/Bear trend identification
                      </li>
                      <li>
                        <strong>Stochastic RSI (±2):</strong> Overbought/Oversold conditions
                      </li>
                      <li>
                        <strong>Rate of Change (±2):</strong> Momentum confirmation
                      </li>
                      <li>
                        <strong>RSI (±1):</strong> Strength indicator
                      </li>
                      <li>
                        <strong>MACD (±1):</strong> Trend direction
                      </li>
                      <li>
                        <strong>Volume (±1):</strong> Trade confirmation
                      </li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-2">Score System</h3>
                    <p className="text-gray-700 mb-2">
                      Each indicator contributes to a cumulative score:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      <li>
                        <strong>Bull Score (0-11):</strong> Sum of positive indicators
                      </li>
                      <li>
                        <strong>Bear Score (0 to -11):</strong> Sum of negative indicators
                      </li>
                      <li>
                        <strong>Signal Logic:</strong> Bull Score &gt;= 6 = BUY, Bear Score &lt;=
                        -6 = SELL
                      </li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-2">Trade Setup</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      <li>Entry: Signal confirmation price</li>
                      <li>Stop Loss: Dynamic ATR-based calculation</li>
                      <li>Target 1: First profit target (1:1 R:R)</li>
                      <li>Target 2: Second target (2:1 R:R)</li>
                      <li>Target 3: Max profit target (3:1 R:R)</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-2">Usage Guide</h3>
                    <ol className="list-decimal list-inside space-y-1 text-gray-700">
                      <li>Check Live Signals tab for current market signal</li>
                      <li>Review all indicator values for confirmation</li>
                      <li>Use Paper Trading to practice without real money</li>
                      <li>Monitor Statistics for strategy performance</li>
                      <li>Use API Tester to validate custom data</li>
                    </ol>
                  </section>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
