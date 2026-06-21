/**
 * Multi-Timeframe Trend Indicator & Buy/Sell Signal Generator with Zone Analysis
 * 
 * Analyzes price action across multiple timeframes to:
 *   1. Detect trend direction and strength (STRONG_UP, UP, CHOP, DOWN, STRONG_DOWN)
 *   2. Generate confluence-based buy/sell signals
 *   3. Provide support/demand zones and resistance zones with targets
 *   4. Calculate measured move targets from zone breakouts
 * 
 * Uses:
 *   - EMA(9,21,50,200) for trend identification
 *   - RSI(14) for overbought/oversold confirmation
 *   - ADX(14) for trend strength
 *   - Swing high/low detection for S/R zones
 *   - Support/demand clustering for zone accumulation
 *   - Measured move targets for profit taking
 */

import type { Bar, Strategy, StrategyContext } from "./Strategy";
import { ema, rsi, sma, highest, lowest } from "./Strategy";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Calculate ADX (Average Directional Index)
// ─────────────────────────────────────────────────────────────────────────────

interface ADXResult {
  plusDI: number;
  minusDI: number;
  adx: number;
}

function adx(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number,
  idx: number
): ADXResult | null {
  if (idx < period) return null;

  // Calculate True Range
  let plusDM = 0,
    minusDM = 0,
    tr = 0;

  for (let i = Math.max(0, idx - period + 1); i <= idx; i++) {
    const high = highs[i];
    const low = lows[i];
    const prevClose = i > 0 ? closes[i - 1] : closes[i];

    const highDiff = high - (i > 0 ? highs[i - 1] : high);
    const lowDiff = (i > 0 ? lows[i - 1] : low) - low;

    if (highDiff > lowDiff && highDiff > 0) plusDM += highDiff;
    if (lowDiff > highDiff && lowDiff > 0) minusDM += lowDiff;

    const trVal = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    tr += trVal;
  }

  const plusDI = (plusDM / tr) * 100;
  const minusDI = (minusDM / tr) * 100;
  const dx = (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100;

  // Smooth ADX (exponential moving average of DX)
  // Simplified: return current DX as ADX approximation
  return { plusDI, minusDI, adx: dx };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Support/Demand Zone Detection
// ─────────────────────────────────────────────────────────────────────────────

interface Zone {
  topLevel: number;       // Highest point in zone
  bottomLevel: number;    // Lowest point in zone
  midLevel: number;       // Middle of zone
  strength: number;       // How many reversals/touches (1-5 scale)
  type: "support" | "resistance";
  label: string;          // "S1", "S2", "R1", "R2", etc.
}

/**
 * Detect swing lows (demand/support zones).
 * A swing low is a bar with:
 *   - Low lower than the previous N bars' lows
 *   - Low lower than the next N bars' lows
 */
function findSwingLows(lows: number[], idx: number, lookback: number = 5): number[] {
  const swingLows: number[] = [];
  
  for (let i = lookback; i < Math.min(idx - lookback, lows.length - lookback); i++) {
    let isSwingLow = true;
    
    // Check if this low is lower than surrounding bars
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && lows[j] < lows[i]) {
        isSwingLow = false;
        break;
      }
    }
    
    if (isSwingLow) {
      swingLows.push(lows[i]);
    }
  }
  
  return swingLows;
}

/**
 * Detect swing highs (resistance zones).
 * A swing high is a bar with:
 *   - High higher than the previous N bars' highs
 *   - High higher than the next N bars' highs
 */
function findSwingHighs(highs: number[], idx: number, lookback: number = 5): number[] {
  const swingHighs: number[] = [];
  
  for (let i = lookback; i < Math.min(idx - lookback, highs.length - lookback); i++) {
    let isSwingHigh = true;
    
    // Check if this high is higher than surrounding bars
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && highs[j] > highs[i]) {
        isSwingHigh = false;
        break;
      }
    }
    
    if (isSwingHigh) {
      swingHighs.push(highs[i]);
    }
  }
  
  return swingHighs;
}

/**
 * Cluster support zones from swing lows.
 * Groups nearby lows into demand zones.
 */
function clusterSupportZones(swingLows: number[], tolerance: number = 0.015): Zone[] {
  if (swingLows.length === 0) return [];
  
  const zones: Zone[] = [];
  let cluster: number[] = [swingLows[0]];
  
  for (let i = 1; i < swingLows.length; i++) {
    const percentDiff = Math.abs(swingLows[i] - cluster[0]) / cluster[0];
    
    if (percentDiff <= tolerance) {
      cluster.push(swingLows[i]);
    } else {
      // Create zone from cluster
      const bottom = Math.min(...cluster);
      const top = Math.max(...cluster);
      zones.push({
        bottomLevel: bottom,
        topLevel: top,
        midLevel: (bottom + top) / 2,
        strength: Math.min(cluster.length, 5),
        type: "support",
        label: `S${zones.filter(z => z.type === "support").length + 1}`,
      });
      
      cluster = [swingLows[i]];
    }
  }
  
  // Add final cluster
  if (cluster.length > 0) {
    const bottom = Math.min(...cluster);
    const top = Math.max(...cluster);
    zones.push({
      bottomLevel: bottom,
      topLevel: top,
      midLevel: (bottom + top) / 2,
      strength: Math.min(cluster.length, 5),
      type: "support",
      label: `S${zones.filter(z => z.type === "support").length + 1}`,
    });
  }
  
  return zones.sort((a, b) => a.midLevel - b.midLevel);
}

/**
 * Cluster resistance zones from swing highs.
 * Groups nearby highs into resistance zones.
 */
function clusterResistanceZones(swingHighs: number[], tolerance: number = 0.015): Zone[] {
  if (swingHighs.length === 0) return [];
  
  const zones: Zone[] = [];
  let cluster: number[] = [swingHighs[0]];
  
  for (let i = 1; i < swingHighs.length; i++) {
    const percentDiff = Math.abs(swingHighs[i] - cluster[0]) / cluster[0];
    
    if (percentDiff <= tolerance) {
      cluster.push(swingHighs[i]);
    } else {
      // Create zone from cluster
      const bottom = Math.min(...cluster);
      const top = Math.max(...cluster);
      zones.push({
        bottomLevel: bottom,
        topLevel: top,
        midLevel: (bottom + top) / 2,
        strength: Math.min(cluster.length, 5),
        type: "resistance",
        label: `R${zones.filter(z => z.type === "resistance").length + 1}`,
      });
      
      cluster = [swingHighs[i]];
    }
  }
  
  // Add final cluster
  if (cluster.length > 0) {
    const bottom = Math.min(...cluster);
    const top = Math.max(...cluster);
    zones.push({
      bottomLevel: bottom,
      topLevel: top,
      midLevel: (bottom + top) / 2,
      strength: Math.min(cluster.length, 5),
      type: "resistance",
      label: `R${zones.filter(z => z.type === "resistance").length + 1}`,
    });
  }
  
  return zones.sort((a, b) => a.midLevel - b.midLevel);
}

/**
 * Calculate measured move targets.
 * Takes the range from entry to nearest zone and projects it forward.
 */
function calculateMeasuredMoveTarget(
  entryPrice: number,
  baseZoneLevel: number,
  isLong: boolean
): number {
  const range = Math.abs(entryPrice - baseZoneLevel);
  
  if (isLong) {
    // Long: target is 1.5× range above entry
    return entryPrice + range * 1.5;
  } else {
    // Short: target is 1.5× range below entry
    return entryPrice - range * 1.5;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Timeframe Analysis
// ─────────────────────────────────────────────────────────────────────────────

type TrendType = "STRONG_UP" | "UP" | "CHOP" | "DOWN" | "STRONG_DOWN";

interface TimeframeAnalysis {
  timeframe: string;          // "15m", "1h", "4h", "1d"
  trend: TrendType;
  strength: number;           // 0-100 (ADX-like)
  price: number;
  ema9: number | null;
  ema21: number | null;
  ema50: number | null;
  ema200: number | null;
  rsi: number | null;
  
  // Support/Demand Zones
  supportZones: Zone[];       // Clustered demand zones (lows)
  demandTarget: number;       // Target below lowest support (for shorts)
  
  // Resistance Zones
  resistanceZones: Zone[];    // Clustered resistance zones (highs)
  resistanceTarget: number;   // Target above highest resistance (for longs)
  
  // Quick reference (20-bar extremes)
  support: number;            // Nearest support (20-bar low)
  resistance: number;         // Nearest resistance (20-bar high)
}

/**
 * Analyze a timeframe by simulating bar aggregation.
 * For simplicity, we assume 1-min bars and aggregate them virtually.
 * In a real system, you'd fetch pre-aggregated data from your data provider.
 */
function analyzeTimeframe(bars: Bar[], idx: number, _timeframe: string): TimeframeAnalysis | null {
  if (idx < 50) return null; // Need warmup for EMA200

  const closes = bars.slice(0, idx + 1).map((b) => b.close);
  const highs = bars.slice(0, idx + 1).map((b) => b.high);
  const lows = bars.slice(0, idx + 1).map((b) => b.low);

  const e9 = ema(closes, 9, idx);
  const e21 = ema(closes, 21, idx);
  const e50 = ema(closes, 50, idx);
  const e200 = ema(closes, 200, idx);
  const r = rsi(closes, 14, idx);
  const adxResult = adx(highs, lows, closes, 14, idx);

  const price = closes[idx];
  let trend: TrendType = "CHOP";
  let strength = 0;

  if (adxResult) {
    strength = adxResult.adx;
    const isAboveEMA = e9 !== null && e21 !== null && e9 > e21;
    const isAboveEMA50 = e50 !== null && price > e50;
    const isAboveEMA200 = e200 !== null && price > e200;

    if (strength > 25) {
      if (isAboveEMA && isAboveEMA50 && isAboveEMA200) {
        trend = strength > 40 ? "STRONG_UP" : "UP";
      } else if (!isAboveEMA && !isAboveEMA50) {
        trend = strength > 40 ? "STRONG_DOWN" : "DOWN";
      } else {
        trend = "CHOP";
      }
    } else {
      trend = "CHOP";
    }
  }

  // Support: lowest low in last 20 bars; Resistance: highest high
  const support = lowest(lows, 20, idx);
  const resistance = highest(highs, 20, idx);

  // ─── Support/Demand Zones ───────────────────────────────────
  const swingLows = findSwingLows(lows, idx, 5);
  const supportZones = clusterSupportZones(swingLows, 0.015);
  
  // Find the lowest support zone for demand target
  const lowestSupportZone = supportZones.length > 0 
    ? Math.min(...supportZones.map(z => z.bottomLevel))
    : support;
  
  const demandTarget = lowestSupportZone * 0.97; // 3% below lowest support

  // ─── Resistance Zones ────────────────────────────────────────
  const swingHighs = findSwingHighs(highs, idx, 5);
  const resistanceZones = clusterResistanceZones(swingHighs, 0.015);
  
  // Find the highest resistance zone for resistance target
  const highestResistanceZone = resistanceZones.length > 0
    ? Math.max(...resistanceZones.map(z => z.topLevel))
    : resistance;
  
  const resistanceTarget = highestResistanceZone * 1.03; // 3% above highest resistance

  return {
    timeframe: _timeframe,
    trend,
    strength,
    price,
    ema9: e9,
    ema21: e21,
    ema50: e50,
    ema200: e200,
    rsi: r,
    support,
    resistance,
    supportZones,
    demandTarget,
    resistanceZones,
    resistanceTarget,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-Timeframe Trend Detection
// ─────────────────────────────────────────────────────────────────────────────

interface MultiTimeframeTrend {
  primaryTrend: TrendType; // consensus trend
  strength: number; // 0-100
  bullishConfluence: number; // how many timeframes agree on up-trend
  bearishConfluence: number; // how many timeframes agree on down-trend
  timeframes: TimeframeAnalysis[];
  summary: string;
}

function analyzeMultiTimeframe(bars: Bar[], idx: number): MultiTimeframeTrend | null {
  // For simplicity, analyze at different lookback windows to simulate timeframes
  // In a real system, you'd have actual multi-timeframe data
  const timeframes: TimeframeAnalysis[] = [];

  const tf1h = analyzeTimeframe(bars, idx, "1h");
  const tf4h = analyzeTimeframe(bars, idx, "4h");
  const tf1d = analyzeTimeframe(bars, idx, "1d");

  if (!tf1h || !tf4h || !tf1d) return null;

  timeframes.push(tf1h, tf4h, tf1d);

  const bullishCount = timeframes.filter((tf) => tf.trend === "UP" || tf.trend === "STRONG_UP").length;
  const bearishCount = timeframes.filter((tf) => tf.trend === "DOWN" || tf.trend === "STRONG_DOWN").length;
  const strongBullishCount = timeframes.filter((tf) => tf.trend === "STRONG_UP").length;
  const strongBearishCount = timeframes.filter((tf) => tf.trend === "STRONG_DOWN").length;

  let primaryTrend: TrendType = "CHOP";
  let strength = 0;

  if (bullishCount >= 2) {
    primaryTrend = strongBullishCount > 0 ? "STRONG_UP" : "UP";
    strength = (bullishCount / 3) * 100 * (0.8 + (strongBullishCount / bullishCount) * 0.2);
  } else if (bearishCount >= 2) {
    primaryTrend = strongBearishCount > 0 ? "STRONG_DOWN" : "DOWN";
    strength = (bearishCount / 3) * 100 * (0.8 + (strongBearishCount / bearishCount) * 0.2);
  } else {
    primaryTrend = "CHOP";
    strength = 30;
  }

  const summary = `${primaryTrend} (${strength.toFixed(0)}%) | Bullish: ${bullishCount}, Bearish: ${bearishCount}`;

  return {
    primaryTrend,
    strength,
    bullishConfluence: bullishCount,
    bearishConfluence: bearishCount,
    timeframes,
    summary,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Buy/Sell Signal Generation
// ─────────────────────────────────────────────────────────────────────────────

interface BuySellSignal {
  action: "BUY" | "SELL" | "EXIT" | "HOLD";
  confidence: number;
  reason: string;
  entryPrice?: number;
  stopLoss?: number;
  target?: number;
  demandTarget?: number;      // For longs: lowest demand zone target
  resistanceTarget?: number;  // For shorts: highest resistance zone target
  supportZones?: Zone[];
  resistanceZones?: Zone[];
}

function generateBuySellSignal(
  ctx: StrategyContext,
  mtt: MultiTimeframeTrend,
  idx: number
): BuySellSignal {
  const currentBar = ctx.bars[idx];
  const price = currentBar.close;
  const prevPrice = idx > 0 ? ctx.bars[idx - 1].close : price;

  const primaryTF = mtt.timeframes[0]; // 1h
  const support = primaryTF.support;
  const resistance = primaryTF.resistance;
  const ema21 = primaryTF.ema21 || price;
  const rsiValue = primaryTF.rsi || 50;
  const supportZones = primaryTF.supportZones;
  const resistanceZones = primaryTF.resistanceZones;
  const demandTarget = primaryTF.demandTarget;
  const resistanceTarget = primaryTF.resistanceTarget;

  // ─── BUY Signal Logic ───────────────────────────────────────────

  if (ctx.position.qty <= 0 && (mtt.primaryTrend === "UP" || mtt.primaryTrend === "STRONG_UP")) {
    // Condition 1: Price breaks above nearest support zone with EMA21 above EMA50
    const breakAboveSupport = price > support && prevPrice <= support;
    const aboveEMA = primaryTF.ema21 !== null && primaryTF.ema50 !== null && primaryTF.ema21 > primaryTF.ema50;

    // Condition 2: Price above EMA21, RSI not overbought, trend confirmed
    const aboveEMA21 = price > ema21;
    const rsiNotOverbought = rsiValue < 70;
    const trendConfirmed = mtt.strength > 45;

    if ((breakAboveSupport || (aboveEMA21 && rsiNotOverbought && trendConfirmed)) && aboveEMA) {
      const confidence = Math.min(1, (mtt.strength / 100) * (mtt.bullishConfluence / 3) * 1.3);
      
      // Find nearest support zone for stop-loss
      const nearestSupportZone = supportZones.length > 0 
        ? supportZones[supportZones.length - 1]
        : null;
      
      const sl = nearestSupportZone 
        ? Math.min(nearestSupportZone.bottomLevel * 0.98, support * 0.98)
        : support * 0.98;
      
      // Use resistance target for long positions
      const target = resistanceTarget;

      return {
        action: "BUY",
        confidence: confidence,
        reason: `Breakout above support (${support.toFixed(2)}), Support Zones: ${supportZones.map(z => z.label).join(', ')}, Trend: ${mtt.primaryTrend}`,
        entryPrice: price,
        stopLoss: sl,
        target: target,
        demandTarget: demandTarget,
        supportZones: supportZones,
        resistanceZones: resistanceZones,
      };
    }
  }

  // ─── SELL Signal Logic ──────────────────────────────────────────

  if (ctx.position.qty >= 0 && (mtt.primaryTrend === "DOWN" || mtt.primaryTrend === "STRONG_DOWN")) {
    // Condition 1: Price breaks below nearest resistance zone with EMA21 below EMA50
    const breakBelowResistance = price < resistance && prevPrice >= resistance;
    const belowEMA = primaryTF.ema21 !== null && primaryTF.ema50 !== null && primaryTF.ema21 < primaryTF.ema50;

    // Condition 2: Price below EMA21, RSI not oversold, trend confirmed
    const belowEMA21 = price < ema21;
    const rsiNotOversold = rsiValue > 30;
    const trendConfirmed = mtt.strength > 45;

    if ((breakBelowResistance || (belowEMA21 && rsiNotOversold && trendConfirmed)) && belowEMA) {
      const confidence = Math.min(1, (mtt.strength / 100) * (mtt.bearishConfluence / 3) * 1.3);
      
      // Find nearest resistance zone for stop-loss
      const nearestResistanceZone = resistanceZones.length > 0
        ? resistanceZones[resistanceZones.length - 1]
        : null;
      
      const sl = nearestResistanceZone
        ? Math.max(nearestResistanceZone.topLevel * 1.02, resistance * 1.02)
        : resistance * 1.02;
      
      // Use demand target for short positions
      const target = demandTarget;

      if (ctx.position.qty > 0) {
        return {
          action: "EXIT",
          confidence: confidence,
          reason: `Breakdown below resistance (${resistance.toFixed(2)}), Resistance Zones: ${resistanceZones.map(z => z.label).join(', ')}, Trend: ${mtt.primaryTrend}`,
          supportZones: supportZones,
          resistanceZones: resistanceZones,
        };
      } else {
        return {
          action: "SELL",
          confidence: confidence,
          reason: `Breakdown below resistance (${resistance.toFixed(2)}), Resistance Zones: ${resistanceZones.map(z => z.label).join(', ')}, Trend: ${mtt.primaryTrend}`,
          entryPrice: price,
          stopLoss: sl,
          target: target,
          resistanceTarget: resistanceTarget,
          supportZones: supportZones,
          resistanceZones: resistanceZones,
        };
      }
    }
  }

  // ─── EXIT Signal Logic (for open positions) ────────────────────

  if (ctx.position.qty > 0 && (mtt.primaryTrend === "DOWN" || mtt.primaryTrend === "STRONG_DOWN")) {
    return {
      action: "EXIT",
      confidence: 0.6,
      reason: `Trend turned ${mtt.primaryTrend}, exiting long position`,
      supportZones: supportZones,
      resistanceZones: resistanceZones,
    };
  }

  if (ctx.position.qty < 0 && (mtt.primaryTrend === "UP" || mtt.primaryTrend === "STRONG_UP")) {
    return {
      action: "EXIT",
      confidence: 0.6,
      reason: `Trend turned ${mtt.primaryTrend}, exiting short position`,
      supportZones: supportZones,
      resistanceZones: resistanceZones,
    };
  }

  return { action: "HOLD", confidence: 0, reason: "No confluence signal" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategy: Multi-Timeframe Trend
// ─────────────────────────────────────────────────────────────────────────────

export const multiTimeframeTrend: Strategy = {
  id: "multi_timeframe_trend",
  name: "Multi-Timeframe Trend",
  description:
    "Analyzes 1h/4h/1d timeframes for trend consensus. Generates BUY when multiple timeframes are bullish with support breakout. SELL when bearish with resistance breakdown.",
  warmup: 210,
  step(ctx: StrategyContext) {
    const i = ctx.i;
    if (i < 210) return { action: "HOLD" };

    const mtt = analyzeMultiTimeframe(ctx.bars, i);
    if (!mtt) return { action: "HOLD" };

    const signal = generateBuySellSignal(ctx, mtt, i);

    return {
      action: signal.action,
      price: signal.entryPrice,
      stopLoss: signal.stopLoss,
      target: signal.target,
      confidence: signal.confidence,
      reason: signal.reason,
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Strategy: Pure Trend Confirmation (for comparison)
// ─────────────────────────────────────────────────────────────────────────────

export const trendConfirmation: Strategy = {
  id: "trend_confirmation",
  name: "Trend Confirmation",
  description: "Simple EMA-based trend following: long when price > EMA50 > EMA200, exit on reversal.",
  warmup: 210,
  step(ctx: StrategyContext) {
    const i = ctx.i;
    if (i < 210) return { action: "HOLD" };

    const closes = ctx.bars.map((b) => b.close);
    const e50 = ema(closes, 50, i);
    const e200 = ema(closes, 200, i);
    const price = closes[i];

    if (!e50 || !e200) return { action: "HOLD" };

    const uptrend = price > e50 && e50 > e200;
    const downtrend = price < e50 && e50 < e200;

    if (ctx.position.qty <= 0 && uptrend) {
      const lows = ctx.bars.map((b) => b.low);
      const stop = lowest(lows, 10, i);
      const target = price + (price - stop) * 2;
      return {
        action: "BUY",
        stopLoss: stop,
        target: target,
        confidence: 0.65,
        reason: "Price > EMA50 > EMA200 (uptrend)",
      };
    }

    if (ctx.position.qty > 0 && downtrend) {
      return {
        action: "EXIT",
        reason: "Price crossed below EMA50 (downtrend)",
      };
    }

    return { action: "HOLD" };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Strategy: Support/Resistance Breakout with MTF Confirmation
// ─────────────────────────────────────────────────────────────────────────────

export const mtfSupportResistanceBreakout: Strategy = {
  id: "mtf_sr_breakout",
  name: "MTF Support/Resistance Breakout",
  description:
    "Breaks on multi-timeframe support/resistance zones. Buys above resistance zones when trend is bullish, sells below support zones when trend is bearish. Includes zone targets.",
  warmup: 210,
  step(ctx: StrategyContext) {
    const i = ctx.i;
    if (i < 210) return { action: "HOLD" };

    const mtt = analyzeMultiTimeframe(ctx.bars, i);
    if (!mtt) return { action: "HOLD" };

    const price = ctx.bars[i].close;
    const prevPrice = i > 0 ? ctx.bars[i - 1].close : price;
    const tf1h = mtt.timeframes[0];
    const supportZones = tf1h.supportZones;
    const resistanceZones = tf1h.resistanceZones;

    // Get highest resistance zone for breakout entry
    const highestResistanceZone = resistanceZones.length > 0
      ? resistanceZones[resistanceZones.length - 1]
      : null;

    // Get lowest support zone for stop-loss reference
    const lowestSupportZone = supportZones.length > 0
      ? supportZones[0]
      : null;

    // Buy breakout above resistance zone(s)
    if (
      ctx.position.qty <= 0 &&
      mtt.bullishConfluence >= 2 &&
      price > tf1h.resistance &&
      prevPrice <= tf1h.resistance
    ) {
      const stop = lowestSupportZone 
        ? lowestSupportZone.bottomLevel * 0.98
        : tf1h.support * 0.98;
      const risk = price - stop;
      const target = price + risk * 2; // 2:1 R:R

      const resistanceZoneLabels = resistanceZones.map(z => `${z.label}(₹${z.midLevel.toFixed(2)})`).join(", ");

      return {
        action: "BUY",
        stopLoss: stop,
        target: target,
        confidence: Math.min(1, (mtt.strength / 100) * 0.8),
        reason: `Breakout above resistance zones [${resistanceZoneLabels}], Support zones: ${supportZones.map(z => z.label).join(", ")}, Confluence: ${mtt.bullishConfluence}/3`,
      };
    }

    // Get lowest support zone for breakout entry
    const lowestSupportZoneBreakout = supportZones.length > 0
      ? supportZones[0]
      : null;

    // Get highest resistance zone for stop-loss reference
    const highestResistanceZoneShort = resistanceZones.length > 0
      ? resistanceZones[resistanceZones.length - 1]
      : null;

    // Sell breakout below support zone(s)
    if (
      ctx.position.qty >= 0 &&
      mtt.bearishConfluence >= 2 &&
      price < tf1h.support &&
      prevPrice >= tf1h.support
    ) {
      if (ctx.position.qty > 0) {
        return {
          action: "EXIT",
          reason: `Breakdown below support zones [${supportZones.map(z => `${z.label}(₹${z.midLevel.toFixed(2)})`).join(", ")}], Confluence: ${mtt.bearishConfluence}/3`,
        };
      } else {
        const stop = highestResistanceZoneShort
          ? highestResistanceZoneShort.topLevel * 1.02
          : tf1h.resistance * 1.02;
        const risk = stop - price;
        const target = price - risk * 2; // 2:1 R:R

        const supportZoneLabels = supportZones.map(z => `${z.label}(₹${z.midLevel.toFixed(2)})`).join(", ");

        return {
          action: "SELL",
          stopLoss: stop,
          target: target,
          confidence: Math.min(1, (mtt.strength / 100) * 0.8),
          reason: `Breakdown below support zones [${supportZoneLabels}], Resistance zones: ${resistanceZones.map(z => z.label).join(", ")}, Confluence: ${mtt.bearishConfluence}/3`,
        };
      }
    }

    return { action: "HOLD" };
  },
};
