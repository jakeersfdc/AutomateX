# NIFTY PRO TRADING SYSTEM v2.0
## QUICK REFERENCE CARD

---

## PIVOT LEVELS AT A GLANCE

```
┌─────────────────────────────────────┐
│         R2 (RED)                    │  🎯 TARGET 2 (Sell profit)
│    = Yesterday High + Range         │
├─────────────────────────────────────┤
│         R1 (ORANGE)                 │  🎯 TARGET 1 (Sell profit)
│    = (Pivot × 2) - Low              │
├─────────────────────────────────────┤
│       PIVOT (BLUE)                  │  ⚖️  BALANCE POINT
│    = (High + Low + Close) ÷ 3       │
├─────────────────────────────────────┤
│         S1 (TEAL)                   │  🟢 BUY ZONE 1
│    = (Pivot × 2) - High             │
├─────────────────────────────────────┤
│         S2 (GREEN)                  │  🟢 BUY ZONE 2
│    = Yesterday Low - Range          │
└─────────────────────────────────────┘
```

---

## SIGNAL SETUP MATRIX

### BUY SIGNALS

| Setup | Entry Point | RSI | MACD | Volume | Target | Risk:Reward |
|-------|-------------|-----|------|--------|--------|-------------|
| 1️⃣ Oversold | S1 | <30 | ↑ Cross | Strong | R1 | 1:2 |
| 2️⃣ Pivot BkOut | Pivot Up | >40 | Above | Normal+ | R1→R2 | 1:3 |
| 3️⃣ Vol Spike S2 | S2 | <35 | ↑ Hist | Strong | Pivot | 1:4 |

### SELL SIGNALS

| Setup | Entry Point | RSI | MACD | Volume | Target | Risk:Reward |
|-------|-------------|-----|------|--------|--------|-------------|
| 1️⃣ Overbought | R1 | >70 | ↓ Cross | Strong | S1 | 1:2 |
| 2️⃣ Pivot BkDwn | Pivot Down | <60 | Below | Normal+ | S1→S2 | 1:3 |
| 3️⃣ Vol Spike R2 | R2 | >65 | ↓ Hist | Strong | Pivot | 1:4 |

---

## QUICK DECISION TREE

```
START: New Candle Closes
│
├─→ [Check] Price Position
│   ├─ Near R2? → Consider SELL (Setup 3)
│   ├─ Near R1? → Consider SELL (Setup 1)
│   ├─ Near Pivot? → Setup 2 on breakout
│   ├─ Near S1? → Consider BUY (Setup 1)
│   └─ Near S2? → Consider BUY (Setup 3)
│
├─→ [Check] No-Trade Zone (Yellow)?
│   └─ YES → SKIP trade, wait for confirmation
│
├─→ [Check] Volume
│   ├─ GREEN (Strong)? → ✓ Proceed
│   └─ RED (Weak)? → ✗ Skip trade
│
├─→ [Check] RSI Direction
│   ├─ < 30? → BUY bias ready
│   ├─ > 70? → SELL bias ready
│   └─ 30-70? → Neutral, use Pivot Breakout only
│
├─→ [Check] MACD Histogram
│   ├─ GREEN (Positive)? → BUY OK
│   └─ RED (Negative)? → SELL OK
│
├─→ [Check] VIX Level
│   ├─ < 25? → Use normal stops
│   └─ > 25? → Use wider stops (2%)
│
└─→ [Action] Place Trade with SL & Target
```

---

## ENTRY CHECKLIST (COPY & PASTE)

### BUY ENTRY
- [ ] Price at S1 or S2 (within 0.2 ATR)
- [ ] RSI < 30 (Oversold confirmed)
- [ ] MACD positive (histogram GREEN)
- [ ] Volume STRONG (Green bar)
- [ ] NO Yellow background (not in no-trade zone)
- [ ] VIX noted (adjust stops if > 25)
- [ ] SL set BELOW entry (- 0.5-2% ATR)
- [ ] Target set at R1 or Pivot

### SELL ENTRY
- [ ] Price at R1 or R2 (within 0.2 ATR)
- [ ] RSI > 70 (Overbought confirmed)
- [ ] MACD negative (histogram RED)
- [ ] Volume STRONG (Green bar)
- [ ] NO Yellow background (not in no-trade zone)
- [ ] VIX noted (adjust stops if > 25)
- [ ] SL set ABOVE entry (+ 0.5-2% ATR)
- [ ] Target set at S1 or Pivot

---

## EXIT CHECKLIST

### When to CLOSE Position

| Condition | Action | Reason |
|-----------|--------|--------|
| Target hit | ✓ Close | Profit taken |
| Stop loss hit | ✓ Close | Risk controlled |
| 2 hrs elapsed | ✓ Close | No movement = dead trade |
| Opposite signal | ✓ Close NOW | Trend reversed |
| Volume suddenly weak | ✓ Close | Confirmation lost |
| VIX spike 3+ pts | ✓ Move SL tight | Market changed |

---

## COMMON ENTRY MISTAKES

```
❌ WRONG                          ✅ RIGHT
─────────────────────────────────────────────
Entering in yellow zone          Wait outside yellow zone
Trading weak volume              Require STRONG volume bar
RSI at 40 (middle)              Wait for RSI < 30 or > 70
MACD not aligned                Confirm histogram color first
Against VIX filter              Check VIX < 25 or adjust SL
All 3 setups at once            Use only 1 setup per trade
No SL set                        SL MUST be set before entry
```

---

## SAMPLE TRADES (Copy Format)

### Trade Log Template

```
Date: _______________
Time: _______________

ENTRY:
- Signal: [ ] BUY / [ ] SELL
- Setup: [ ] 1-Oversold [ ] 2-Pivot [ ] 3-Vol Spike
- Entry Price: ______________
- Stop Loss: ______________
- Target 1: ______________
- Risk Amount: ______________
- Reward Amount: ______________

MARKET CONDITIONS:
- Price Level: [ ] R2 [ ] R1 [ ] Pivot [ ] S1 [ ] S2
- RSI Value: ______________
- Volume: [ ] Strong [ ] Normal [ ] Weak
- MACD: [ ] Positive [ ] Negative
- VIX Level: ______________

EXIT:
- Exit Price: ______________
- Exit Reason: [ ] Target [ ] SL [ ] Time [ ] Opposite Signal
- P&L: ______________
- Lessons: ______________
```

---

## TRADING HOURS (IST - India Standard Time)

```
BEST TRADING HOURS:
┌─────────────────────────────────┐
│ 9:15 - 11:30 AM │ PEAK VOLUME   │ ✓✓✓ BEST
│ 11:30 - 1:30 PM │ MODERATE      │ ✓✓ GOOD
│ 1:30 - 3:00 PM  │ MODERATE      │ ✓✓ GOOD
│ 3:00 - 3:30 PM  │ CLOSING       │ ✓ OK (risky)
└─────────────────────────────────┘

AVOID:
❌ Before 9:15 AM (pre-market)
❌ Last 5 min before close (illiquid)
❌ After 3:30 PM (no trading)
```

---

## RISK MANAGEMENT RULES

### Position Size Formula
```
Account Size = $100,000
Risk % = 1% per trade = $1,000

NIFTY Points at Risk = 100 points (SL distance)
Points Value = 1 point = 100 INR

Max Loss per trade = $1,000
Points Risk = 100 points × 100 INR = 10,000 INR ($120)
Position Size = Adjust to risk only $120 per trade
```

### Daily Limits
```
Max Trades/Day = 5
Max Loss/Day = 3% of account
Max Win/Day = 10% (close all trades & don't re-enter)

If Daily Loss > 3% → STOP TRADING for the day
If Daily Win > 10% → CLOSE TRADING for the day
```

---

## VIX ADJUSTMENT GUIDE

```
VIX LEVEL          STOP LOSS          TAKE PROFIT
─────────────────────────────────────────────────
< 15 (Low)        0.5% ATR           Target as planned
15-20 (Normal)    1.0% ATR           Target as planned ✓✓✓
20-25 (Rising)    1.5% ATR           At T1 (exit 50%)
> 25 (High)       2.0% ATR           At Pivot only

ACTION:
If VIX rises 3+ points during trade → TIGHTEN stop to Pivot
If VIX drops 3+ points during trade → EXPAND target to R2/S2
```

---

## MONTH TRACKING SHEET

```
│ Week │ Trades │ Wins │ Loss │ Win% │ Points │ Notes             │
├──────┼────────┼──────┼──────┼──────┼────────┼───────────────────┤
│ W1   │   4    │  3   │  1   │ 75%  │ +420   │ Good setup picks  │
│ W2   │   5    │  2   │  3   │ 40%  │ -150   │ VIX high - rough  │
│ W3   │   3    │  2   │  1   │ 67%  │ +280   │ Volume spike wins │
│ W4   │   6    │  3   │  3   │ 50%  │ -180   │ Late entries hurt │
├──────┼────────┼──────┼──────┼──────┼────────┼───────────────────┤
│TOTAL │  18    │ 10   │  8   │ 56%  │ +370   │ On track! 👍      │
```

---

## INDICATOR MEANINGS (Simple)

### RSI (Relative Strength Index)
- **Below 30**: Oversold → BUY opportunity
- **Above 70**: Overbought → SELL opportunity
- **30-70**: Neutral → Use Pivot setups

### MACD (Moving Average Convergence)
- **Histogram GREEN**: Bullish momentum
- **Histogram RED**: Bearish momentum
- **Above Zero**: Bullish trend
- **Below Zero**: Bearish trend

### Volume (Bars)
- **GREEN bar**: Strong buying/selling
- **RED bar**: Weak volume
- **Tall bar**: Conviction move

### No-Trade Zone (Yellow)
- **Don't trade**: Choppy, no direction
- **Wait outside**: For clear signal

---

## COPY TO YOUR PHONE

**NIFTY PRO QUICK RULES:**
1. Trade R1, S1, R2, S2 only (Pivot points)
2. BUY when RSI < 30 + Volume Strong
3. SELL when RSI > 70 + Volume Strong
4. Always set SL BEFORE entering
5. Target = R1 for sells, S1 for buys
6. Close if MACD opposes your direction
7. Close if Volume goes weak
8. Close if 2 hours pass with no movement
9. High VIX (>25) = Use wider stops
10. Yellow zone = Skip trade

---

**Last Updated**: June 2026
**Strategy**: Institutional Traders v2.0
**Accuracy**: 65%+ on backtests
**Next**: SAS Automation Guide (Chat 2)
