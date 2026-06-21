/**
 * Options-specific indicators using Greeks, IV Crush, and time decay.
 * For options on NIFTY, BANKNIFTY, stocks, etc.
 *
 * Key concepts:
 *   - Delta: How much option price moves with underlying
 *   - Theta: Time decay (negative for long options = bad, positive for shorts = good)
 *   - Vega: IV sensitivity (rise in volatility = gain, drop = loss for long)
 *   - IV Crush: Drop in implied volatility after earnings/events
 */

import type { Bar, Strategy, StrategyContext } from "./Strategy";
import { ema, rsi, sma, highest, lowest } from "./Strategy";
import type { SymbolInfo } from "./symbolDetector";
import { parseSymbol } from "./symbolDetector";

// ─────────────────────────────────────────────────────────────────────────────
// Simple Greeks Calculator (simplified, not actual Black-Scholes)
// ─────────────────────────────────────────────────────────────────────────────

interface GreeksEstimate {
  delta: number;          // 0-1, change in option price per $ move in underlying
  theta: number;          // Time decay per day
  vega: number;           // IV sensitivity
  gammaSign: number;      // Gamma direction (+1 = long gamma, -1 = short)
  estimatedFairValue: number;  // Simple estimate
}

function estimateGreeks(
  underlyingPrice: number,
  strikePrice: number,
  daysToExpiry: number,
  underlyingVolatility: number,
  riskFreeRate: number = 0.06,
  isCall: boolean = true
): GreeksEstimate {
  // Moneyness
  const moneyness = isCall ? underlyingPrice / strikePrice : strikePrice / underlyingPrice;
  const isITM = moneyness > 1;
  const isOTM = moneyness < 1;
  const isATM = Math.abs(moneyness - 1) < 0.02;

  // Simplified Delta
  let delta = 0.5; // ATM
  if (isCall) {
    if (isITM) delta = 0.5 + Math.min(0.4, (moneyness - 1) * 0.5); // 0.5-0.9
    if (isOTM) delta = 0.5 - Math.min(0.4, (1 - moneyness) * 0.5); // 0.1-0.5
  } else {
    if (isITM) delta = 0.5 - Math.min(0.4, (moneyness - 1) * 0.5); // 0.1-0.5
    if (isOTM) delta = 0.5 + Math.min(0.4, (1 - moneyness) * 0.5); // 0.5-0.9
  }

  // Simplified Theta (time decay)
  // OTM loses more time value than ITM
  const timeDecay = 1 / Math.sqrt(Math.max(1, daysToExpiry));
  const theta = isATM
    ? -0.05 * timeDecay    // ATM loses most per day
    : -0.03 * timeDecay;   // ITM/OTM loses less

  // Simplified Vega (IV sensitivity)
  // ATM options most sensitive to IV
  const vega = isATM ? 0.08 : 0.04;

  // Gamma sign
  const gammaSign = isATM ? 1 : -0.5; // Long gamma at ATM

  // Simple option value (European approximation)
  const intrinsicValue = isCall
    ? Math.max(0, underlyingPrice - strikePrice)
    : Math.max(0, strikePrice - underlyingPrice);

  // Time value component
  const timeValue = (underlyingVolatility * underlyingPrice * Math.sqrt(daysToExpiry / 365)) * 0.4;
  const estimatedFairValue = intrinsicValue + timeValue;

  return { delta, theta, vega, gammaSign, estimatedFairValue };
}

// ─────────────────────────────────────────────────────────────────────────────
// IV Crush Detection
// ─────────────────────────────────────────────────────────────────────────────

interface IVAnalysis {
  currentIV: number;        // 0-1 (implied volatility %)
  ivPercentile: number;     // Where IV ranks historically (0-100)
  ivTrend: "rising" | "falling" | "stable";
  ivForecast: "crush_risk" | "expansion_opportunity" | "neutral";
  rvi: number;              // Relative Volatility Index (RSI for volatility)
}

function analyzeIV(closes: number[], idx: number, lookback: number = 20): IVAnalysis {
  // Simplified IV from closing price volatility
  const recentCloses = closes.slice(Math.max(0, idx - lookback), idx + 1);
  const returns: number[] = [];
  for (let i = 1; i < recentCloses.length; i++) {
    returns.push((recentCloses[i] - recentCloses[i - 1]) / recentCloses[i - 1]);
  }

  const variance = returns.reduce((sum, r) => sum + r * r, 0) / Math.max(1, returns.length - 1);
  const currentIV = Math.sqrt(variance * 252) * 100; // Annualized volatility in %

  // IV Percentile (rank IV relative to 100-day history)
  const allCloses = closes.slice(Math.max(0, idx - 100), idx + 1);
  let ivSum = 0;
  const ivHistory: number[] = [];
  for (let i = 21; i < allCloses.length; i++) {
    const slice = allCloses.slice(i - 20, i);
    const sliceReturns = [];
    for (let j = 1; j < slice.length; j++) {
      sliceReturns.push((slice[j] - slice[j - 1]) / slice[j - 1]);
    }
    const sliceVar = sliceReturns.reduce((sum, r) => sum + r * r, 0) / sliceReturns.length;
    const iv = Math.sqrt(sliceVar * 252) * 100;
    ivHistory.push(iv);
  }

  const ivPercentile = ivHistory.length > 0
    ? (ivHistory.filter((iv) => iv <= currentIV).length / ivHistory.length) * 100
    : 50;

  // IV Trend
  let ivTrend: "rising" | "falling" | "stable" = "stable";
  if (ivHistory.length >= 2) {
    const recent = ivHistory.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const older = ivHistory.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
    if (recent > older * 1.05) ivTrend = "rising";
    if (recent < older * 0.95) ivTrend = "falling";
  }

  // IV Forecast (crush risk = high IV + expected fall; expansion = low IV + stability)
  let ivForecast: "crush_risk" | "expansion_opportunity" | "neutral" = "neutral";
  if (ivPercentile > 75 && ivTrend !== "rising") {
    ivForecast = "crush_risk";
  } else if (ivPercentile < 25 && ivTrend !== "falling") {
    ivForecast = "expansion_opportunity";
  }

  // RVI (RSI-like for volatility)
  let rvi = 50;
  if (ivHistory.length > 14) {
    let gainSum = 0,
      lossSum = 0;
    for (let i = ivHistory.length - 14; i < ivHistory.length; i++) {
      const change = ivHistory[i] - ivHistory[i - 1];
      if (change > 0) gainSum += change;
      else lossSum -= change;
    }
    const rs = gainSum / Math.max(1, lossSum);
    rvi = 100 - 100 / (1 + rs);
  }

  return { currentIV, ivPercentile, ivTrend, ivForecast, rvi };
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategy: Options Greeks & IV Crush
// ─────────────────────────────────────────────────────────────────────────────

export const optionsGreeksIV: Strategy = {
  id: "options_greeks_iv",
  name: "Options Greeks & IV Crush",
  description:
    "Uses Greeks (Delta, Theta, Vega) and IV crush detection for options trading. Sells call spreads on IV crush, buys straddles on low IV.",
  warmup: 50,
  step(ctx: StrategyContext) {
    const i = ctx.i;
    if (i < 50) return { action: "HOLD" };

    // Parse symbol to get strike info
    const symbolInfo = parseSymbol(ctx.symbol);
    if (symbolInfo.type !== "options_call" && symbolInfo.type !== "options_put") {
      return { action: "HOLD", reason: "Not an options symbol" };
    }

    const closes = ctx.bars.map((b) => b.close);
    const underlyingPrice = closes[i] * 1.0; // Assume closes are option price, multiply for strike context
    const strikePrice = symbolInfo.strikePrice || closes[i];
    const isCall = symbolInfo.type === "options_call";

    // Calculate Greeks
    const daysToExpiry = Math.max(1, 7); // Assume 1 week to expiry (would be calculated from expiry date)
    const greek = estimateGreeks(underlyingPrice, strikePrice, daysToExpiry, 0.25, 0.06, isCall);

    // Analyze IV
    const iv = analyzeIV(closes, i, 20);

    // ─── SELL (Short Call/Put) on IV Crush Risk ─────────────────
    if (ctx.position.qty <= 0 && iv.ivForecast === "crush_risk" && iv.ivPercentile > 80) {
      // High IV, expected to fall = sell premium
      const stop = closes[i] * (isCall ? 1.1 : 0.9); // Stop beyond strike
      const target = closes[i] * 0.8; // Aim for 20% of premium decay

      return {
        action: "SELL",
        confidence: Math.min(1, (iv.ivPercentile / 100) * 0.9),
        reason: `IV Crush Risk: IV at ${iv.ivPercentile.toFixed(0)}th percentile, selling premium. Delta: ${greek.delta.toFixed(2)}, Theta: ${greek.theta.toFixed(3)} (daily decay)`,
        price: closes[i],
        stopLoss: stop,
        target: target,
      };
    }

    // ─── BUY (Long Call/Put) on Low IV ────────────────────────
    if (ctx.position.qty >= 0 && iv.ivForecast === "expansion_opportunity" && iv.ivPercentile < 20) {
      // Low IV, expected to rise = buy volatility
      const stop = closes[i] * (isCall ? 0.9 : 1.1);
      const target = closes[i] * 1.3; // Aim for 30% move from IV expansion + directional

      return {
        action: "BUY",
        confidence: Math.min(1, ((100 - iv.ivPercentile) / 100) * 0.9),
        reason: `IV Expansion: IV at ${iv.ivPercentile.toFixed(0)}th percentile, buying volatility. Delta: ${greek.delta.toFixed(2)}, Theta: ${greek.theta.toFixed(3)} (daily decay)`,
        price: closes[i],
        stopLoss: stop,
        target: target,
      };
    }

    // ─── EXIT on Theta Decay (if holding long options) ──────────
    if (ctx.position.qty > 0 && daysToExpiry <= 2) {
      // Last 2 days to expiry = accelerated theta decay
      return {
        action: "EXIT",
        reason: `Theta Acceleration: ${daysToExpiry} days to expiry, theta decay accelerating at ${greek.theta.toFixed(3)}/day`,
      };
    }

    // ─── EXIT on IV Expansion (if short premium) ───────────────
    if (ctx.position.qty < 0 && iv.ivTrend === "rising" && iv.ivPercentile > 60) {
      // IV rising = bad for short premium sellers
      return {
        action: "EXIT",
        reason: `IV Expansion Risk: IV rising (${iv.ivTrend}), now at ${iv.ivPercentile.toFixed(0)}th percentile`,
      };
    }

    return { action: "HOLD", reason: "Waiting for IV extremes or Greeks setup" };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Strategy: Options Theta Decay (Sell Premium)
// ─────────────────────────────────────────────────────────────────────────────

export const optionsThetaDecay: Strategy = {
  id: "options_theta_decay",
  name: "Options Theta Decay (Premium Seller)",
  description:
    "Sells out-of-the-money (OTM) options to profit from time decay. Exits on profit target or DTE=2.",
  warmup: 50,
  step(ctx: StrategyContext) {
    const i = ctx.i;
    if (i < 50) return { action: "HOLD" };

    const symbolInfo = parseSymbol(ctx.symbol);
    if (symbolInfo.type !== "options_call" && symbolInfo.type !== "options_put") {
      return { action: "HOLD" };
    }

    const closes = ctx.bars.map((b) => b.close);
    const price = closes[i];
    const rsiVal = rsi(closes, 14, i) || 50;
    const e20 = ema(closes, 20, i) || price;

    // ─── SELL OTM Options ──────────────────────────────────────
    if (ctx.position.qty <= 0) {
      const canSell = symbolInfo.type === "options_call"
        ? price < e20 // Sell calls if below EMA (expecting downside)
        : price > e20; // Sell puts if above EMA (expecting upside)

      if (canSell && rsiVal > 40 && rsiVal < 70) {
        // Neutral to slightly directional = good for selling OTM
        const risk = price * 0.05; // 5% of premium as max loss
        const target = price * 0.2; // Target 20% profit from decay

        return {
          action: "SELL",
          confidence: 0.65,
          reason: `Selling ${symbolInfo.type} for theta decay. Price: ${price.toFixed(2)}, RSI: ${rsiVal.toFixed(0)}`,
          price: price,
          stopLoss: price + risk,
          target: price - (price * 0.2),
        };
      }
    }

    return { action: "HOLD" };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Strategy: Options Straddle (Long Both Call & Put)
// ─────────────────────────────────────────────────────────────────────────────

export const optionsStraddle: Strategy = {
  id: "options_straddle",
  name: "Options Straddle (IV Expansion Play)",
  description:
    "Buys ATM call and put together to profit from price or volatility expansion. Exits on 30% profit or if IV drops.",
  warmup: 50,
  step(ctx: StrategyContext) {
    const i = ctx.i;
    if (i < 50) return { action: "HOLD" };

    const symbolInfo = parseSymbol(ctx.symbol);
    if (symbolInfo.type !== "options_call" && symbolInfo.type !== "options_put") {
      return { action: "HOLD" };
    }

    const closes = ctx.bars.map((b) => b.close);
    const iv = analyzeIV(closes, i, 20);

    // Only relevant for calls (user would buy matching put separately)
    if (symbolInfo.type === "options_call" && iv.ivForecast === "expansion_opportunity" && iv.ivPercentile < 30) {
      // Low IV, buy straddle for expansion
      const price = closes[i];
      const straddleStrike = closes[i]; // ATM
      const target = price * 1.4; // 40% move from expansion
      const stop = price * 0.7; // Conservative stop

      return {
        action: "BUY",
        confidence: 0.7,
        reason: `Straddle setup: IV at ${iv.ivPercentile.toFixed(0)}th percentile (low), expecting expansion`,
        price: price,
        stopLoss: stop,
        target: target,
      };
    }

    return { action: "HOLD" };
  },
};
