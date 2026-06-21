/**
 * Strike Price & Options Formatting Utilities
 * Expert-grade precision formatting for NSE/BSE/MCX options strikes
 * Handles fractional strikes, precise rounding, and localized display
 */

/**
 * Format a strike price for display with proper precision
 * Handles fractional strikes (e.g., 2.5 for stocks) and integer strikes (indices)
 */
export function formatStrikePrice(price: number, fractional = false): string {
  if (!Number.isFinite(price)) return '—';
  
  if (fractional) {
    // Stocks can have fractional strikes (e.g., 2.5, 5, 7.5, 10...)
    const decimals = (price % 1 !== 0) ? 1 : 0;
    return price.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  } else {
    // Indices use integer strikes
    return Math.round(price).toLocaleString('en-IN');
  }
}

/**
 * Format premium/LTP with standardize precision (₹X.XX format)
 */
export function formatPremium(premium: number): string {
  if (!Number.isFinite(premium) || premium <= 0) return '—';
  return '₹' + premium.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format open interest with human-readable scale (1.2K, 15.5M, etc.)
 */
export function formatOpenInterest(oi: number): string {
  if (!Number.isFinite(oi) || oi === 0) return '—';
  if (oi >= 1_000_000) return (oi / 1_000_000).toFixed(1) + 'M';
  if (oi >= 1_000) return (oi / 1_000).toFixed(1) + 'K';
  return oi.toString();
}

/**
 * Format implied volatility as percentage
 */
export function formatIV(iv: number | null): string {
  if (iv == null || !Number.isFinite(iv)) return '—';
  return iv.toFixed(2) + '%';
}

/**
 * Format Greeks (delta, gamma, theta, vega, rho)
 */
export function formatGreek(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '——';
  const abs = Math.abs(value);
  if (abs < 0.01) return '0.00';
  const sign = value < 0 ? '−' : '';
  return sign + abs.toFixed(2);
}

/**
 * Format P&L with color/sign indicator
 */
export function formatPnL(pnl: number | null, pct: number | null = null): {
  text: string;
  color: string;
  emoji: string;
} {
  if (pnl == null || !Number.isFinite(pnl)) {
    return { text: '—', color: '#94a3b8', emoji: '—' };
  }

  const sign = pnl >= 0 ? '+' : '−';
  const emoji = pnl > 500 ? '🟢' : pnl > 0 ? '📈' : pnl < -500 ? '🔴' : '📉';
  const color = pnl > 0 ? '#34d399' : '#f87171';
  const pctText = pct != null ? ` (${pct > 0 ? '+' : ''}${pct.toFixed(2)}%)` : '';

  return {
    text: `${sign}₹${Math.abs(Math.round(pnl)).toLocaleString('en-IN')}${pctText}`,
    color,
    emoji,
  };
}

/**
 * Format a strike range for display
 * E.g., "22100 - 22200" or "500.00 - 525.00"
 */
export function formatStrikeRange(
  minStrike: number,
  maxStrike: number,
  fractional = false
): string {
  return `${formatStrikePrice(minStrike, fractional)} — ${formatStrikePrice(maxStrike, fractional)}`;
}

/**
 * Calculate and display optimal strike suggestion with reasoning
 */
export function suggestOptimalStrike(
  spot: number,
  step: number,
  atmPremium: number,
  targetRiskReward: number = 2.5,
  isCall = true
): {
  strike: number;
  premium: number;
  reasoning: string;
  riskReward: string;
} {
  // OTM by ~1-2% (best risk/reward for intraday)
  const otmPercentage = 0.015; // 1.5%
  const targetPremium = atmPremium * 0.6; // Typically OTM premiums are 50-70% of ATM
  
  const otmStrike = isCall
    ? Math.ceil((spot * (1 + otmPercentage)) / step) * step
    : Math.floor((spot * (1 - otmPercentage)) / step) * step;

  const reasoning = isCall
    ? `${spot > otmStrike ? '1-2% OTM CE' : 'Near ATM CE'} offers risk/reward ~1:${targetRiskReward.toFixed(1)}`
    : `${spot < otmStrike ? '1-2% OTM PE' : 'Near ATM PE'} offers risk/reward ~1:${targetRiskReward.toFixed(1)}`;

  return {
    strike: otmStrike,
    premium: targetPremium,
    reasoning,
    riskReward: `1:${targetRiskReward.toFixed(1)}`,
  };
}

/**
 * Validate if a strike price is on the listed strikes grid for a symbol
 */
export function isValidListing(strike: number, step: number, tolerance = 0.01): boolean {
  const remainder = strike % step;
  return remainder < tolerance || Math.abs(remainder - step) < tolerance;
}

/**
 * Round a price to nearest displayable decimals based on price level
 */
export function roundForDisplay(price: number): number {
  if (price < 1) return Math.round(price * 10000) / 10000; // Up to 4 decimals
  if (price < 10) return Math.round(price * 1000) / 1000;  // Up to 3 decimals
  if (price < 100) return Math.round(price * 100) / 100;   // Up to 2 decimals
  return Math.round(price);
}
