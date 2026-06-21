/**
 * Symbol-aware indicator selector.
 * Detects asset type (equity, index, options, futures) and returns appropriate indicator strategies.
 */

export type AssetType = "equity" | "index" | "options_call" | "options_put" | "futures" | "unknown";

export interface SymbolInfo {
  symbol: string;
  base: string;                // Base symbol (e.g., "NIFTY" from "NIFTY23JUN25000CE")
  type: AssetType;
  strikePrice?: number;        // For options
  expiry?: string;             // For options (e.g., "23JUN25")
  isCall?: boolean;            // For options
  isPut?: boolean;             // For options
  underlying?: string;         // For options (what it's based on)
}

/**
 * Parse symbol and detect asset type.
 * Supports:
 *   - Equity: TCS, SBIN, INFY
 *   - Index: NIFTY, BANKNIFTY, FINNIFTY
 *   - Options: NIFTY23JUN25000CE, BANKNIFTY25000PE, etc.
 *   - Futures: NIFTY-JUN25, BTC-JUN25
 */
export function parseSymbol(symbol: string): SymbolInfo {
  const upperSymbol = symbol.toUpperCase();

  // ─── Detect Options ─────────────────────────────────────────────
  // Pattern: NIFTY23JUN25000CE or BANKNIFTY25000PE or NIFTY-JUN-25000-CE
  const optionsPattern =
    /^([A-Z]+?)([\dA-Z]+?)([0-9]+)(CE|PE|CALL|PUT)$/i;
  const optionsMatch = upperSymbol.match(optionsPattern);

  if (optionsMatch) {
    const [, base, expiry, strike, type] = optionsMatch;
    const isCall = type.toUpperCase() === "CE" || type.toUpperCase() === "CALL";
    const isPut = type.toUpperCase() === "PE" || type.toUpperCase() === "PUT";

    return {
      symbol: upperSymbol,
      base: base.trim(),
      type: isCall ? "options_call" : "options_put",
      strikePrice: parseInt(strike),
      expiry: expiry,
      isCall,
      isPut,
      underlying: base,
    };
  }

  // ─── Detect Futures ─────────────────────────────────────────────
  // Pattern: NIFTY-JUN25, BTC-JUN25, BANKNIFTY-SEP25
  if (upperSymbol.includes("-") && /[A-Z]+-[A-Z0-9]+/.test(upperSymbol)) {
    const parts = upperSymbol.split("-");
    return {
      symbol: upperSymbol,
      base: parts[0],
      type: "futures",
      underlying: parts[0],
    };
  }

  // ─── Detect Index ──────────────────────────────────────────────
  const indexNames = [
    "NIFTY",
    "BANKNIFTY",
    "FINNIFTY",
    "MIDCPNIFTY",
    "NIFTYJR",
    "NIFTYIT",
    "NIFTYPS",
    "NIFTYPHARMACY",
    "NIFTYINFRA",
    "NIFTYPSE",
    "NIFTYPVT",
    "NIFTYCONSUMER",
    "NIFTYPSU",
    "NIFTYFMCG",
    "NIFTYAUTO",
    "NIFTYBANK",
    "NIFTYPRIVATE",
    "SENSEX",
    "BANKEX",
  ];

  if (indexNames.some((idx) => upperSymbol.startsWith(idx))) {
    return {
      symbol: upperSymbol,
      base: upperSymbol,
      type: "index",
    };
  }

  // ─── Detect Equity ─────────────────────────────────────────────
  // Any other symbol (3-8 chars, all letters)
  if (/^[A-Z]{2,8}$/.test(upperSymbol)) {
    return {
      symbol: upperSymbol,
      base: upperSymbol,
      type: "equity",
    };
  }

  return {
    symbol: upperSymbol,
    base: upperSymbol,
    type: "unknown",
  };
}

/**
 * Get recommended indicator strategy for a symbol.
 */
export function getRecommendedStrategy(symbol: string): string {
  const info = parseSymbol(symbol);

  switch (info.type) {
    case "options_call":
    case "options_put":
      // Options use IV, Greeks, and time decay
      return "options_greeks_iv";

    case "futures":
      // Futures use continuation patterns and volume
      return "futures_momentum";

    case "index":
      // Index uses multi-timeframe trend + zones
      return "multi_timeframe_trend";

    case "equity":
      // Equity uses multi-timeframe trend
      return "multi_timeframe_trend";

    default:
      return "multi_timeframe_trend";
  }
}

/**
 * Check if trading hours are active for the symbol's market.
 */
export function isTradingHours(symbolInfo: SymbolInfo, date: Date = new Date()): boolean {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const dayOfWeek = date.getDay(); // 0 = Sunday, 5 = Friday

  // Skip weekends
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;

  switch (symbolInfo.type) {
    case "options_call":
    case "options_put":
    case "index":
    case "equity":
      // Indian markets: 9:15 AM - 3:30 PM IST
      const timeInMinutes = hours * 60 + minutes;
      return timeInMinutes >= 9 * 60 + 15 && timeInMinutes <= 15 * 60 + 30;

    case "futures":
      // Futures: 24/5 (closed Sunday-Monday opening)
      // Crypto: 24/5
      if (symbolInfo.base.includes("BTC") || symbolInfo.base.includes("ETH")) {
        return dayOfWeek >= 1; // Monday - Saturday
      }
      // Regular futures: 9:15 AM - 11:55 PM IST
      const futuresTime = hours * 60 + minutes;
      return futuresTime >= 9 * 60 + 15 && futuresTime <= 23 * 60 + 55;

    default:
      return true;
  }
}

/**
 * Get margin requirement percentage for leverage calculations.
 */
export function getMarginRequirement(symbolInfo: SymbolInfo): number {
  switch (symbolInfo.type) {
    case "options_call":
    case "options_put":
      // Options: typically 10-15% margin on premium
      return 0.12;

    case "futures":
      // Crypto futures: 5-10%
      if (symbolInfo.base.includes("BTC") || symbolInfo.base.includes("ETH")) {
        return 0.1;
      }
      // Index futures: 3-5%
      return 0.04;

    case "index":
    case "equity":
      // Equities: 20-25% (some can be lower on MIS)
      return 0.25;

    default:
      return 0.25;
  }
}

/**
 * Get typical position size for symbol type (based on leverage).
 */
export function getTypicalLotSize(symbolInfo: SymbolInfo): number {
  switch (symbolInfo.type) {
    case "options_call":
    case "options_put":
      return 100; // 1 lot = 100 contracts

    case "futures":
      // Index futures: 25-50 units
      // Crypto futures: varies
      if (symbolInfo.base.includes("NIFTY")) return 25;
      if (symbolInfo.base.includes("BTC")) return 1;
      return 10;

    case "index":
      // Index options: 100 contracts per lot
      return 100;

    case "equity":
      // Equity: no standard lot
      return 1;

    default:
      return 1;
  }
}
