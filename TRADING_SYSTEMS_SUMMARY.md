# ProfitForce Trading Systems - Complete Inventory

## Overview
Comprehensive trading system with multiple strategy frameworks, indicator calculations, signal engines, and AI prediction models. Built with TypeScript backend and Python ML pipeline.

---

## 1. CORE STRATEGY FRAMEWORKS

### Strategy Architecture (`lib/strategy/Strategy.ts`)
- **Framework**: Pure functional strategies operating on OHLCV bars
- **Execution Models**: 
  - Backtester: Historical simulation with realistic costs/slippage
  - LiveRunner: Real-time trading with OMS integration
- **Signals**: BUY, SELL, EXIT, HOLD with confidence scores (0-1)
- **Key Features**:
  - Position context-aware (qty, avg price, capital)
  - Stop-loss and profit targets
  - Deterministic (no random numbers)
  - Warmup periods support

### Reference Strategies (`lib/strategy/strategies.ts`)

#### 1. **SMA 5/20 Crossover** (Classic)
- Entry: SMA(5) crosses above SMA(20)
- Exit: SMA(5) crosses below SMA(20)
- Stop Loss: 5-bar lowest low (or -1%)
- Target: 1.5x risk/reward ratio
- Confidence: 0.6

#### 2. **RSI(14) Mean Reversion** (Oscillator-based)
- Entry: RSI < 30 + bullish bar
- Exit: RSI > 50 or 5-day stop hit
- Target: 2x risk/reward ratio
- Confidence: 0.55
- Use Case: Oversold bounces in range-bound markets

#### 3. **Donchian 20-Day Breakout** (Turtle-style)
- Entry: Close above 20-day high
- Exit: Close below EMA(20)
- Stop Loss: 20-day low
- Target: 2x risk/reward ratio
- Confidence: 0.65
- Trailing: EMA(20) dynamic trail

#### 4. **Gann Fan + Square-of-9** (Advanced Geometry)
- **Gann Angles**:
  - 1x1 (45°): Primary trend
  - 1x2, 2x1, 1x4: Support/resistance angles
- **Square-of-9**: Harmonic support/resistance levels
- Entry: Close > 1x1 line AND > Square-of-9 support
- Exit: Loss of 1x2 line
- Confidence: 0.62
- Anchor: Most recent swing pivot

#### 5. **Elliott Wave Trend Trading** (Wave Count)
- **Wave Detection**: 5-wave impulse, 3-wave correction
- **Wave Ratios**:
  - Wave 3: Usually longest
  - Wave 2: 50-78.6% retracement of Wave 1
  - Wave 4: 23.6-38.2% retracement of Wave 3
  - Wave 5: 100-161.8% extension of Wave 1
- Entry: Wave 3 confirmation
- Targets: Wave 5 extent projection
- Confidence: Variable based on wave structure

#### 6. **Multi-Timeframe Trend Confirmation** (MTF)
- **Timeframe Analysis**: 
  - EMA(9, 21, 50, 200) across multiple frames
  - ADX(14) for trend strength
  - RSI(14) confirmation
- **Trend States**: STRONG_UP, UP, CHOP, DOWN, STRONG_DOWN
- **Zones**: Support/Demand clustering, measured move targets
- Entry: Confluence of higher timeframe trend + lower timeframe entry signal

#### 7. **Options Greeks Strategy** (Derivatives)
- **Greeks Calculation**:
  - Delta: Directional exposure (0-1)
  - Theta: Time decay (per day)
  - Vega: Implied volatility sensitivity
  - Gamma: Delta acceleration
- **Strategies**:
  - Long Straddle: Profit from IV expansion
  - Short Straddle: IV crush plays
  - Call/Put spreads: Directional with defined risk
- **IV Crush Detection**: Relative volatility percentile ranking
- Expiry Dynamics: Time decay acceleration in final week

#### 8. **Institutional-Grade Indicator System** (Professional)
- **Components**:
  1. Market Structure: BOS (Break of Structure), CHOCH (Change of Character)
  2. Liquidity Sweeps: Buy-stop and sell-stop detection
  3. VWAP (Volume Weighted Average Price)
  4. Trend Engine: EMA ribbon (9, 21, 50, 200)
  5. ATR Risk Engine
  6. Multi-timeframe confirmation
  7. Signal Grading: A+/A/B/C
- **Market Structure Rules**:
  - BOS: Price breaks previous swing structure
  - CHOCH: Reversal with momentum > 30% of swing range

---

## 2. INDICATOR CALCULATIONS

### Moving Averages
- **SMA(n)**: Simple moving average
- **EMA(n)**: Exponential moving average
  - Periods: 5, 7, 9, 10, 12, 15, 20, 21, 26, 30, 35, 40, 45, 50, 60, 200
- **Guppy Multiple Moving Average (GMMA)**:
  - Short ribbon: EMA(3, 5, 8, 10, 12, 15)
  - Long ribbon: EMA(30, 35, 40, 45, 50, 60)
  - States: BULL_EXPANSION, BEAR_EXPANSION, BULL_COMPRESSION, BEAR_COMPRESSION, CHOP

### Momentum Indicators
- **RSI(14)**: Relative Strength Index
  - Overbought: > 70
  - Oversold: < 30
  - Implementation: 14-period default
- **RSI(7)**: Faster momentum confirmation
- **Stochastic Oscillator**: K, D lines (14 period, 3 smooth)
- **MACD**: 
  - Parameters: Fast=12, Slow=26, Signal=9
  - Output: MACD line, Signal line, Histogram
- **CCI(20)**: Commodity Channel Index
- **ROC(9)**: Rate of Change
- **Williams %R**: Williams Percent Range (14-period)

### Volatility Indicators
- **ATR(14)**: Average True Range
  - Use: Stop-loss sizing, position sizing
- **Bollinger Bands(20, 2)**:
  - Upper band: SMA(20) + 2×StDev
  - Lower band: SMA(20) - 2×StDev
  - %B: Position within bands (0-100%)
  - Width: Band distance / SMA
- **Implied Volatility**: From option prices or historical volatility
- **RVI**: Relative Volatility Index (RSI applied to volatility)

### Trend Indicators
- **ADX(14)**: Average Directional Index
  - +DI: Uptrend strength
  - -DI: Downtrend strength
  - ADX: Trend strength (> 20 = strong)
- **Trend Engine**: EMA ribbon convergence/divergence
- **Supertrend(10, 3)**: ATR-based trend following

### Volume Indicators
- **Volume Profile**: Price-level volume clustering
  - POC (Point of Control): Highest volume price
  - VAH (Value Area High): 70% volume top
  - VAL (Value Area Low): 70% volume bottom
- **OBV**: On-Balance Volume
- **MFI**: Money Flow Index
- **VWAP**: Volume Weighted Average Price
- **Volume Regime**: HIGH (>1.3x avg), NORMAL, LOW (<0.7x avg)

### Support & Resistance
- **Pivot Points**: Daily/Weekly open, high, low
  - R1, R2: Resistance levels
  - S1, S2: Support levels
  - 6-Zone Heatmap: Institutional zones
- **Swing Points**: Local highs/lows (lookback=5)
- **Gann Square-of-9**: Harmonic levels (√price ± 0.125 increments)

---

## 3. SIGNAL ENGINES

### SAS Engine (Smart Automated System) v2.0
**Location**: `lib/engine/SASEngine.ts`

**Comprehensive Feature Set**:
- Pivot zones (R1, R2, S1, S2) with 6-zone heatmap
- Volume Profile (POC, VAH, VAL)
- Volatility integration (VIX-adjusted)
- No-Trade Zone (NTZ) protection (±5% from pivots)
- Confluence scoring: -8 to +10
- Risk management: Dynamic SL/targets

**Confluence Factors**:
1. Pivot zone alignment (±2)
2. Volume profile placement (±2)
3. ADX trend strength (±2)
4. RSI overbought/oversold (±2)
5. Volume regime (±2)
6. VIX regime classification
7. Support/resistance test
8. Daily/Weekly POC proximity

**Output**: SASSignal with confidence, targets, stops, recommendations

---

### V2.1 Signal Engine (NIFTY PRO System)
**Location**: `lib/engine/v2_1_signal_engine.ts`

**Indicator-Based Scoring (0-11 points)**:

**Ichimoku Cloud (±3 points)**:
- Tenkan: 9-period high-low midpoint
- Kijun: 26-period high-low midpoint
- Senkou A, B: Leading cloud
- Cloud colors: GREEN (bullish), RED (bearish), YELLOW (transition)

**Stochastic RSI (±2 points)**:
- K line: Fast stochastic of RSI
- D line: 3-period EMA of K
- Overbought/oversold: 80/20 levels

**ROC Momentum (±2 points)**:
- 9-period Rate of Change
- Strong threshold: >1.5 (bull) or <-1.5 (bear)

**RSI (±1 point)**:
- 14-period RSI
- Overbought: >70, Oversold: <30

**MACD (±1 point)**:
- Histogram positive/negative
- Line above/below signal

**Signal Status**:
- BUY: bullScore > 6
- SELL: bearScore > 6
- NEUTRAL: 3-6 range
- NO_TRADE: < 3

---

### Original SignalEngine (Legacy)
**Location**: `lib/engine/SignalEngine.ts`

**Multi-Indicator Confluence (3+ agreement required)**:
- RSI(14)
- MACD(12,26,9)
- Bollinger Bands(20,2)
- VWAP
- EMA(9, 21, 50, 200)
- SuperTrend(10, 3)
- ADX(14)
- ATR(14)
- Volume Profile
- OBV

**Guppy Multiple Moving Average (GMMA)**:
- Twin-ribbon system
- Short ribbon geometry: Volatility-of-trend
- Long ribbon geometry: Investor positioning
- State transitions: Regime change detection

---

### NITS Engine (NIFTY Institutional Trading System)
**Location**: `lib/engine/nits_signal_engine.ts`

**Institutional Framework**:
- **Daily Levels**: Daily Open Range (DOR), POC, VAH, VAL
- **Weekly Levels**: Week high, low, POC
- **ORB (Opening Range Breakout)**:
  - Breakout Up: Close > OR high
  - Breakout Down: Close < OR low
  - Inside: Within range
- **VIX Classification**: Low (<15), High (>25), Neutral
- **Liquidity Analysis**: SSL (Sell-stop sweep), BSL (Buy-stop sweep)
- **Volume Status**: Strong (>1.3x avg), Normal, Weak
- **Volume Profile Type**: P (positive), b (balanced), D (distribution), I (indecision), N (neutral)
- **Gap Status**: Gap Up, Gap Down, No Gap

**Signal Conditions**:
- Buyable: Market Bias bullish + Volume strong + Not in NTZ
- Sellable: Market Bias bearish + Volume strong + Not in NTZ
- Confidence: Based on confluence of 5+ factors

---

## 4. ENTRY/EXIT RULES SUMMARY

### Entry Rules (General Pattern)
1. **Trend Confirmation**: Multi-timeframe alignment (3+ sources)
2. **Indicator Confluence**: 3+ indicators agreeing (signal-dependent)
3. **Volume Validation**: Above 20-day average or regime confirmation
4. **Price Action**: Near support/resistance or breakout
5. **Risk/Reward**: Minimum 1.5x target/stop ratio
6. **Not in No-Trade Zone**: Away from pivot zones during chop

### Stop Loss Placement
1. **Technical**: Below recent swing low (lookback=5-20 bars)
2. **ATR-based**: Entry ± (1-2) × ATR(14)
3. **Percent-based**: Entry × (0.98-0.99) for long, × (1.02-1.03) for short
4. **Support/Resistance**: Just below nearest support level
5. **Maximum**: 5% of capital per trade

### Profit Target Levels
1. **Risk/Reward**: Entry + 1.5× (Entry - Stop) for longs
2. **Support/Resistance**: Nearest resistance level
3. **Measured Move**: (High - Low) × 2 from breakout
4. **Fibonacci**: 50%, 61.8%, 78.6%, 100%, 161.8%, 261.8% retracements
5. **Triple Target**: T1=1x risk/reward, T2=1.5x, T3=2x

### Exit Rules
1. **Stop Hit**: Liquidate on stop price
2. **Target Hit**: Partial exit at each target level
3. **Signal Reversal**: Exit opposite signal generation
4. **Time-based**: EOD/EOW closure for intraday/weekly trades
5. **Volatility Stop**: Trail with moving average (EMA20 typically)
6. **Profit Taking**: Exit after defined % gain (e.g., 5% intraday)

---

## 5. RISK MANAGEMENT

### Position Sizing (`lib/risk/RiskEngine.ts`)
**Kelly-Based Sizing**:
```
Shares = floor(Capital × RiskPerTrade% / |Entry - StopLoss|)
```

**Risk Limits**:
- **Daily Loss Cap**: 3% of capital (max_daily_loss_pct)
- **Position Size**: Max 20% of capital per position (max_position_pct)
- **Open Positions**: Max 5 concurrent (max_open_positions)
- **Risk Per Trade**: 1% of capital (risk_per_trade_pct)
- **Order Rate**: Max 10 orders/minute
- **Notional Limit**: Per-symbol position cap

### Pre-Trade Checks (Fail-Fast)
1. **Kill Switch**: Global or per-user emergency stop
2. **Risk Profile**: Capital and limits loaded
3. **Daily Loss Check**: Hasn't exceeded max loss
4. **Order Rate**: Not exceeding orders/minute limit
5. **Position Count**: Not at concurrent position limit
6. **Per-Symbol Limit**: Notional under cap
7. **Per-Trade Risk**: Worst loss ≤ capital × risk_per_trade_pct
8. **SEBI Sanity**: qty > 0, price ≥ 0, valid segment

### Cost Calculation (`lib/risk/CostModel.ts`)
**Indian Market Costs** (Apr 2026):

**Brokerage**: ₹20 OR 0.03% of turnover (whichever lower)
- Exception: EQ_DELIVERY = ₹0

**STT (Securities Transaction Tax)**:
- EQ_DELIVERY: 0.1% (buy + sell)
- EQ_INTRADAY: 0.025% (sell only)
- FUT: 0.0125% (sell only)
- OPT: 0.0625% (sell premium only)

**Exchange Fees**:
- EQ: 0.00297% of turnover
- FUT: 0.00173% of turnover
- OPT: 0.03503% of premium

**SEBI Fee**: 0.0001% (₹10/crore)

**Stamp Duty**:
- EQ_DELIVERY: 0.015% (buy only)
- EQ_INTRADAY: 0.003%
- FUT: 0.002%
- OPT: 0.003%

**GST**: 18% on (brokerage + exchange + SEBI)

**Slippage Model**: max(0.05% of price, 1 tick) for liquid instruments

---

## 6. BACKTESTING & PAPER TRADING

### Backtester (`lib/strategy/Backtester.ts`)
**Features**:
- Bar-by-bar simulation with historical OHLCV
- Realistic costs: brokerage, taxes, slippage
- Position management: entry, target hits, stop hits, exits
- Performance metrics:
  - ROI, CAGR, Sharpe ratio, Sortino
  - Win rate, profit factor, expectancy
  - Max drawdown percentage
- Trade-by-trade analysis
- Warm-up period handling

**Workflow**:
1. Load historical bars
2. Iterate bar-by-bar with strategy.step(context)
3. Check intra-bar exit conditions (target/stop)
4. Execute new entries on next bar's open
5. Apply slippage and costs
6. Track equity curve and drawdown
7. Generate summary statistics

---

### Paper Trading System (`lib/engine/paper_trading.ts`)
**Simulated Live Trading**:
- Virtual cash: Starting capital (default ₹100,000)
- Position tracking: Entry price, quantity, entry time
- Multi-level targets: T1, T2, T3
- Real-time PnL calculation:
  - Unrealized: Current price vs entry
  - Realized: On position close
- Metrics: Win rate, total trades, max drawdown, total PnL

---

## 7. AUTOMATED EXECUTION

### AutoTrader (`lib/engine/AutoTrader.ts`)
**Fully Automated Loop**:
1. **Market Scan**: Identify trading symbols
2. **Signal Generation**: Run signals on latest candles
3. **Pre-Trade Checks**: Risk engine validation
4. **Order Placement**: Via OMS (Order Management System)
5. **Position Monitoring**: Track open positions
6. **Exit Management**: Auto-exit on signal reversal
7. **Alert Broadcasting**: Multi-channel notifications

**Alert Channels**:
- Email: Detailed trade setup + analysis
- Push Notifications: FCM (Firebase Cloud Messaging)
- WhatsApp: SMS alerts via Twilio
- In-app: Dashboard real-time updates

**Supported Symbols**:
- Equity: Stocks (NSE/BSE)
- Indices: NIFTY50, BANKNIFTY, Nifty200
- Options: NIFTY, BANKNIFTY, Stock options
- Futures: Index and Stock futures
- Crypto: BTC, ETH (future support)

---

## 8. MACHINE LEARNING MODELS

### ML Pipeline (`ml/` folder)

#### Training (`ml/train.py`)
**Ensemble Model**:
- **XGBoost**: Gradient boosting
- **LightGBM**: Fast gradient boosting
- **Gradient Boosting Classifier**: Scikit-learn
- **Random Forest**: Ensemble alternative
- **Voting Classifier**: Aggregate predictions

**Features** (30+ technical indicators):
```
Moving Averages: sma5, sma10, sma20, sma50, ema12, ema26
Momentum: rsi14, rsi7, macd, macd_signal, macd_hist
Volatility: bb_upper, bb_lower, bb_width, bb_pct, atr14
Trend: adx14, cci20
Oscillators: stoch_k, stoch_d, williams_r
Volume: obv_slope, volume_ratio
Returns: return1, return3, return5
Volatility: volatility, volatility20
Relative: ma_diff, ma_diff_10_50, close_to_sma20, close_to_sma50, high_low_range
```

**Training**:
- Walk-forward cross-validation (TimeSeriesSplit)
- Target: BUY (1) / SELL (0) labels
- Calibration: CalibratedClassifierCV for probability outputs
- Metrics: Precision, Recall, F1-score

#### Prediction (`ml/predict.py`)
**Model Versions**:
- **v2**: 30+ feature ensemble (current)
- **v1**: 6 feature legacy (legacy support)

**Supported Data Sources**:
- Yahoo Finance: OHLCV data
- Polygon API: Premium data source
- Local CSV cache: Offline support

**Output**: JSON prediction with:
- Symbol, timestamp
- Prediction class (BUY/SELL/HOLD)
- Probability score (0-1)
- Model version
- Features used

---

## 9. BACKTESTING SCRIPTS (Python)

### Step 1: Data Download (`backtest_step1_download_data.py`)
**Universe**: NIFTY 50 stocks
**Frequency**: Daily OHLCV
**Lookback**: 5 years
**Source**: Yahoo Finance
**Output**: CSV files per ticker + combined dataset

### Step 2a: Single Strategy (`backtest_step2_strategy.py`)
**Workflow**:
1. Load downloaded data
2. Run single strategy (e.g., Momentum, Mean Reversion)
3. Calculate performance metrics
4. Generate trade-by-trade analysis
5. Plot equity curve, drawdown

### Step 2b: Multi-Strategy (`backtest_step2_multi_strategy.py`)
**Strategies Tested**:
1. WITHIN_2PCT_52W_HIGH: Stocks near 52-week highs
2. AT_52W_HIGH: Stocks at resistance
3. STAGE2_TREND: Uptrend continuation
4. WITHIN_25PCT_52W_HIGH: Broader range

**Configuration**:
- Initial Capital: ₹100,000
- Allocation per Trade: ₹20,000
- Max Concurrent Positions: 5
- Slippage: 0.1% entry/exit
- Commission: ₹20/trade

**Output**:
- Performance comparison table
- Benchmark comparison
- Trade analysis
- Optimization recommendations

---

## 10. KEY COMPONENTS INTEGRATION

### Data Flow
```
Yahoo Finance / Data Feeds
        ↓
    OHLCV Bars
        ↓
    ┌───────────┬────────────┬──────────────┐
    ↓           ↓            ↓              ↓
SignalEngines  Strategies  ML Model    Backtester
    ↓           ↓            ↓              ↓
  Signals   Signals(Bars)  Predictions  Performance
    ↓           ↓            ↓              ↓
    └───────────┴────────────┴──────────────┘
              ↓
        Pre-Trade Risk Engine
              ↓
        Order Management System
              ↓
        Broker Integration
              ↓
        Alert Broadcasting
```

---

## 11. FILE STRUCTURE SUMMARY

```
lib/strategy/
├── Strategy.ts                    # Core framework
├── strategies.ts                  # Reference implementations (8 strategies)
├── Backtester.ts                 # Historical simulation engine
├── LiveRunner.ts                 # Real-time execution harness
├── elliottWaveIndicators.ts      # Elliott Wave analysis
├── optionsIndicators.ts          # Options Greeks & IV
├── gann.ts                       # Gann fan + Square-of-9
├── institutionalIndicator.ts     # Market structure, BOS/CHOCH
├── multiTimeframeTrend.ts        # MTF trend + zone analysis
├── ghostTradeIndicators.ts       # (Ghost trades detection)
├── symbolDetector.ts             # Option symbol parsing

lib/engine/
├── SignalEngine.ts               # Legacy multi-indicator (3+ confluence)
├── SASEngine.ts                  # Integrated pivot+volume+VIX
├── v2_1_signal_engine.ts         # Ichimoku+Stochastic (0-11 scoring)
├── nits_signal_engine.ts         # Institutional trading (ORB+POC)
├── AutoTrader.ts                 # Automated execution
├── paper_trading.ts              # Simulated live trading
├── backtest_engine.ts            # Multi-strategy backtester
├── market_data_service.ts        # Real-time quotes
├── oiAnalysis.ts                 # Open Interest analysis
├── volumeProfile.ts              # Volume Profile (POC/VAH/VAL)
├── pivot.ts                      # Pivot points + zones
├── vixIntegration.ts             # VIX/volatility handling

lib/risk/
├── RiskEngine.ts                 # Pre-trade checks + position sizing
├── CostModel.ts                  # Indian market costs calculation

ml/
├── train.py                      # Ensemble model training
├── predict.py                    # Single prediction inference
├── evaluate_models.py            # Model evaluation framework
```

---

## 12. SIGNAL QUALITY METRICS

### Signal Generation Requirements
- **Minimum Confluence**: 3+ indicators agreeing
- **Confidence Score**: 0-1 (higher = stronger signal)
- **Signal Grade**: A+ (95%+ conf), A (80-95%), B (60-80%), C (40-60%)
- **Entry Ratio**: Risk/Reward minimum 1.5:1
- **Volume Confirmation**: Above 20-day average
- **Trend Alignment**: Aligned with multiple timeframes

### Signal Validation
- Backtest on 5+ years of data
- Walk-forward cross-validation
- Win rate > 50%, Profit factor > 1.5
- Max drawdown < 25%
- Sharpe ratio > 1.0

---

## 13. LIVE DEPLOYMENT

### Components Active
- ✅ SAS Engine (multi-factor scoring)
- ✅ V2.1 Engine (Ichimoku-based)
- ✅ NITS Engine (institutional zones)
- ✅ Strategy Framework (reference strategies)
- ✅ Paper Trading System
- ✅ AutoTrader (alert broadcaster)
- ✅ Risk Engine (pre-trade validation)
- ✅ ML Predictions (ensemble models)

### Monitoring
- Signal logger: Records every signal generation
- Position tracker: Real-time PnL
- Alert audit: Email/push/WhatsApp delivery
- Risk audit: Pre-trade check results

---

## QUICK REFERENCE

| Component | Purpose | Status | Key File |
|-----------|---------|--------|----------|
| SMA Crossover | Classic trend | ✅ | strategies.ts |
| RSI Mean Rev | Oscillator | ✅ | strategies.ts |
| Donchian BO | Breakout | ✅ | strategies.ts |
| Gann Fan | Geometric | ✅ | gann.ts |
| Elliott Wave | Wave count | ✅ | elliottWaveIndicators.ts |
| Options Greeks | Derivatives | ✅ | optionsIndicators.ts |
| Institutional | Market struct | ✅ | institutionalIndicator.ts |
| MTF Trend | Multi-TF | ✅ | multiTimeframeTrend.ts |
| SAS | Integrated | ✅ | SASEngine.ts |
| V2.1 Ichimoku | Ichimoku system | ✅ | v2_1_signal_engine.ts |
| NITS | Institutional | ✅ | nits_signal_engine.ts |
| ML Ensemble | Predictions | ✅ | ml/train.py |
| Backtester | Simulation | ✅ | Backtester.ts |
| Paper Trading | Virtual | ✅ | paper_trading.ts |

---

**Last Updated**: June 24, 2026  
**System Status**: ✅ Production Ready  
**Latest Features**: AI predictions, Multi-strategy backtesting, Institutional zone analysis
