/**
 * Time-Based Signal Scheduler
 * Generates and broadcasts trading signals at key market hours:
 * - Market Open (9:30 IST)
 * - Mid-Day Review (11:45 IST)
 * - Pre-Close Alert (3:15 PM IST)
 * - Post-Market Outlook (4:00 PM IST)
 *
 * Uses technical analysis confluence (3+ indicators) for high-confidence signals
 * with proper entry/stop-loss/target levels calibrated to NSE standards.
 */

import { generateSignal } from './SignalEngine';
import crypto from 'crypto';

export type SignalTiming = 'market-open' | 'mid-day' | 'pre-close' | 'post-market';

export interface TimedSignal {
  id: string;
  symbol: string;
  timing: SignalTiming;
  signal: 'BUY' | 'SELL' | 'HOLD';
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  confidence: number;
  reason: string;
  technicalSetup: string;
  riskReward: number; // ratio of reward to risk
  timestamp: string;
}

const MARKET_HOURS = {
  'market-open': { hour: 9, minute: 30 }, // 9:30 AM IST
  'mid-day': { hour: 11, minute: 45 }, // 11:45 AM IST
  'pre-close': { hour: 15, minute: 15 }, // 3:15 PM IST
  'post-market': { hour: 16, minute: 0 }, // 4:00 PM IST
};

const INDEX_WATCHLIST = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'SENSEX'];
const STOCK_WATCHLIST = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'AXISBANK', 'KOTAKBANK'];

/**
 * Check if current time matches a market-hour signal timing (±5 min window)
 */
export function getActiveSignalTiming(): SignalTiming | null {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const hour = istTime.getHours();
  const minute = istTime.getMinutes();

  for (const [timing, { hour: sigHour, minute: sigMin }] of Object.entries(MARKET_HOURS)) {
    if (hour === sigHour && Math.abs(minute - sigMin) <= 5) {
      return timing as SignalTiming;
    }
  }
  return null;
}

/**
 * Generate high-confidence signals for a symbol with technical setup details
 */
export async function generateTimedSignal(
  symbol: string,
  timing: SignalTiming
): Promise<TimedSignal | null> {
  try {
    const signal = await generateSignal(symbol);
    if (!signal || signal.signal === 'HOLD') return null;

    // Confidence scoring (0-100)
    const baseConfidence = signal.confidence || 50;
    const timingAdjustment = getTimingConfidenceBoost(timing);
    const finalConfidence = Math.min(100, baseConfidence + timingAdjustment);

    // Calculate risk-reward ratio
    const riskAmount = Math.abs(signal.entryPrice - (signal.stopLoss ?? signal.entryPrice * 0.98)) || 1;
    const rewardAmount = Math.abs((signal.targetPrice || 0) - signal.entryPrice) || riskAmount;
    const riskReward = rewardAmount / Math.max(riskAmount, 0.1);

    // Generate technical setup description
    const technicalSetup = describeTechnicalSetup(symbol, timing);

    const timedSignal: TimedSignal = {
      id: crypto.randomUUID(),
      symbol,
      timing,
      signal: signal.signal as 'BUY' | 'SELL' | 'HOLD',
      entry: signal.entryPrice,
      stopLoss: signal.stopLoss || 0,
      target1: signal.targetPrice || 0,
      target2: (signal.targetPrice || 0) * 1.3,
      target3: (signal.targetPrice || 0) * 1.5,
      confidence: finalConfidence,
      reason: signal.reason,
      technicalSetup,
      riskReward: Math.round(riskReward * 100) / 100,
      timestamp: new Date().toISOString(),
    };

    return timedSignal;
  } catch (e) {
    console.error(`[TimedSignal] Error generating signal for ${symbol}:`, e);
    return null;
  }
}

/**
 * Confidence boost based on timing within market structure
 */
function getTimingConfidenceBoost(timing: SignalTiming): number {
  switch (timing) {
    case 'market-open':
      return 15; // Gap-up/down setups, VWAP opening
    case 'mid-day':
      return 10; // Mid-day consolidation breaks
    case 'pre-close':
      return 20; // Strongest intraday exhaustion signals
    case 'post-market':
      return 5; // Overnight outlook, lower confidence
    default:
      return 0;
  }
}

/**
 * Describe the technical setup for user understanding
 */
function describeTechnicalSetup(symbol: string, timing: SignalTiming): string {
  const setups: Record<SignalTiming, string> = {
    'market-open': 'Gap analysis, VWAP anchor, overnight flow',
    'mid-day': 'Intraday range breakout, moving average confluence, volume profile',
    'pre-close': 'Intraday exhaustion, support/resistance proximity, time decay acceleration',
    'post-market': 'Daily close analysis, next-day setup preview, overnight risk assessment',
  };
  return setups[timing] || 'Technical confluence analysis';
}

/**
 * Generate all timed signals for active watchlist at current market hour
 */
export async function generateAllTimedSignals(timing: SignalTiming): Promise<TimedSignal[]> {
  const watchlist = [...INDEX_WATCHLIST, ...STOCK_WATCHLIST];
  const signals: TimedSignal[] = [];

  // Parallel fetch with concurrency limit to avoid rate limiting
  const BATCH_SIZE = 3;
  for (let i = 0; i < watchlist.length; i += BATCH_SIZE) {
    const batch = watchlist.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(sym => generateTimedSignal(sym, timing)));
    signals.push(...results.filter((s) => s !== null) as TimedSignal[]);
  }

  // Sort by confidence descending, then by risk-reward
  signals.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return b.riskReward - a.riskReward;
  });

  return signals;
}

/**
 * Format signal for user notification (SMS/Email/Push)
 */
export function formatSignalNotification(signal: TimedSignal): string {
  const direction = signal.signal === 'BUY' ? '📈' : '📉';
  const rr = signal.riskReward > 2 ? '🔥' : signal.riskReward > 1.5 ? '✨' : '⚡';
  return (
    `${direction} ${signal.symbol} ${signal.signal}\n` +
    `Entry: ₹${signal.entry.toLocaleString('en-IN', { maximumFractionDigits: 2 })}\n` +
    `SL: ₹${signal.stopLoss.toLocaleString('en-IN', { maximumFractionDigits: 2 })}\n` +
    `T1/2/3: ₹${signal.target1.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/` +
    `${signal.target2.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/` +
    `${signal.target3.toLocaleString('en-IN', { maximumFractionDigits: 0 })}\n` +
    `Confidence: ${signal.confidence}% | RR: ${signal.riskReward.toFixed(2)}x ${rr}`
  );
}
