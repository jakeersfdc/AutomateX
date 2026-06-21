/**
 * Elliott Wave Theory Analysis & Wave Count Indicators
 *
 * Elliott Wave Theory principles:
 *   - Impulsive waves (1,3,5): Trend direction (5 waves)
 *   - Corrective waves (2,4): Counter-trend (3 waves)
 *   - Pattern: 5-3-5-3-5 (5 impulsive, 3 corrective, 5 impulsive, etc.)
 *
 * Key Ratios:
 *   - Wave 3: Usually longest, never shortest of 1,3,5
 *   - Wave 2: Retraces 50-78.6% of Wave 1
 *   - Wave 4: Retraces 23.6-38.2% of Wave 3
 *   - Wave 5: Often extends to 100-161.8% of Wave 1
 */

import type { Bar, Strategy, StrategyContext } from "./Strategy";
import { ema, rsi, sma, highest, lowest } from "./Strategy";

// ─────────────────────────────────────────────────────────────────────────────
// Wave Detection using Swing Points
// ─────────────────────────────────────────────────────────────────────────────

interface WavePoint {
  index: number;
  price: number;
  type: "high" | "low"; // High = peak, Low = trough
  isExtreme: boolean;   // True if local extreme
}

interface ElliotWave {
  waveNumber: number;         // 1-5 for impulse, A-C for correction
  startIdx: number;
  endIdx: number;
  highPrice: number;
  lowPrice: number;
  direction: "up" | "down";
  length: number;
  retracementLevel: number;   // % of previous wave
  targetPrice: number;
}

function findSwingPoints(highs: number[], lows: number[], closes: number[], idx: number, lookback: number = 5): WavePoint[] {
  const points: WavePoint[] = [];
  
  if (idx < lookback * 2) return points;

  // Find local highs and lows
  for (let i = lookback; i < idx; i += 3) { // Sample every 3 bars to avoid too many points
    let isLocalHigh = true;
    let isLocalLow = true;

    // Check if local high
    for (let j = Math.max(0, i - lookback); j <= Math.min(highs.length - 1, i + lookback); j++) {
      if (j !== i && highs[j] > highs[i]) isLocalHigh = false;
      if (j !== i && lows[j] < lows[i]) isLocalLow = false;
    }

    if (isLocalHigh) {
      points.push({ index: i, price: highs[i], type: "high", isExtreme: true });
    }
    if (isLocalLow) {
      points.push({ index: i, price: lows[i], type: "low", isExtreme: true });
    }
  }

  // Sort by index
  return points.sort((a, b) => a.index - b.index);
}

/**
 * Calculate Elliott Wave structure and identify current wave
 */
function analyzeElliottWave(
  highs: number[],
  lows: number[],
  closes: number[],
  idx: number
): { waves: ElliotWave[]; currentWave: number; waveDirection: "up" | "down"; confidence: number } {
  const points = findSwingPoints(highs, lows, closes, idx, 5);

  if (points.length < 4) {
    return { waves: [], currentWave: 0, waveDirection: "up", confidence: 0 };
  }

  // Reconstruct waves from swing points
  const waves: ElliotWave[] = [];
  let waveNum = 1;
  let isUpWave = closes[idx] > closes[Math.max(0, idx - 20)]; // Determine initial direction

  for (let i = 1; i < points.length; i++) {
    const prevPoint = points[i - 1];
    const currPoint = points[i];

    const direction = currPoint.price > prevPoint.price ? "up" : "down";
    const highPrice = Math.max(prevPoint.price, currPoint.price);
    const lowPrice = Math.min(prevPoint.price, currPoint.price);
    const length = Math.abs(currPoint.price - prevPoint.price);

    // Calculate retracement of previous wave
    let retracementLevel = 0;
    if (waves.length > 0) {
      const prevWave = waves[waves.length - 1];
      const prevWaveSize = Math.abs(prevWave.highPrice - prevWave.lowPrice);
      retracementLevel = (length / prevWaveSize) * 100;
    }

    // Simple wave target (Fibonacci extensions)
    let targetPrice = currPoint.price;
    if (waves.length > 0) {
      const prevWave = waves[waves.length - 1];
      const waveSize = Math.abs(currPoint.price - prevPoint.price);
      if (direction === "up") {
        targetPrice = currPoint.price + waveSize * 1.618; // 161.8% extension
      } else {
        targetPrice = currPoint.price - waveSize * 1.618;
      }
    }

    waves.push({
      waveNumber: waveNum,
      startIdx: prevPoint.index,
      endIdx: currPoint.index,
      highPrice,
      lowPrice,
      direction,
      length,
      retracementLevel,
      targetPrice,
    });

    waveNum++;
    if (waveNum > 5) waveNum = 1; // Reset after 5 waves
  }

  // Determine current wave position
  const lastWave = waves[waves.length - 1];
  const currentWave = (waveNum - 1) || 1;
  const waveDirection = lastWave ? lastWave.direction : "up";
  const confidence = Math.min(1, (points.length / 10) * 0.8); // More points = higher confidence

  return { waves, currentWave, waveDirection, confidence };
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategy: Elliott Wave Trend
// ─────────────────────────────────────────────────────────────────────────────

export const elliottWaveTrend: Strategy = {
  id: "elliott_wave_trend",
  name: "Elliott Wave Trend Analysis",
  description:
    "Identifies Elliott Wave patterns (1-5 impulse, A-B-C correction) for trend-following and wave-based entries.",
  warmup: 50,
  step(ctx: StrategyContext) {
    const i = ctx.i;
    if (i < 50) return { action: "HOLD" };

    const highs = ctx.bars.map((b) => b.high);
    const lows = ctx.bars.map((b) => b.low);
    const closes = ctx.bars.map((b) => b.close);

    const price = closes[i];
    const wave = analyzeElliottWave(highs, lows, closes, i);

    if (wave.waves.length === 0) return { action: "HOLD" };

    const lastWave = wave.waves[wave.waves.length - 1];
    const prevWave = wave.waves.length > 1 ? wave.waves[wave.waves.length - 2] : null;

    // ─── BUY on Wave 3 or Wave 5 Completion ────────────────────
    // Wave 3 is the strongest, never shortest
    if (
      ctx.position.qty <= 0 &&
      wave.currentWave === 3 &&
      wave.waveDirection === "up" &&
      wave.confidence > 0.5
    ) {
      const stop = lastWave.lowPrice * 0.98;
      const target = lastWave.targetPrice;

      return {
        action: "BUY",
        confidence: wave.confidence,
        reason: `Elliott Wave: Wave 3 impulse (strongest). Wave 1 size: ${(prevWave?.length || 0).toFixed(2)}, Target: ${target.toFixed(2)}`,
        price: price,
        stopLoss: stop,
        target: target,
      };
    }

    // ─── BUY on Wave 5 Final Push ──────────────────────────────
    if (
      ctx.position.qty <= 0 &&
      wave.currentWave === 5 &&
      wave.waveDirection === "up" &&
      wave.confidence > 0.4
    ) {
      const stop = lastWave.lowPrice * 0.98;
      const target = lastWave.targetPrice;

      return {
        action: "BUY",
        confidence: Math.min(0.65, wave.confidence * 0.9),
        reason: `Elliott Wave: Wave 5 final impulse, retracement: ${lastWave.retracementLevel.toFixed(1)}%. Target: ${target.toFixed(2)}`,
        price: price,
        stopLoss: stop,
        target: target,
      };
    }

    // ─── EXIT on Wave 2/4 Correction ───────────────────────────
    if (
      ctx.position.qty > 0 &&
      (wave.currentWave === 2 || wave.currentWave === 4) &&
      wave.waveDirection === "down"
    ) {
      // Correction phase - reduce or exit
      if (lastWave.retracementLevel > 70) {
        // Deep correction
        return {
          action: "EXIT",
          reason: `Elliott Wave: ${wave.currentWave === 2 ? "Wave 2" : "Wave 4"} correction, retracement ${lastWave.retracementLevel.toFixed(1)}% (deep)`,
        };
      }
    }

    return { action: "HOLD", reason: `Elliott Wave: Wave ${wave.currentWave}, confidence ${wave.confidence.toFixed(2)}` };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Strategy: Elliott Wave Reversal (A-B-C Correction Entry)
// ─────────────────────────────────────────────────────────────────────────────

export const elliottWaveReversal: Strategy = {
  id: "elliott_wave_reversal",
  name: "Elliott Wave Reversal (A-B-C)",
  description:
    "Trades Elliott Wave reversals: Enters after A-B-C correction completes, predicting new impulse wave.",
  warmup: 50,
  step(ctx: StrategyContext) {
    const i = ctx.i;
    if (i < 50) return { action: "HOLD" };

    const highs = ctx.bars.map((b) => b.high);
    const lows = ctx.bars.map((b) => b.low);
    const closes = ctx.bars.map((b) => b.close);

    const price = closes[i];
    const wave = analyzeElliottWave(highs, lows, closes, i);

    if (wave.waves.length < 3) return { action: "HOLD" };

    const lastWave = wave.waves[wave.waves.length - 1];

    // A-B-C correction: Wave 2/4 (down) + bounce (up) + final wave (down)
    // After C wave completes, we expect new impulsive move

    if (
      ctx.position.qty <= 0 &&
      wave.currentWave === 1 &&
      wave.waveDirection === "up" &&
      lastWave.retracementLevel > 50
    ) {
      // Wave A finished, Wave B bounced, now Wave C ended → New Wave 1 starts
      const stop = lastWave.lowPrice * 0.97;
      const target = lastWave.targetPrice;

      return {
        action: "BUY",
        confidence: Math.min(0.7, wave.confidence),
        reason: `Elliott Wave Reversal: A-B-C correction complete, new impulse starting. Wave 1 target: ${target.toFixed(2)}`,
        price: price,
        stopLoss: stop,
        target: target,
      };
    }

    if (
      ctx.position.qty >= 0 &&
      wave.currentWave === 1 &&
      wave.waveDirection === "down" &&
      lastWave.retracementLevel > 50
    ) {
      const stop = lastWave.highPrice * 1.03;
      const target = lastWave.targetPrice;

      if (ctx.position.qty > 0) {
        return {
          action: "EXIT",
          reason: `Elliott Wave Reversal: Down impulse starting after correction`,
        };
      } else {
        return {
          action: "SELL",
          confidence: Math.min(0.7, wave.confidence),
          reason: `Elliott Wave Reversal: A-B-C correction complete, new down impulse starting. Wave 1 target: ${target.toFixed(2)}`,
          price: price,
          stopLoss: stop,
          target: target,
        };
      }
    }

    return { action: "HOLD" };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Strategy: Wave 3 Momentum (Strongest Wave)
// ─────────────────────────────────────────────────────────────────────────────

export const wave3Momentum: Strategy = {
  id: "wave3_momentum",
  name: "Wave 3 Momentum (Strongest Wave)",
  description:
    "Focuses specifically on Wave 3, the strongest and longest of impulsive waves. Entry after Wave 2 ends.",
  warmup: 50,
  step(ctx: StrategyContext) {
    const i = ctx.i;
    if (i < 50) return { action: "HOLD" };

    const highs = ctx.bars.map((b) => b.high);
    const lows = ctx.bars.map((b) => b.low);
    const closes = ctx.bars.map((b) => b.close);

    const price = closes[i];
    const e20 = ema(closes, 20, i);
    const rsiVal = rsi(closes, 14, i) || 50;
    const wave = analyzeElliottWave(highs, lows, closes, i);

    if (wave.waves.length < 2) return { action: "HOLD" };

    const lastWave = wave.waves[wave.waves.length - 1];
    const waveBeforeLast = wave.waves.length > 1 ? wave.waves[wave.waves.length - 2] : null;

    // ─── Wave 3 Entry: After Wave 2 completes (30-50% retracement) ─────
    if (
      ctx.position.qty <= 0 &&
      waveBeforeLast &&
      waveBeforeLast.retracementLevel > 30 &&
      waveBeforeLast.retracementLevel < 80 &&
      lastWave.direction === "up" &&
      wave.currentWave === 3 &&
      e20 != null &&
      price > e20
    ) {
      // Wave 2 was a healthy correction (30-80%), now Wave 3 begins
      // Wave 3 typically moves 1.618x the Wave 1 size
      const wave1Size = wave.waves.length > 1 ? wave.waves[0]?.length || 0 : 0;
      const wave3Target = lastWave.highPrice + wave1Size * 1.618;

      const stop = lastWave.lowPrice * 0.98;
      const target = wave3Target;

      return {
        action: "BUY",
        confidence: Math.min(0.75, wave.confidence * 0.95),
        reason: `Wave 3 Momentum: After Wave 2 ${waveBeforeLast.retracementLevel.toFixed(1)}% retracement. Wave 3 target: ${target.toFixed(2)}, RSI: ${rsiVal.toFixed(0)}`,
        price: price,
        stopLoss: stop,
        target: target,
      };
    }

    return { action: "HOLD" };
  },
};
