/**
 * Reference strategies. Each is a pure function over StrategyContext.
 * Adding a new one: implement `Strategy`, push into the registry.
 */
import type { Bar, Strategy } from "./Strategy";
import { sma, ema, rsi, highest, lowest } from "./Strategy";
import { projectGannFan, gannSquareOfNine } from "./gann";
import { multiTimeframeTrend, trendConfirmation, mtfSupportResistanceBreakout } from "./multiTimeframeTrend";
import { optionsGreeksIV, optionsThetaDecay, optionsStraddle } from "./optionsIndicators";
import { elliottWaveTrend, elliottWaveReversal, wave3Momentum } from "./elliottWaveIndicators";
import { institutionalGradeIndicator } from "./institutionalIndicator";

/** Classic 5/20 SMA crossover with ATR-style stop using recent low. */
const smaCrossover: Strategy = {
  id: "sma_5_20",
  name: "SMA 5/20 Crossover",
  description: "Long when SMA5 crosses above SMA20; flat on opposite cross.",
  warmup: 25,
  step(ctx) {
    const closes = ctx.bars.map((b) => b.close);
    const i = ctx.i;
    const s = sma(closes, 5, i);
    const l = sma(closes, 20, i);
    const sp = sma(closes, 5, i - 1);
    const lp = sma(closes, 20, i - 1);
    if (s == null || l == null || sp == null || lp == null) return { action: "HOLD" };

    const buy = s > l && sp <= lp;
    const sell = s < l && sp >= lp;
    if (buy && ctx.position.qty <= 0) {
      const lows = ctx.bars.map((b) => b.low);
      const stop = Math.min(lowest(lows, 5, i), ctx.bars[i].close * 0.99);
      const risk = ctx.bars[i].close - stop;
      const target = ctx.bars[i].close + risk * 1.5;
      return { action: "BUY", stopLoss: stop, target, confidence: 0.6, reason: "sma5>sma20 cross" };
    }
    if (sell && ctx.position.qty >= 0) {
      return { action: ctx.position.qty > 0 ? "EXIT" : "HOLD", reason: "sma5<sma20 cross" };
    }
    return { action: "HOLD" };
  },
};

/** RSI(14) mean-reversion: buy oversold (<30) on liquid stocks, exit at 50. */
const rsiMeanReversion: Strategy = {
  id: "rsi_meanrev",
  name: "RSI(14) Mean Reversion",
  description: "Buy on RSI<30 with bullish bar; exit on RSI>50 or 5-day stop.",
  warmup: 20,
  step(ctx) {
    const closes = ctx.bars.map((b) => b.close);
    const i = ctx.i;
    const r = rsi(closes, 14, i);
    const rp = rsi(closes, 14, i - 1);
    if (r == null || rp == null) return { action: "HOLD" };

    const bar = ctx.bars[i];
    const bullish = bar.close > bar.open;

    if (ctx.position.qty <= 0 && r < 30 && bullish) {
      const lows = ctx.bars.map((b) => b.low);
      const stop = lowest(lows, 5, i);
      const target = bar.close + (bar.close - stop) * 2;
      return { action: "BUY", stopLoss: stop, target, confidence: 0.55, reason: "RSI oversold + bullish bar" };
    }
    if (ctx.position.qty > 0 && r > 50) {
      return { action: "EXIT", reason: "RSI mean-reverted" };
    }
    return { action: "HOLD" };
  },
};

/** Donchian 20-day breakout (turtle-style entry, EMA20 trail). */
const donchianBreakout: Strategy = {
  id: "donchian_20",
  name: "Donchian 20 Breakout",
  description: "Buy on close above 20-day high; trail with EMA20.",
  warmup: 25,
  step(ctx) {
    const closes = ctx.bars.map((b) => b.close);
    const highs = ctx.bars.map((b) => b.high);
    const lows = ctx.bars.map((b) => b.low);
    const i = ctx.i;
    if (i < 21) return { action: "HOLD" };

    const prevHigh = highest(highs, 20, i - 1);
    const prevLow = lowest(lows, 20, i - 1);
    const e20 = ema(closes, 20, i);

    if (ctx.position.qty <= 0 && closes[i] > prevHigh) {
      const stop = prevLow;
      const target = closes[i] + (closes[i] - stop) * 2;
      return { action: "BUY", stopLoss: stop, target, confidence: 0.65, reason: "20-day high breakout" };
    }
    if (ctx.position.qty > 0 && e20 != null && closes[i] < e20) {
      return { action: "EXIT", reason: "below EMA20 trail" };
    }
    return { action: "HOLD" };
  },
};

/**
 * Gann fan strategy.
 * Long when price closes above the ascending 1x1 fan AND square-of-9 support
 * has held; exit when price loses the 1x2 line. Short logic mirrors for
 * descending fans (used as exit-only here, since intraday equity shorting
 * has special margin treatment).
 */
const gannFan: Strategy = {
  id: "gann_fan",
  name: "Gann Fan + Square-of-9",
  description: "Trend trades aligned with the 1x1 Gann angle from the most recent swing pivot, with square-of-9 levels as hard support / resistance.",
  warmup: 30,
  step(ctx) {
    const i = ctx.i;
    if (i < 30) return { action: "HOLD" };
    const window = ctx.bars.slice(0, i + 1);
    const proj = projectGannFan(window, 0);
    if (!proj) return { action: "HOLD" };
    const last = proj.series[proj.series.length - 1];
    if (!last) return { action: "HOLD" };
    const close = ctx.bars[i].close;
    const sq = gannSquareOfNine(close);

    // Ascending fan (anchored to swing low): trade with the trend
    if (proj.pivot.direction === "up") {
      if (ctx.position.qty <= 0 && close > last.g1x1 && close > sq.support) {
        const stop = Math.max(last.g1x4, sq.support);
        const target = last.g2x1;
        if (close - stop > 0) {
          return {
            action: "BUY",
            stopLoss: stop,
            target,
            confidence: 0.62,
            reason: `Above Gann 1x1 (₹${last.g1x1}) with sq9 support ₹${sq.support}`,
          };
        }
      }
      if (ctx.position.qty > 0 && close < last.g1x2) {
        return { action: "EXIT", reason: `Lost Gann 1x2 (₹${last.g1x2})` };
      }
    } else {
      // Descending fan: exit longs aggressively
      if (ctx.position.qty > 0 && close < last.g1x1) {
        return { action: "EXIT", reason: `Below descending Gann 1x1 (₹${last.g1x1})` };
      }
    }
    return { action: "HOLD" };
  },
};

function macd(values: number[], fast = 12, slow = 26, signal = 9) {
  const emaFast = values.map((_, i) => ema(values, fast, i)).filter((v): v is number => v != null);
  const emaSlow = values.map((_, i) => ema(values, slow, i)).filter((v): v is number => v != null);
  const macdLine: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const fastVal = ema(values, fast, i);
    const slowVal = ema(values, slow, i);
    macdLine.push(fastVal != null && slowVal != null ? fastVal - slowVal : 0);
  }
  const signalLine: number[] = macdLine.map((_, i) => ema(macdLine, signal, i) ?? 0);
  const histogram = macdLine.map((v, i) => v - signalLine[i]);
  return { macdLine, signalLine, histogram };
}

function atr(highs: number[], lows: number[], closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    trs.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
  }
  return average(trs.slice(-period));
}

function vwap(bars: { high: number; low: number; close: number; volume: number }[], idx: number) {
  const slice = bars.slice(0, idx + 1);
  const weighted = slice.reduce((sum, bar) => sum + ((bar.high + bar.low + bar.close) / 3) * bar.volume, 0);
  const volume = slice.reduce((sum, bar) => sum + bar.volume, 0);
  return volume > 0 ? weighted / volume : null;
}

function isBullishEngulfing(bars: Bar[], idx: number) {
  if (idx < 1) return false;
  const prev = bars[idx - 1];
  const curr = bars[idx];
  return prev.close < prev.open && curr.close > curr.open && curr.close > prev.open && curr.open < prev.close;
}

function isBearishEngulfing(bars: Bar[], idx: number) {
  if (idx < 1) return false;
  const prev = bars[idx - 1];
  const curr = bars[idx];
  return prev.close > prev.open && curr.close < curr.open && curr.close < prev.open && curr.open > prev.close;
}

function isHammer(bar: Bar) {
  const body = Math.abs(bar.close - bar.open);
  const lower = Math.min(bar.close, bar.open) - bar.low;
  const upper = bar.high - Math.max(bar.close, bar.open);
  return lower >= body * 2 && upper <= body;
}

function isShootingStar(bar: Bar) {
  const body = Math.abs(bar.close - bar.open);
  const upper = bar.high - Math.max(bar.close, bar.open);
  const lower = Math.min(bar.close, bar.open) - bar.low;
  return upper >= body * 2 && lower <= body;
}

const gtiMomentum: Strategy = {
  id: "gti_momentum",
  name: "Ghost Trader Momentum",
  description: "Trend momentum trades using EMA alignment, VWAP hold, MACD crossover, and volume lift.",
  warmup: 35,
  step(ctx) {
    const closes = ctx.bars.map((b) => b.close);
    const highs = ctx.bars.map((b) => b.high);
    const lows = ctx.bars.map((b) => b.low);
    const vols = ctx.bars.map((b) => b.volume);
    const i = ctx.i;
    if (i < 35) return { action: "HOLD" };
    const ema9 = ema(closes, 9, i);
    const ema21 = ema(closes, 21, i);
    const ema50 = ema(closes, 50, i);
    const ema200 = ema(closes, 200, i);
    if (ema9 == null || ema21 == null || ema50 == null || ema200 == null) return { action: "HOLD" };
    const trendBull = ema9 > ema21 && ema21 > ema50 && ema50 > ema200;
    const trendBear = ema9 < ema21 && ema21 < ema50 && ema50 < ema200;
    const macdVals = macd(closes, 12, 26, 9);
    const hist = macdVals.histogram[i];
    const histPrev = macdVals.histogram[i - 1] ?? 0;
    const vwapVal = vwap(ctx.bars, i);
    const avgVol = average(vols.slice(Math.max(0, i - 20), i));
    const isVolumeLift = vols[i] > avgVol * 1.2;
    const lastClose = closes[i];
    const prevHigh = Math.max(...highs.slice(Math.max(0, i - 5), i));
    const prevLow = Math.min(...lows.slice(Math.max(0, i - 5), i));
    const atrVal = atr(highs.slice(Math.max(0, i - 14)), lows.slice(Math.max(0, i - 14)), closes.slice(Math.max(0, i - 14)), 14) ?? 1;

    if (ctx.position.qty <= 0 && trendBull && vwapVal != null && lastClose > vwapVal && hist > 0 && histPrev <= 0 && lastClose > prevHigh && isVolumeLift) {
      const stop = Math.max(prevLow, vwapVal);
      return {
        action: "BUY",
        stopLoss: stop,
        target: lastClose + Math.max(atrVal * 3, (lastClose - stop) * 2),
        confidence: 0.75,
        reason: "GTI momentum breakout — EMA alignment, VWAP, MACD & volume",
      };
    }
    if (ctx.position.qty > 0 && (!trendBull || (vwapVal != null && lastClose < vwapVal))) {
      return { action: "EXIT", reason: "GTI momentum no longer aligned" };
    }

    if (ctx.position.qty >= 0 && trendBear && vwapVal != null && lastClose < vwapVal && hist < 0 && histPrev >= 0 && lastClose < prevLow && isVolumeLift) {
      const stop = Math.min(prevHigh, vwapVal);
      return {
        action: "SELL",
        stopLoss: stop,
        target: lastClose - Math.max(atrVal * 3, (stop - lastClose) * 2),
        confidence: 0.72,
        reason: "GTI momentum breakdown — EMA alignment, VWAP, MACD & volume",
      };
    }
    return { action: "HOLD" };
  },
};

const ghostPullback: Strategy = {
  id: "ghost_pullback",
  name: "Ghost Trader Pullback",
  description: "Buy pullbacks to EMA21 in a strong trend with VWAP support, MACD momentum, and confirming volume.",
  warmup: 30,
  step(ctx) {
    const closes = ctx.bars.map((b) => b.close);
    const highs = ctx.bars.map((b) => b.high);
    const lows = ctx.bars.map((b) => b.low);
    const vols = ctx.bars.map((b) => b.volume);
    const i = ctx.i;
    if (i < 30) return { action: "HOLD" };

    const ema9 = ema(closes, 9, i);
    const ema21 = ema(closes, 21, i);
    const ema50 = ema(closes, 50, i);
    const ema200 = ema(closes, 200, i);
    if (ema9 == null || ema21 == null || ema50 == null || ema200 == null) return { action: "HOLD" };

    const trendBull = ema9 > ema21 && ema21 > ema50 && ema50 > ema200;
    const trendBear = ema9 < ema21 && ema21 < ema50 && ema50 < ema200;
    const vwapVal = vwap(ctx.bars, i);
    const macdVals = macd(closes, 12, 26, 9);
    const hist = macdVals.histogram[i];
    const histPrev = macdVals.histogram[i - 1] ?? 0;
    const avgVol = average(vols.slice(Math.max(0, i - 20), i));
    const volumeSurge = vols[i] > avgVol * 1.2 && vols[i] > vols[i - 1];
    const last = ctx.bars[i];
    const lastClose = closes[i];
    const prevLow = Math.min(...lows.slice(Math.max(0, i - 8), i));
    const prevHigh = Math.max(...highs.slice(Math.max(0, i - 8), i));
    const atrVal = atr(highs.slice(Math.max(0, i - 14)), lows.slice(Math.max(0, i - 14)), closes.slice(Math.max(0, i - 14)), 14) ?? 1;
    const rsi14 = rsi(closes, 14, i) ?? 50;
    const bullishBar = last.close > last.open;
    const bearishBar = last.close < last.open;

    if (ctx.position.qty <= 0 && trendBull && vwapVal != null && lastClose < ema21 && lastClose > ema50 && lastClose > vwapVal && hist > 0 && hist > histPrev && rsi14 > 40 && rsi14 < 60 && bullishBar && volumeSurge) {
      const stop = Math.max(prevLow, vwapVal);
      return {
        action: "BUY",
        stopLoss: stop,
        target: lastClose + Math.max(atrVal * 2.5, (lastClose - stop) * 2.2),
        confidence: 0.72,
        reason: "Ghost Trader pullback entry — trend, VWAP support, momentum build, volume confirmation",
      };
    }

    if (ctx.position.qty > 0 && (lastClose < ema50 || (vwapVal != null && lastClose < vwapVal) || rsi14 > 70)) {
      return { action: "EXIT", reason: "Ghost Trader pullback exit — trend or momentum failure" };
    }

    if (ctx.position.qty >= 0 && trendBear && vwapVal != null && lastClose > ema21 && lastClose < ema50 && lastClose < vwapVal && hist < 0 && hist < histPrev && rsi14 < 60 && bearishBar && volumeSurge) {
      const stop = Math.min(prevHigh, vwapVal);
      return {
        action: "SELL",
        stopLoss: stop,
        target: lastClose - Math.max(atrVal * 2.5, (stop - lastClose) * 2.2),
        confidence: 0.70,
        reason: "Ghost Trader pullback short — downtrend, VWAP resistance, falling momentum",
      };
    }

    return { action: "HOLD" };
  },
};

const ghostBreakout: Strategy = {
  id: "ghost_breakout",
  name: "Ghost Trader Breakout",
  description: "Trade volume-backed breakouts from compression zones after VWAP and EMA validation.",
  warmup: 28,
  step(ctx) {
    const closes = ctx.bars.map((b) => b.close);
    const highs = ctx.bars.map((b) => b.high);
    const lows = ctx.bars.map((b) => b.low);
    const vols = ctx.bars.map((b) => b.volume);
    const i = ctx.i;
    if (i < 28) return { action: "HOLD" };

    const zone = consolidationRange(highs, lows, 9, i - 1);
    if (!zone || zone.rangePct >= 0.014) return { action: "HOLD" };
    const avgVol = average(vols.slice(Math.max(0, i - 20), i));
    const volumeSurge = vols[i] > avgVol * 1.3 && vols[i] > vols[i - 1];
    const ema21 = ema(closes, 21, i);
    const ema50 = ema(closes, 50, i);
    const vwapVal = vwap(ctx.bars, i);
    const lastClose = closes[i];
    const atrVal = atr(highs.slice(Math.max(0, i - 14)), lows.slice(Math.max(0, i - 14)), closes.slice(Math.max(0, i - 14)), 14) ?? Math.max(1, zone.range * 0.25);

    if (ctx.position.qty <= 0 && volumeSurge && lastClose > zone.zoneHigh && lastClose > (vwapVal ?? 0) && ema21 != null && lastClose > ema21) {
      const stop = Math.max(zone.zoneLow - atrVal * 0.5, vwapVal ?? zone.zoneLow);
      return {
        action: "BUY",
        stopLoss: stop,
        target: lastClose + Math.max(zone.range * 3.2, atrVal * 4.2),
        confidence: 0.71,
        reason: "Ghost Trader breakout — tight range, volume surge, VWAP/EMA support",
      };
    }

    if (ctx.position.qty >= 0 && volumeSurge && lastClose < zone.zoneLow && lastClose < (vwapVal ?? Infinity) && ema50 != null && lastClose < ema50) {
      const stop = Math.min(zone.zoneHigh + atrVal * 0.5, vwapVal ?? zone.zoneHigh);
      return {
        action: "SELL",
        stopLoss: stop,
        target: lastClose - Math.max(zone.range * 3.2, atrVal * 4.2),
        confidence: 0.69,
        reason: "Ghost Trader breakout short — tight range break and volume confirmation",
      };
    }

    return { action: "HOLD" };
  },
};

const accumulationBreakout: Strategy = {
  id: "accumulation_breakout",
  name: "Accumulation Breakout",
  description: "Buy/sell breakouts from low-range accumulation or distribution zones confirmed by volume expansion.",
  warmup: 30,
  step(ctx) {
    const closes = ctx.bars.map((b) => b.close);
    const highs = ctx.bars.map((b) => b.high);
    const lows = ctx.bars.map((b) => b.low);
    const vols = ctx.bars.map((b) => b.volume);
    const i = ctx.i;
    if (i < 25) return { action: "HOLD" };
    const zone = consolidationRange(highs, lows, 10, i - 1);
    if (!zone || zone.rangePct > 0.018) return { action: "HOLD" };
    const avgVol = average(vols.slice(Math.max(0, i - 20), i));
    const breakoutBuy = closes[i] > zone.zoneHigh && closes[i - 1] <= zone.zoneHigh;
    const breakoutSell = closes[i] < zone.zoneLow && closes[i - 1] >= zone.zoneLow;
    const volumeLift = vols[i] > avgVol * 1.2;
    const atrVal = atr(highs.slice(Math.max(0, i - 14)), lows.slice(Math.max(0, i - 14)), closes.slice(Math.max(0, i - 14)), 14) ?? Math.max(1, zone.range * 0.2);

    if (ctx.position.qty <= 0 && breakoutBuy && volumeLift) {
      const stop = Math.max(zone.zoneLow - atrVal, closes[i] - zone.range * 0.65);
      return {
        action: "BUY",
        stopLoss: stop,
        target: closes[i] + Math.max(zone.range * 3, atrVal * 4),
        confidence: 0.68,
        reason: "Accumulation zone breakout with volume confirmation",
      };
    }
    if (ctx.position.qty >= 0 && breakoutSell && volumeLift) {
      const stop = Math.min(zone.zoneHigh + atrVal, closes[i] + zone.range * 0.65);
      return {
        action: "SELL",
        stopLoss: stop,
        target: closes[i] - Math.max(zone.range * 3, atrVal * 4),
        confidence: 0.68,
        reason: "Distribution zone breakdown with volume confirmation",
      };
    }
    return { action: "HOLD" };
  },
};

const candlePsychology: Strategy = {
  id: "candle_psychology",
  name: "Candle Psychology",
  description: "Trade reversal and breakout candlestick patterns after a short trend, with trend validation and logical stops.",
  warmup: 25,
  step(ctx) {
    const closes = ctx.bars.map((b) => b.close);
    const highs = ctx.bars.map((b) => b.high);
    const lows = ctx.bars.map((b) => b.low);
    const i = ctx.i;
    if (i < 20) return { action: "HOLD" };
    const ema21 = ema(closes, 21, i);
    if (ema21 === null) return { action: "HOLD" };
    const last = ctx.bars[i];
    const prevClose = closes[i - 1];
    const strongUp = closes[i] > closes[i - 5] && closes[i - 1] > closes[i - 6];
    const strongDown = closes[i] < closes[i - 5] && closes[i - 1] < closes[i - 6];
    const atrVal = atr(highs.slice(Math.max(0, i - 14)), lows.slice(Math.max(0, i - 14)), closes.slice(Math.max(0, i - 14)), 14) ?? 1;
    const stop = Math.min(last.open, last.close) - atrVal * 0.75;
    const reverseStop = Math.max(last.open, last.close) + atrVal * 0.75;

    if (ctx.position.qty <= 0 && isHammer(last) && strongDown && last.close > ema21) {
      return {
        action: "BUY",
        stopLoss: stop,
        target: last.close + atrVal * 2.5,
        confidence: 0.64,
        reason: "Bullish hammer after short downtrend and trend support",
      };
    }
    if (ctx.position.qty <= 0 && isBullishEngulfing(ctx.bars, i) && prevClose < ema21) {
      return {
        action: "BUY",
        stopLoss: stop,
        target: last.close + atrVal * 2.5,
        confidence: 0.66,
        reason: "Bullish engulfing reversal pattern",
      };
    }
    if (ctx.position.qty > 0 && (isShootingStar(last) || closes[i] < ema21)) {
      return { action: "EXIT", reason: "Candle psychology exit — bearish reversal or trend failure" };
    }

    if (ctx.position.qty >= 0 && isShootingStar(last) && strongUp && last.close < ema21) {
      return {
        action: "SELL",
        stopLoss: reverseStop,
        target: last.close - atrVal * 2.5,
        confidence: 0.65,
        reason: "Bearish shooting star after an uptrend",
      };
    }
    if (ctx.position.qty >= 0 && isBearishEngulfing(ctx.bars, i) && prevClose > ema21) {
      return {
        action: "SELL",
        stopLoss: reverseStop,
        target: last.close - atrVal * 2.5,
        confidence: 0.66,
        reason: "Bearish engulfing reversal pattern",
      };
    }
    return { action: "HOLD" };
  },
};

function average(values: number[]): number {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
}

function consolidationRange(highs: number[], lows: number[], length: number, idx: number) {
  const start = Math.max(0, idx - length + 1);
  const sliceHighs = highs.slice(start, idx + 1);
  const sliceLows = lows.slice(start, idx + 1);
  if (!sliceHighs.length || !sliceLows.length) return null;
  const zoneHigh = Math.max(...sliceHighs);
  const zoneLow = Math.min(...sliceLows);
  const range = zoneHigh - zoneLow;
  return { zoneHigh, zoneLow, range, rangePct: zoneHigh > 0 ? range / zoneHigh : 0 };
}

const compressionBreakout: Strategy = {
  id: "compression_breakout",
  name: "Compression Breakout",
  description: "Trade breakouts from low-volatility compression zones after order-block overlap and institutional squeeze.",
  warmup: 25,
  step(ctx) {
    const closes = ctx.bars.map((b) => b.close);
    const highs = ctx.bars.map((b) => b.high);
    const lows = ctx.bars.map((b) => b.low);
    const vols = ctx.bars.map((b) => b.volume);
    const i = ctx.i;
    if (i < 20) return { action: "HOLD" };

    const zone = consolidationRange(highs, lows, 8, i - 1);
    if (!zone || zone.rangePct >= 0.015) return { action: "HOLD" };

    const prevZone = consolidationRange(highs, lows, 8, i - 2);
    const avgVol = average(vols.slice(Math.max(0, i - 20), i));
    const breakoutBuy = closes[i] > zone.zoneHigh && closes[i - 1] <= zone.zoneHigh;
    const breakoutSell = closes[i] < zone.zoneLow && closes[i - 1] >= zone.zoneLow;
    const volumeSpike = vols[i] > avgVol * 1.2;
    const r = rsi(closes, 14, i) ?? 50;
    const atrRange = Math.max(1, zone.range * 0.4);

    if (ctx.position.qty <= 0 && breakoutBuy && (r < 80 || volumeSpike)) {
      const stop = Math.max(zone.zoneLow - atrRange, closes[i] - zone.range * 0.75);
      const target = closes[i] + Math.max(zone.range * 2.5, atrRange * 4);
      return {
        action: "BUY",
        stopLoss: stop,
        target,
        confidence: 0.7,
        reason: "Compression breakout — institutional order block squeeze",
      };
    }
    if (ctx.position.qty >= 0 && breakoutSell && (r > 20 || volumeSpike)) {
      const stop = Math.min(zone.zoneHigh + atrRange, closes[i] + zone.range * 0.75);
      const target = closes[i] - Math.max(zone.range * 2.5, atrRange * 4);
      return {
        action: "SELL",
        stopLoss: stop,
        target,
        confidence: 0.7,
        reason: "Compression breakdown — institutional order block collapse",
      };
    }
    return { action: "HOLD" };
  },
};

const orderBlockBreakout: Strategy = {
  id: "order_block_breakout",
  name: "Order Block Breakout",
  description: "Enter when price breaks away from a recent buyer/seller order-block zone after consolidation.",
  warmup: 25,
  step(ctx) {
    const closes = ctx.bars.map((b) => b.close);
    const highs = ctx.bars.map((b) => b.high);
    const lows = ctx.bars.map((b) => b.low);
    const vols = ctx.bars.map((b) => b.volume);
    const i = ctx.i;
    if (i < 18) return { action: "HOLD" };

    const zoneHigh = Math.max(...highs.slice(i - 8, i - 2));
    const zoneLow = Math.min(...lows.slice(i - 8, i - 2));
    const zoneRange = zoneHigh - zoneLow;
    const rangePct = zoneHigh > 0 ? zoneRange / zoneHigh : 0;
    if (zoneRange <= 0 || rangePct > 0.02) return { action: "HOLD" };

    const recentVol = average(vols.slice(i - 8, i - 2));
    const orderBlockVolume = average(vols.slice(i - 5, i - 2));
    const highVolBlock = orderBlockVolume > recentVol * 1.1;

    const breakoutBuy = closes[i] > zoneHigh && closes[i - 1] <= zoneHigh;
    const breakoutSell = closes[i] < zoneLow && closes[i - 1] >= zoneLow;
    const atr = Math.max(1, zoneRange * 0.35);
    const lastClose = closes[i];

    if (ctx.position.qty <= 0 && breakoutBuy && highVolBlock) {
      return {
        action: "BUY",
        stopLoss: zoneLow - atr,
        target: lastClose + Math.max(zoneRange * 3, atr * 4),
        confidence: 0.68,
        reason: "Order block breakout (buyer zone cleared)",
      };
    }
    if (ctx.position.qty >= 0 && breakoutSell && highVolBlock) {
      return {
        action: "SELL",
        stopLoss: zoneHigh + atr,
        target: lastClose - Math.max(zoneRange * 3, atr * 4),
        confidence: 0.68,
        reason: "Order block breakdown (seller zone cleared)",
      };
    }
    return { action: "HOLD" };
  },
};

const weeklyExpiryMomentum: Strategy = {
  id: "weekly_expiry_momentum",
  name: "Weekly Expiry Momentum",
  description: "Capture high-probability moves aligned with weekly trend and short-term compression breakouts.",
  warmup: 30,
  step(ctx) {
    const closes = ctx.bars.map((b) => b.close);
    const highs = ctx.bars.map((b) => b.high);
    const lows = ctx.bars.map((b) => b.low);
    const i = ctx.i;
    if (i < 30) return { action: "HOLD" };

    const weeklyCloses: number[] = [];
    for (let j = 0; j <= i; j += 5) weeklyCloses.push(closes[j]);
    const wkFast = ema(weeklyCloses, 10, weeklyCloses.length - 1);
    const wkSlow = ema(weeklyCloses, 30, weeklyCloses.length - 1);
    if (wkFast == null || wkSlow == null) return { action: "HOLD" };

    const bullWeekly = wkFast > wkSlow;
    const bearWeekly = wkFast < wkSlow;
    const zone = consolidationRange(highs, lows, 10, i - 1);
    if (!zone || zone.rangePct >= 0.02) return { action: "HOLD" };

    const breakoutBuy = closes[i] > zone.zoneHigh && bullWeekly;
    const breakoutSell = closes[i] < zone.zoneLow && bearWeekly;
    const atr = Math.max(1, zone.range * 0.4);
    if (ctx.position.qty <= 0 && breakoutBuy) {
      return {
        action: "BUY",
        stopLoss: zone.zoneLow - atr,
        target: closes[i] + Math.max(zone.range * 2.5, atr * 4),
        confidence: 0.75,
        reason: "Weekly bull momentum breakout — weekly expiry bias",
      };
    }
    if (ctx.position.qty >= 0 && breakoutSell) {
      return {
        action: "SELL",
        stopLoss: zone.zoneHigh + atr,
        target: closes[i] - Math.max(zone.range * 2.5, atr * 4),
        confidence: 0.75,
        reason: "Weekly bear momentum breakdown — weekly expiry bias",
      };
    }
    return { action: "HOLD" };
  },
};

const trendlineBreakout: Strategy = {
  id: "trendline_breakout",
  name: "Trendline Breakout",
  description: "Trade the first clean breakout after gap and trendline formation, with tight stops and high reward potential.",
  warmup: 30,
  step(ctx) {
    const closes = ctx.bars.map((b) => b.close);
    const highs = ctx.bars.map((b) => b.high);
    const lows = ctx.bars.map((b) => b.low);
    const i = ctx.i;
    if (i < 30) return { action: "HOLD" };

    const gapUp = lows[i] > closes[i - 1] * 1.002;
    const gapDown = highs[i] < closes[i - 1] * 0.998;
    if (!gapUp && !gapDown) return { action: "HOLD" };

    const recentLows = lows.slice(i - 10, i);
    const recentHighs = highs.slice(i - 10, i);
    const tlLow = Math.min(...recentLows);
    const tlHigh = Math.max(...recentHighs);
    const breakoutBuy = gapUp && closes[i] > tlHigh;
    const breakoutSell = gapDown && closes[i] < tlLow;
    const atr = Math.max(1, (tlHigh - tlLow) * 0.35);
    if (ctx.position.qty <= 0 && breakoutBuy) {
      return {
        action: "BUY",
        stopLoss: Math.max(tlLow - atr, closes[i] - (tlHigh - tlLow) * 0.5),
        target: closes[i] + Math.max((tlHigh - tlLow) * 3, atr * 4),
        confidence: 0.65,
        reason: "Trendline breakout after gap-up",
      };
    }
    if (ctx.position.qty >= 0 && breakoutSell) {
      return {
        action: "SELL",
        stopLoss: Math.min(tlHigh + atr, closes[i] + (tlHigh - tlLow) * 0.5),
        target: closes[i] - Math.max((tlHigh - tlLow) * 3, atr * 4),
        confidence: 0.65,
        reason: "Trendline breakdown after gap-down",
      };
    }
    return { action: "HOLD" };
  },
};

export const STRATEGIES: Record<string, Strategy> = {
  [smaCrossover.id]: smaCrossover,
  [rsiMeanReversion.id]: rsiMeanReversion,
  [donchianBreakout.id]: donchianBreakout,
  [gannFan.id]: gannFan,
  [gtiMomentum.id]: gtiMomentum,
  [ghostPullback.id]: ghostPullback,
  [ghostBreakout.id]: ghostBreakout,
  [accumulationBreakout.id]: accumulationBreakout,
  [candlePsychology.id]: candlePsychology,
  [compressionBreakout.id]: compressionBreakout,
  [orderBlockBreakout.id]: orderBlockBreakout,
  [weeklyExpiryMomentum.id]: weeklyExpiryMomentum,
  [trendlineBreakout.id]: trendlineBreakout,
  [multiTimeframeTrend.id]: multiTimeframeTrend,
  [trendConfirmation.id]: trendConfirmation,
  [mtfSupportResistanceBreakout.id]: mtfSupportResistanceBreakout,
  // Options strategies
  [optionsGreeksIV.id]: optionsGreeksIV,
  [optionsThetaDecay.id]: optionsThetaDecay,
  [optionsStraddle.id]: optionsStraddle,
  // Elliott Wave strategies
  [elliottWaveTrend.id]: elliottWaveTrend,
  [elliottWaveReversal.id]: elliottWaveReversal,
  [wave3Momentum.id]: wave3Momentum,
  // Institutional-grade system
  [institutionalGradeIndicator.id]: institutionalGradeIndicator,
};

export function getStrategy(id: string): Strategy | null {
  return STRATEGIES[id] ?? null;
}

export function listStrategies(): { id: string; name: string; description: string }[] {
  return Object.values(STRATEGIES).map((s) => ({ id: s.id, name: s.name, description: s.description }));
}
