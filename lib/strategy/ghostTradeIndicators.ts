/**
 * Ghost Trade Indicators & ATR-based Buy/Sell Signals
 *
 * Ghost Trade = Price action patterns:
 *   1. Move above (or below) a level
 *   2. Pullback/rejection without breaking that level
 *   3. Re-confirm the level (breakout again)
 *
 * ATR-based signals:
 *   - Buy when price breaks above (20-period EMA + 1.5× ATR)
 *   - Sell when price breaks below (20-period EMA - 1.5× ATR)
 */

import type { Bar, Strategy, StrategyContext } from "./Strategy";
import { ema, rsi, sma, highest, lowest } from "./Strategy";

// ─────────────────────────────────────────────────────────────────────────────
// ATR Calculation
// ─────────────────────────────────────────────────────────────────────────────

function atr(highs: number[], lows: number[], closes: number[], period: number, idx: number): number | null {
  if (idx < period) return null;

  let trSum = 0;
  for (let i = idx - period + 1; i <= idx; i++) {
    const high = highs[i];
    const low = lows[i];
    const prevClose = i > 0 ? closes[i - 1] : closes[i];

    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trSum += tr;
  }

  return trSum / period;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ghost Trade Pattern Detection
// ─────────────────────────────────────────────────────────────────────────────

interface GhostTradeSetup {
  isValid: boolean;
  level: number;           // The level being confirmed
  breakoutDirection: "up" | "down" | null;
  pullbackDepth: number;   // How far price pulled back (0-1, where 1 = full reversal)
  reconfirmationStrength: number; // How strong is the re-confirmation (0-1)
  confidence: number;      // Overall setup confidence
}

function detectGhostTrade(
  highs: number[],
  lows: number[],
  closes: number[],
  idx: number,
  lookback: number = 10
): GhostTradeSetup {
  if (idx < lookback + 5) {
    return { isValid: false, level: 0, breakoutDirection: null, pullbackDepth: 0, reconfirmationStrength: 0, confidence: 0 };
  }

  const currentClose = closes[idx];
  const prevClose = closes[idx - 1];

  // Look back for a breakout level (high or low)
  const recentHighs = highs.slice(idx - lookback, idx);
  const recentLows = lows.slice(idx - lookback, idx);

  const breakoutHigh = Math.max(...recentHighs);
  const breakoutLow = Math.min(...recentLows);

  // Check if we broke above recently but are now in pullback
  const brokeAbove = recentHighs.slice(-5).some((h) => h > breakoutHigh * 0.99);
  const isPullingBack = currentClose < breakoutHigh && prevClose < breakoutHigh;
  const pullbackAmount = breakoutHigh - currentClose;
  const atrVal = atr(highs, lows, closes, 14, idx) || (breakoutHigh - breakoutLow) / 2;

  // Ghost Trade UP: broke above, pulled back, now re-confirming
  if (brokeAbove && isPullingBack && pullbackAmount < atrVal * 1.5) {
    const pullbackDepth = pullbackAmount / atrVal;
    const reconfirmationStrength = currentClose > breakoutHigh * 0.98 ? 1 : 0.7;

    return {
      isValid: true,
      level: breakoutHigh,
      breakoutDirection: "up",
      pullbackDepth,
      reconfirmationStrength,
      confidence: Math.min(1, pullbackDepth * reconfirmationStrength),
    };
  }

  // Ghost Trade DOWN: broke below, pulled back, now re-confirming
  const brokeBelowVal = recentLows.slice(-5).some((l) => l < breakoutLow * 1.01);
  const isPullingBackUp = currentClose > breakoutLow && prevClose > breakoutLow;
  const pullbackAmountDown = currentClose - breakoutLow;

  if (brokeBelowVal && isPullingBackUp && pullbackAmountDown < atrVal * 1.5) {
    const pullbackDepth = pullbackAmountDown / atrVal;
    const reconfirmationStrength = currentClose < breakoutLow * 1.02 ? 1 : 0.7;

    return {
      isValid: true,
      level: breakoutLow,
      breakoutDirection: "down",
      pullbackDepth,
      reconfirmationStrength,
      confidence: Math.min(1, pullbackDepth * reconfirmationStrength),
    };
  }

  return { isValid: false, level: 0, breakoutDirection: null, pullbackDepth: 0, reconfirmationStrength: 0, confidence: 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategy: Ghost Trade Pro (ATR + Pattern)
// ─────────────────────────────────────────────────────────────────────────────

export const ghostTradePro: Strategy = {
  id: "ghost_trade_pro",
  name: "Ghost Trade Pro (ATR Breakout)",
  description:
    "Detects Ghost Trade patterns (breakout + pullback + re-confirmation) combined with ATR bands for entry/exit.",
  warmup: 50,
  step(ctx: StrategyContext) {
    const i = ctx.i;
    if (i < 50) return { action: "HOLD" };

    const highs = ctx.bars.map((b) => b.high);
    const lows = ctx.bars.map((b) => b.low);
    const closes = ctx.bars.map((b) => b.close);
    const volumes = ctx.bars.map((b) => b.volume);

    const price = closes[i];
    const e20 = ema(closes, 20, i);
    const atrVal = atr(highs, lows, closes, 14, i);

    if (!e20 || !atrVal) return { action: "HOLD" };

    // Calculate ATR bands
    const upperBand = e20 + atrVal * 1.5;
    const lowerBand = e20 - atrVal * 1.5;

    // Detect Ghost Trade
    const ghost = detectGhostTrade(highs, lows, closes, i, 10);

    // ─── BUY Signal ────────────────────────────────────────────
    if (ctx.position.qty <= 0 && price > upperBand && ghost.breakoutDirection === "up" && ghost.isValid) {
      const stop = Math.min(lowerBand, ghost.level * 0.98);
      const target = upperBand + atrVal;

      return {
        action: "BUY",
        confidence: Math.min(1, ghost.confidence * 0.9),
        reason: `Ghost Trade UP: Broke above ₹${ghost.level.toFixed(2)}, pulled back, re-confirming. Price > ATR-based upper band (${upperBand.toFixed(2)})`,
        price: price,
        stopLoss: stop,
        target: target,
      };
    }

    // ─── SELL Signal ────────────────────────────────────────────
    if (ctx.position.qty >= 0 && price < lowerBand && ghost.breakoutDirection === "down" && ghost.isValid) {
      const stop = Math.max(upperBand, ghost.level * 1.02);
      const target = lowerBand - atrVal;

      if (ctx.position.qty > 0) {
        return {
          action: "EXIT",
          reason: `Ghost Trade DOWN reversal: Price broke below ATR-based lower band (${lowerBand.toFixed(2)})`,
        };
      } else {
        return {
          action: "SELL",
          confidence: Math.min(1, ghost.confidence * 0.9),
          reason: `Ghost Trade DOWN: Broke below ₹${ghost.level.toFixed(2)}, pulled back, re-confirming. Price < ATR-based lower band (${lowerBand.toFixed(2)})`,
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
// Strategy: ATR-Based Buy/Sell Guide (Simpler version)
// ─────────────────────────────────────────────────────────────────────────────

export const atrBuySellGuide: Strategy = {
  id: "atr_buy_sell_guide",
  name: "ATR Buy/Sell Guide",
  description: "Simple ATR breakout signals: Buy above EMA20+1.5×ATR, Sell below EMA20-1.5×ATR.",
  warmup: 50,
  step(ctx: StrategyContext) {
    const i = ctx.i;
    if (i < 50) return { action: "HOLD" };

    const highs = ctx.bars.map((b) => b.high);
    const lows = ctx.bars.map((b) => b.low);
    const closes = ctx.bars.map((b) => b.close);

    const price = closes[i];
    const prevPrice = i > 0 ? closes[i - 1] : price;
    const e20 = ema(closes, 20, i);
    const atrVal = atr(highs, lows, closes, 14, i);

    if (!e20 || !atrVal) return { action: "HOLD" };

    const upperBand = e20 + atrVal * 1.5;
    const lowerBand = e20 - atrVal * 1.5;
    const midBand = e20;

    // ─── BUY Signal ────────────────────────────────────────────
    if (ctx.position.qty <= 0 && price > upperBand && prevPrice <= upperBand) {
      // Breakout above upper band
      const stop = lowerBand;
      const target = price + atrVal * 2;

      return {
        action: "BUY",
        confidence: 0.65,
        reason: `ATR Breakout UP: Price broke above EMA20 + 1.5×ATR (₹${upperBand.toFixed(2)}). EMA20: ${e20.toFixed(2)}, ATR: ${atrVal.toFixed(2)}`,
        price: price,
        stopLoss: stop,
        target: target,
      };
    }

    // ─── SELL Signal ────────────────────────────────────────────
    if (ctx.position.qty >= 0 && price < lowerBand && prevPrice >= lowerBand) {
      // Breakdown below lower band
      if (ctx.position.qty > 0) {
        return {
          action: "EXIT",
          reason: `ATR Breakdown: Price broke below EMA20 - 1.5×ATR (₹${lowerBand.toFixed(2)})`,
        };
      } else {
        const stop = upperBand;
        const target = price - atrVal * 2;

        return {
          action: "SELL",
          confidence: 0.65,
          reason: `ATR Breakdown: Price broke below EMA20 - 1.5×ATR (₹${lowerBand.toFixed(2)}). EMA20: ${e20.toFixed(2)}, ATR: ${atrVal.toFixed(2)}`,
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
// Strategy: Ghost Trade Zones for Options (adapted for options Greeks)
// ─────────────────────────────────────────────────────────────────────────────

export const ghostTradeOptionsZones: Strategy = {
  id: "ghost_trade_options_zones",
  name: "Ghost Trade Zones for Options",
  description:
    "Ghost Trade patterns applied to options: Buy calls/puts when Ghost Trade level is confirmed, exit on zone breaks.",
  warmup: 50,
  step(ctx: StrategyContext) {
    const i = ctx.i;
    if (i < 50) return { action: "HOLD" };

    const highs = ctx.bars.map((b) => b.high);
    const lows = ctx.bars.map((b) => b.low);
    const closes = ctx.bars.map((b) => b.close);

    const ghost = detectGhostTrade(highs, lows, closes, i, 8);
    const e20 = ema(closes, 20, i);
    const atrVal = atr(highs, lows, closes, 10, i);

    if (!ghost.isValid || !atrVal) return { action: "HOLD" };

    const price = closes[i];

    // ─── BUY Call (on UP ghost trade) ───────────────────────────
    if (ghost.breakoutDirection === "up" && price > ghost.level && ghost.pullbackDepth > 0.3) {
      const stop = ghost.level * 0.98;
      const target = ghost.level + atrVal * 2;

      return {
        action: "BUY",
        confidence: ghost.confidence,
        reason: `Ghost Trade Call: Confirmed level at ₹${ghost.level.toFixed(2)}, pullback ${(ghost.pullbackDepth * 100).toFixed(0)}%`,
        price: price,
        stopLoss: stop,
        target: target,
      };
    }

    // ─── BUY Put (on DOWN ghost trade) ──────────────────────────
    if (ghost.breakoutDirection === "down" && price < ghost.level && ghost.pullbackDepth > 0.3) {
      const stop = ghost.level * 1.02;
      const target = ghost.level - atrVal * 2;

      return {
        action: "SELL",
        confidence: ghost.confidence,
        reason: `Ghost Trade Put: Confirmed level at ₹${ghost.level.toFixed(2)}, pullback ${(ghost.pullbackDepth * 100).toFixed(0)}%`,
        price: price,
        stopLoss: stop,
        target: target,
      };
    }

    return { action: "HOLD" };
  },
};
