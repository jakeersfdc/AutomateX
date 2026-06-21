# Symbol-Aware Indicator System Guide

## Overview
ProfitForce now has a **symbol-aware indicator routing system** that automatically detects the asset type (equity, index, options, futures) and selects the most appropriate trading indicator strategy.

## Auto-Detection & Routing

### How It Works

When you provide a trading symbol, the system:
1. **Parses the symbol** to detect its type
2. **Selects the best strategy** for that asset class
3. **Validates trading hours** (don't trade outside market hours)
4. **Calculates appropriate position sizing** (based on margin requirements)

### Symbol Detection Patterns

#### Options
```
NIFTY23JUN25000CE   → NIFTY Call, June expiry, 25000 strike
BANKNIFTY25000PE    → BANKNIFTY Put, 25000 strike
NIFTY-JUN-25000-CE  → Alternative format supported
```
→ **Strategy**: `options_greeks_iv` (Greeks + IV Crush analysis)

#### Futures
```
NIFTY-JUN25         → NIFTY Futures, June 2025
BTC-JUN25           → Bitcoin Futures, June 2025
BANKNIFTY-SEP25     → Bank Nifty Futures, September 2025
```
→ **Strategy**: `ghost_trade_pro` (ATR breakouts + Ghost Trade patterns)

#### Indices
```
NIFTY               → NIFTY 50 Index
BANKNIFTY           → NIFTY Bank Index
FINNIFTY            → Financial Services Index
MIDCPNIFTY          → Midcap 50 Index
SENSEX              → BSE Sensex
```
→ **Strategy**: `multi_timeframe_trend` (EMA + RSI + ADX + zones)

#### Equities
```
TCS                 → Tata Consultancy Services
SBIN                → State Bank of India
INFY                → Infosys
```
→ **Strategy**: `multi_timeframe_trend` (Multi-timeframe trend + support/resistance zones)

---

## Available Indicator Strategies

### Options-Specific

#### 1. **Options Greeks & IV Crush** (`options_greeks_iv`)
- **Use Case**: Short premium selling, IV crush trades
- **Signals**:
  - **SELL**: High IV (>80th percentile) + expected crush → Sell calls/puts
  - **BUY**: Low IV (<20th percentile) + expansion expected → Buy straddles
  - **EXIT**: IV rising (bad for shorts) or 2 days to expiry
- **Metrics**:
  - Delta (0-1): How much option price moves with underlying
  - Theta (negative): Time decay loss for long options
  - Vega: Sensitivity to volatility changes
  - IV Percentile: Where current IV ranks historically

#### 2. **Theta Decay Seller** (`options_theta_decay`)
- **Use Case**: Selling OTM options for steady theta income
- **Signal**: SELL when price away from strike + neutral RSI
- **Exit**: 20% profit target reached

#### 3. **Options Straddle** (`options_straddle`)
- **Use Case**: Volatility expansion plays before earnings
- **Signal**: BUY both call & put when IV at extremes (low rank)
- **Profit**: 30-40% from IV expansion + directional move

---

### Futures & Index

#### 1. **Ghost Trade Pro** (`ghost_trade_pro`)
- **Use Case**: Momentum breakouts with confirmation
- **Pattern**: 
  1. Price breaks above level
  2. Pullback/rejection of the break
  3. Re-confirmation (re-test)
- **Signal**: BUY when re-confirming above EMA20 + 1.5×ATR
- **Stop Loss**: Below lower ATR band
- **Profit Target**: Upper band + 2×ATR

#### 2. **ATR Buy/Sell Guide** (`atr_buy_sell_guide`)
- **Use Case**: Simple ATR-based breakout trading
- **Buy Signal**: Price breaks above EMA20 + 1.5×ATR
- **Sell Signal**: Price breaks below EMA20 - 1.5×ATR
- **Best For**: Trending markets, 15-min to 1-hour charts

#### 3. **Ghost Trade Zones for Options** (`ghost_trade_options_zones`)
- **Use Case**: Adapting Ghost Trade patterns to options
- **Buy Call**: Up pattern confirmed + pullback >30%
- **Buy Put**: Down pattern confirmed + pullback >30%
- **Exit**: Break of Ghost Trade level

---

### Multi-Timeframe & Classic

#### 1. **Multi-Timeframe Trend** (`multi_timeframe_trend`)
- **Use Case**: Strongest signal type, ≥2/3 timeframe confluence
- **Timeframes**: 5min, 15min, 1hour, 4hour (stacked)
- **Entry**: 
  - **BUY**: Price above support zone + ≥2 timeframes bullish
  - **SELL**: Price below resistance zone + ≥2 timeframes bearish
- **Zone Types**:
  - **Support Zones** (S1, S2, S3): Demand clusters, bullish
  - **Resistance Zones** (R1, R2, R3): Supply clusters, bearish
- **Targets**: Resistance/Demand targets (3% projections)

#### 2. **Trend Confirmation** (`trend_confirmation`)
- **Use Case**: Simple EMA-based trend
- **Signal**: BUY when Price > EMA50 > EMA200

#### 3. **MTF Support/Resistance Breakout** (`mtf_sr_breakout`)
- **Use Case**: Zone breakout trading
- **Signal**: Break above resistance or below support with 2:1 reward

---

## Usage Examples

### Example 1: Trading NIFTY Options
```javascript
// Symbol: NIFTY23JUN25000CE (Call Option)
const symbol = "NIFTY23JUN25000CE";
const { getRecommendedStrategy, parseSymbol } = require("./lib/strategy/symbolDetector");

const info = parseSymbol(symbol);
// → {base: "NIFTY", type: "options_call", strike: 25000, expiry: "23JUN25"}

const strategyId = getRecommendedStrategy(symbol);
// → "options_greeks_iv"

// Run the strategy
const strategy = getStrategy(strategyId);
const signal = strategy.step(ctx); // Buy/Sell based on IV crush
```

### Example 2: Trading NIFTY Futures
```javascript
// Symbol: NIFTY-JUN25 (Futures)
const symbol = "NIFTY-JUN25";

const info = parseSymbol(symbol);
// → {base: "NIFTY", type: "futures"}

const strategyId = getRecommendedStrategy(symbol);
// → "ghost_trade_pro" or "atr_buy_sell_guide"

// Uses ATR breakouts + Ghost Trade patterns for momentum
```

### Example 3: Trading INFY Equity
```javascript
// Symbol: INFY (Stock)
const symbol = "INFY";

const info = parseSymbol(symbol);
// → {base: "INFY", type: "equity"}

const strategyId = getRecommendedStrategy(symbol);
// → "multi_timeframe_trend"

// Uses multi-timeframe support/resistance zones
```

### Example 4: Check Trading Hours
```javascript
import { parseSymbol, isTradingHours } from "./lib/strategy/symbolDetector";

const symbol = "NIFTY23JUN25000CE";
const info = parseSymbol(symbol);

const isOpen = isTradingHours(info); // true if 9:15 AM - 3:30 PM IST
```

---

## Integration Points

### 1. LiveRunner (Real-time Trading)
```typescript
// app/debug/[strategyId]/LiveRunner.ts
import { getRecommendedStrategy, parseSymbol } from "@/lib/strategy/symbolDetector";

// User provides symbol
const symbol = "NIFTY-JUN25";

// Auto-select strategy
const recommendedId = getRecommendedStrategy(symbol);
const strategy = getStrategy(recommendedId); // Get the strategy object

// Run strategy with bars
const signal = strategy.step(ctx);
```

### 2. Backtester
```typescript
// Add symbol-based strategy selection
if (!strategyId) {
  strategyId = getRecommendedStrategy(symbol);
}
```

### 3. API Endpoints
- `GET /api/strategy/snapshot?symbol=NIFTY-JUN25` → Auto-detects and returns signal
- `GET /api/strategy/backtest` → Uses symbol to select strategy

---

## Configuration & Customization

### Change Margin Requirements
```typescript
// symbolDetector.ts
export function getMarginRequirement(symbolInfo: SymbolInfo): number {
  switch (symbolInfo.type) {
    case "options_call":
    case "options_put":
      return 0.15; // Change from 12% to 15%
    case "futures":
      return 0.08; // Change from 10% to 8%
  }
}
```

### Add New Asset Type
```typescript
// symbolDetector.ts
function parseSymbol(symbol: string): SymbolInfo {
  // Add crypto pattern
  if (/^BTC|^ETH|^SOL/.test(symbol)) {
    return { symbol, type: "crypto", base: symbol };
  }
}

export function getRecommendedStrategy(symbol: string): string {
  if (info.type === "crypto") {
    return "futures_momentum"; // or custom crypto strategy
  }
}
```

---

## Testing the System

### Quick Test
```bash
# cd to project root
npm run dev

# In browser: http://localhost:3000/debug/strategies

# Test symbols:
# - NIFTY23JUN25000CE (option)
# - NIFTY-JUN25 (future)
# - NIFTY (index)
# - INFY (equity)
```

### Verify Strategy Selection
```javascript
// Browser console
const { parseSymbol, getRecommendedStrategy } = await import(
  "/lib/strategy/symbolDetector"
);

parseSymbol("NIFTY23JUN25000CE");     // options_call
getRecommendedStrategy("NIFTY23JUN25000CE");  // "options_greeks_iv"

parseSymbol("NIFTY-JUN25");           // futures
getRecommendedStrategy("NIFTY-JUN25"); // "ghost_trade_pro"
```

---

## Strategy Selection Matrix

| Asset Type | Symbol Example | Recommended Strategy | Secondary Options |
|---|---|---|---|
| **Options Call** | NIFTY23JUN25000CE | `options_greeks_iv` | `options_theta_decay` |
| **Options Put** | BANKNIFTY25000PE | `options_greeks_iv` | `options_straddle` |
| **Index Futures** | NIFTY-JUN25 | `ghost_trade_pro` | `atr_buy_sell_guide` |
| **Crypto Futures** | BTC-JUN25 | `ghost_trade_pro` | `atr_buy_sell_guide` |
| **Equity** | INFY | `multi_timeframe_trend` | `trendConfirmation` |
| **Index** | NIFTY | `multi_timeframe_trend` | `mtf_sr_breakout` |

---

## Troubleshooting

### Symbol Not Recognized
```javascript
const { type } = parseSymbol("UNKNOWN123");
// → type: "unknown"

// Will default to multi_timeframe_trend
getRecommendedStrategy("UNKNOWN123"); // → "multi_timeframe_trend"
```

### Wrong Strategy Selected
1. Check symbol format (e.g., NIFTY-JUN25 has hyphen for futures)
2. Verify it matches one of the patterns in `parseSymbol()`
3. Can manually override: `getStrategy("multi_timeframe_trend")`

### Trading Outside Market Hours
```javascript
const { isTradingHours, parseSymbol } = require("./symbolDetector");

const info = parseSymbol("NIFTY");
if (!isTradingHours(info)) {
  console.log("Market closed, signal ignored");
}
```

---

## Next Steps

1. **Integrate into LiveRunner**: Modify trading dashboard to auto-select indicators by symbol
2. **Add Greeks calculator**: Implement full Black-Scholes for more accurate options pricing
3. **Custom indicator combinations**: Let users choose indicator combos per symbol
4. **Backtesting**: Run backtests showing strategy performance per asset type
5. **Risk management**: Auto-calculate position size based on margin requirements

---

Generated: Symbol-Aware Indicator System
Version: 1.0
