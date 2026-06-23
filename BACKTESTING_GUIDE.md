# Backtesting Framework - Quick Start Guide

## Overview

Complete 2-step backtesting workflow for NIFTY 50 stocks with multiple momentum strategies.

### Files Created

1. **backtest_step1_download_data.py** - Download daily OHLCV data from Yahoo Finance
2. **backtest_step2_strategy.py** - Single strategy backtest
3. **backtest_step2_multi_strategy.py** - Multi-strategy comparison (4 strategies)

## Step 1: Download Data

```bash
python backtest_step1_download_data.py
```

**Output:**
- `backtest_data/` folder with:
  - Individual CSV files (one per ticker)
  - `combined_data.csv` - All tickers combined
  - `constituents.csv` - List of successful downloads
  - `failed_downloads.csv` - Failed tickers (if any)

**Time:** ~10-15 minutes (depends on internet speed)

## Step 2a: Single Strategy Backtest

```bash
python backtest_step2_strategy.py
```

**Strategy Rules:**
- **Trend Filter:** SMA20 > SMA50 (uptrend)
- **Entry:** Higher lows + RSI > 50 + Volume surge
- **Exit:** Stop loss (2%), Take profit (5%), or Trailing stop (3%)
- **Position sizing:** ₹20,000 per trade
- **Max positions:** 5 concurrent

**Output:**
- `backtest_results/` folder with:
  - `trades.csv` - All trades
  - `trades_readable.txt` - Formatted trade log
  - `equity_curve.csv` - Daily equity values
  - `summary.csv` - Performance metrics

## Step 2b: Multi-Strategy Backtest

```bash
python backtest_step2_multi_strategy.py
```

**Runs 4 Strategies:**

### 1. Within 2% of 52-Week High
```
Entry Rules:
- Close within 2% of 52-week high
- RSI > 50
- Volume spike (>1.2x average)

Exit Rules:
- Stop loss at 2%
- Below 20-day SMA
```

### 2. At 52-Week High (Breakout)
```
Entry Rules:
- New 52-week high breakout
- Close > SMA20
- SMA20 > SMA50

Exit Rules:
- Stop loss at 2%
- Trailing stop at 3%
```

### 3. Stage 2 Trend (Accumulation)
```
Entry Rules:
- SMA20 > SMA50 > SMA200 (uptrend)
- Higher lows pattern
- RSI > 50
- Volume confirmation

Exit Rules:
- Break below SMA20
- Stop loss at 2%
```

### 4. Within 25% of 52-Week High
```
Entry Rules:
- Close within 75% or higher of 52-week high
- SMA20 > SMA50
- RSI > 60
- Strong volume spike (>1.3x)

Exit Rules:
- Trailing stop at 3%
- Below SMA20
```

**Output:**
- `backtest_results/` with separate folders for each strategy
- `strategy_comparison.csv` - Side-by-side comparison

## Output Metrics Explained

### Returns & Growth
- **Total Return (%):** ((Final Equity - Initial) / Initial) × 100
- **CAGR (%):** Compound Annual Growth Rate
- **Max Drawdown (%):** Largest peak-to-trough decline

### Trade Statistics
- **Win Rate (%):** Winning Trades / Total Trades
- **Profit Factor:** Total Wins / Abs(Total Losses)
- **Expectancy:** Average PnL per trade
- **Risk-Reward Ratio:** Avg Win / Abs(Avg Loss)

### Holding Period
- **Avg Holding Days:** Average days position held
- **Winners vs Losers:** Separate holding period analysis

## Configuration

Edit these variables in the scripts:

```python
# Data Download
LOOKBACK_DAYS = 365 * 5      # Years of history (default: 5 years)

# Backtesting
INITIAL_CAPITAL = 100000      # Starting capital
ALLOCATION_PER_TRADE = 20000  # Per position
MAX_CONCURRENT_POSITIONS = 5  # Max open trades
ENTRY_SLIPPAGE = 0.001        # 0.1% slippage on entry
EXIT_SLIPPAGE = 0.001         # 0.1% slippage on exit
COMMISSION_PER_TRADE = 20     # ₹20 per trade
```

## Example Workflow

```bash
# Step 1: Download 5 years of daily NIFTY 50 data
python backtest_step1_download_data.py

# Step 2: Run multi-strategy backtest
python backtest_step2_multi_strategy.py

# Step 3: Compare results
cat backtest_results/strategy_comparison.csv
```

## Key Features

✅ **No Look-Ahead Bias** - Signals use only prior available information
✅ **Multiple Positions** - Supports up to 5 concurrent trades
✅ **Realistic Execution** - Includes slippage and commission
✅ **Robust Error Handling** - Skips failed downloads, handles edge cases
✅ **Detailed Reporting** - Trade-by-trade analysis and equity curves
✅ **Benchmark Comparison** - Equal-weighted buy-hold benchmark
✅ **Multi-Strategy** - Compare 4 different momentum strategies

## Troubleshooting

**Q: "No stocks loaded"**
- Ensure Step 1 completed successfully
- Check `backtest_data/` folder exists and has CSV files

**Q: "No trades completed"**
- Strategy might be too strict
- Reduce lookback period or relax entry conditions
- Check if 52-week calculation needs more data

**Q: Slow execution**
- Normal for 5 years × 50 stocks × daily analysis
- Runs in ~2-5 minutes

**Q: Negative returns?**
- Some strategies may underperform in certain markets
- Compare with benchmark to contextualize

## Customization

### Add New Strategy

```python
def generate_signals_custom(df):
    """Your custom strategy."""
    df = df.copy().sort_values('date')
    # Calculate indicators
    # Define buy_signal
    return df

# Add to Strategy enum
class Strategy(Enum):
    CUSTOM_STRATEGY = "custom_strategy"

# Use in backtest
if strategy == Strategy.CUSTOM_STRATEGY:
    return generate_signals_custom(df)
```

### Change Exit Rules

Edit the `_process_day` method in Backtest class:

```python
# Current: 2% stop, 5% target
stop_loss = entry_price * 0.98
take_profit = entry_price * 1.05

# Your custom: 1.5% stop, 7% target
stop_loss = entry_price * 0.985
take_profit = entry_price * 1.07
```

## Tips

1. **Start with more data** - At least 2 years for stability
2. **Test one strategy at a time** - Use `backtest_step2_strategy.py`
3. **Check trade logs** - Review actual trades in readable format
4. **Compare benchmarks** - Always contextualize with buy-hold
5. **Vary parameters** - Test different SL/TP combinations

## Notes

- All prices in Indian Rupees (₹)
- Daily data only (no intraday)
- Yahoo Finance API used (free, reliable)
- NIFTY 50 tickers default (customize in NIFTY50_TICKERS list)
- Requires: pandas, numpy, yfinance
