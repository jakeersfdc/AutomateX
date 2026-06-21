import V2_1SignalDisplay from '@/components/V2_1SignalDisplay';

export const metadata = {
  title: 'v2.1 Trading Signals | Profitforce',
  description: 'Real-time NIFTY PRO v2.1 trading signals with Ichimoku, Stochastic RSI, and ROC analysis',
};

export default function SignalsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="inline-block mb-4">
            <span className="px-3 py-1 text-xs font-semibold text-green-400 bg-green-500 bg-opacity-10 border border-green-500 rounded-full">
              ✨ NIFTY PRO v2.1
            </span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3">Live Trading Signals</h1>
          <p className="text-xl text-gray-400 max-w-2xl">
            Ichimoku Cloud + Stochastic RSI + ROC Analysis
            <br />
            Real-time signals with automatic 0-11 point scoring system
          </p>
        </div>

        {/* Signal Display */}
        <V2_1SignalDisplay />

        {/* Footer Info */}
        <div className="mt-12 p-6 bg-slate-800 bg-opacity-50 border border-slate-700 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-3">📊 About v2.1 System</h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <li>✓ Ichimoku Cloud (9/26/52) with ±3 score contribution</li>
            <li>✓ Stochastic RSI K/D lines with ±2 score contribution</li>
            <li>✓ Rate of Change (9-period) with ±2 score contribution</li>
            <li>✓ Momentum Dead detection to prevent whipsaws</li>
            <li>✓ Automatic signal generation: BUY (≥3), SELL (≤-3), NO TRADE (&lt;2)</li>
            <li>✓ Multi-market support: NSE, Forex, Crypto</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
