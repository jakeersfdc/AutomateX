"""
STEP 2: Backtesting Workflow - Strategy Execution
==================================================
Backtest a trend-following strategy on NIFTY 50 stocks using daily data.
Calculates performance metrics and generates detailed reports.

Strategy:
- Trend Filter: SMA crossover (20-day > 50-day)
- Entry: Higher lows + RSI > 50 + Volume surge
- Exit: Stop loss (2%) or Take profit (5%) or Trailing stop
- Position sizing: Equally weighted
- Max positions: 5 concurrent trades
"""

import pandas as pd
import numpy as np
from pathlib import Path
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import warnings
warnings.filterwarnings('ignore')

# ============================================================================
# CONFIGURATION
# ============================================================================

DATA_FOLDER = Path("backtest_data")
OUTPUT_FOLDER = Path("backtest_results")
INITIAL_CAPITAL = 100000
ALLOCATION_PER_TRADE = 20000  # Fixed allocation per position
MAX_CONCURRENT_POSITIONS = 5
ENTRY_SLIPPAGE = 0.001  # 0.1%
EXIT_SLIPPAGE = 0.001   # 0.1%
COMMISSION_PER_TRADE = 20  # Fixed commission in rupees

# ============================================================================
# POSITION TRACKING
# ============================================================================

@dataclass
class Position:
    """Represents an open trading position."""
    symbol: str
    entry_date: datetime
    entry_price: float
    quantity: int
    capital_allocated: float
    stop_loss: float
    take_profit: float
    highest_price: float = field(default=0)
    
    def __post_init__(self):
        self.highest_price = self.entry_price


@dataclass
class Trade:
    """Represents a completed trade."""
    symbol: str
    entry_date: datetime
    exit_date: datetime
    entry_price: float
    exit_price: float
    quantity: int
    pnl: float
    pnl_pct: float
    holding_days: int
    exit_reason: str
    trade_type: str = "Long"


# ============================================================================
# INDICATOR CALCULATIONS
# ============================================================================

def calculate_sma(series, period):
    """Calculate simple moving average."""
    return series.rolling(window=period).mean()


def calculate_rsi(series, period=14):
    """Calculate Relative Strength Index."""
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi


def calculate_atr(high, low, close, period=14):
    """Calculate Average True Range."""
    tr1 = high - low
    tr2 = abs(high - close.shift())
    tr3 = abs(low - close.shift())
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.rolling(window=period).mean()
    return atr


# ============================================================================
# STRATEGY SIGNALS
# ============================================================================

def generate_signals(df):
    """Generate buy/sell signals based on strategy rules."""
    
    # Ensure required columns exist
    if df.empty or len(df) < 50:
        return df
    
    df = df.copy()
    df = df.sort_values('date').reset_index(drop=True)
    
    # Calculate indicators
    df['sma20'] = calculate_sma(df['close'], 20)
    df['sma50'] = calculate_sma(df['close'], 50)
    df['rsi'] = calculate_rsi(df['close'], 14)
    df['atr'] = calculate_atr(df['high'], df['low'], df['close'], 14)
    
    # Volume analysis
    df['avg_volume'] = df['volume'].rolling(window=20).mean()
    df['volume_spike'] = df['volume'] > df['avg_volume'] * 1.5
    
    # Price levels
    df['higher_low'] = False
    for i in range(2, len(df)):
        if df.loc[i, 'low'] > df.loc[i-1, 'low'] and df.loc[i-1, 'low'] > df.loc[i-2, 'low']:
            df.loc[i, 'higher_low'] = True
    
    # Buy signal conditions
    df['buy_signal'] = (
        (df['sma20'] > df['sma50']) &  # Uptrend filter
        (df['rsi'] > 50) &              # RSI bullish
        (df['higher_low']) &            # Higher lows
        (df['volume_spike']) &          # Volume confirmation
        (df['sma20'].notna()) &
        (df['sma50'].notna()) &
        (df['rsi'].notna())
    )
    
    # Sell signal (opposite conditions)
    df['sell_signal'] = (
        (df['sma20'] < df['sma50']) &
        (df['rsi'] < 50)
    )
    
    return df


# ============================================================================
# DATA LOADING
# ============================================================================

def load_all_stocks(data_folder):
    """Load all stock CSVs (excluding combined and constituents files)."""
    
    all_stocks = {}
    skip_files = ['combined_data.csv', 'constituents.csv', 'failed_downloads.csv']
    
    csv_files = [f for f in data_folder.glob('*.csv') if f.name not in skip_files]
    
    print(f"\nLoading {len(csv_files)} stock files from {data_folder}...\n")
    
    for csv_file in csv_files:
        ticker = csv_file.stem
        try:
            df = pd.read_csv(csv_file)
            df['date'] = pd.to_datetime(df['date'])
            
            # Validate required columns
            required_cols = ['date', 'open', 'high', 'low', 'close', 'volume']
            if not all(col in df.columns for col in required_cols):
                print(f"⚠ Skipped {ticker}: Missing required columns")
                continue
            
            # Convert to numeric
            for col in required_cols[1:]:
                df[col] = pd.to_numeric(df[col], errors='coerce')
            
            # Drop NaN rows
            df = df.dropna()
            
            if len(df) > 0:
                all_stocks[ticker] = df
                print(f"✓ {ticker}: {len(df)} rows loaded")
        
        except Exception as e:
            print(f"✗ {ticker}: Error - {str(e)}")
    
    print(f"\n✓ Total valid stocks loaded: {len(all_stocks)}\n")
    return all_stocks


# ============================================================================
# BACKTESTING ENGINE
# ============================================================================

class Backtest:
    """Main backtesting engine."""
    
    def __init__(self, stocks, initial_capital, allocation_per_trade, max_positions):
        self.stocks = stocks
        self.initial_capital = initial_capital
        self.allocation_per_trade = allocation_per_trade
        self.max_positions = max_positions
        
        self.cash = initial_capital
        self.equity = initial_capital
        self.positions: Dict[str, Position] = {}
        self.completed_trades: List[Trade] = []
        self.equity_curve = []
        self.daily_log = []
        
        self.backtest_start = None
        self.backtest_end = None
    
    def run(self):
        """Run backtest across all dates."""
        
        if not self.stocks:
            print("No stocks to backtest")
            return
        
        # Get date range
        all_dates = set()
        for ticker, df in self.stocks.items():
            all_dates.update(df['date'].values)
        
        all_dates = sorted(list(all_dates))
        self.backtest_start = all_dates[0]
        self.backtest_end = all_dates[-1]
        
        print(f"Backtest period: {self.backtest_start} to {self.backtest_end}")
        print(f"Total trading days: {len(all_dates)}\n")
        
        # Process each date
        for current_date in all_dates:
            self._process_day(current_date)
        
        # Close remaining positions at last date
        if self.positions:
            for symbol in list(self.positions.keys()):
                position = self.positions[symbol]
                last_price = self.stocks[symbol][self.stocks[symbol]['date'] == current_date]['close'].values
                if len(last_price) > 0:
                    self._exit_position(symbol, last_price[0], current_date, "End of backtest")
    
    def _process_day(self, current_date):
        """Process all entries and exits for a single day."""
        
        # Exit positions first (based on stops, targets, or signals)
        for symbol in list(self.positions.keys()):
            position = self.positions[symbol]
            ticker_data = self.stocks.get(symbol)
            
            if ticker_data is None:
                continue
            
            day_data = ticker_data[ticker_data['date'] == current_date]
            if day_data.empty:
                continue
            
            day_data = day_data.iloc[0]
            current_price = day_data['close']
            
            # Check stop loss
            if current_price <= position.stop_loss:
                self._exit_position(symbol, position.stop_loss, current_date, "Stop loss hit")
            # Check take profit
            elif current_price >= position.take_profit:
                self._exit_position(symbol, position.take_profit, current_date, "Take profit hit")
            # Update trailing stop
            else:
                if current_price > position.highest_price:
                    position.highest_price = current_price
                    position.stop_loss = position.highest_price * 0.97  # 3% trailing stop
        
        # Entry signals
        if len(self.positions) < self.max_positions:
            for symbol, stock_df in self.stocks.items():
                if symbol in self.positions:
                    continue  # Already in position
                
                day_data = stock_df[stock_df['date'] == current_date]
                if day_data.empty:
                    continue
                
                # Generate signals for this stock
                recent_data = stock_df[stock_df['date'] <= current_date].tail(51).copy()
                if len(recent_data) < 51:
                    continue
                
                signals_df = generate_signals(recent_data)
                last_row = signals_df.iloc[-1]
                
                # Check for buy signal
                if last_row['buy_signal'] and self.cash >= self.allocation_per_trade:
                    entry_price = last_row['close'] * (1 + ENTRY_SLIPPAGE)
                    self._enter_position(symbol, entry_price, current_date, last_row)
        
        # Update equity
        self._update_equity(current_date)
    
    def _enter_position(self, symbol, entry_price, entry_date, day_data):
        """Enter a new position."""
        
        quantity = int(self.allocation_per_trade / entry_price)
        if quantity == 0:
            return
        
        capital_used = quantity * entry_price + COMMISSION_PER_TRADE
        
        if capital_used > self.cash:
            return
        
        stop_loss = entry_price * 0.98  # 2% stop loss
        take_profit = entry_price * 1.05  # 5% take profit
        
        position = Position(
            symbol=symbol,
            entry_date=entry_date,
            entry_price=entry_price,
            quantity=quantity,
            capital_allocated=capital_used,
            stop_loss=stop_loss,
            take_profit=take_profit
        )
        
        self.positions[symbol] = position
        self.cash -= capital_used
        
        print(f"ENTRY: {symbol} @ {entry_price:.2f} ({quantity} shares) on {entry_date}")
    
    def _exit_position(self, symbol, exit_price, exit_date, exit_reason):
        """Exit an existing position."""
        
        if symbol not in self.positions:
            return
        
        position = self.positions[symbol]
        exit_price_with_slippage = exit_price * (1 - EXIT_SLIPPAGE)
        capital_returned = position.quantity * exit_price_with_slippage - COMMISSION_PER_TRADE
        
        pnl = capital_returned - position.capital_allocated
        pnl_pct = (pnl / position.capital_allocated) * 100
        holding_days = (exit_date - position.entry_date).days
        
        trade = Trade(
            symbol=symbol,
            entry_date=position.entry_date,
            exit_date=exit_date,
            entry_price=position.entry_price,
            exit_price=exit_price_with_slippage,
            quantity=position.quantity,
            pnl=pnl,
            pnl_pct=pnl_pct,
            holding_days=holding_days,
            exit_reason=exit_reason
        )
        
        self.completed_trades.append(trade)
        self.cash += capital_returned
        del self.positions[symbol]
        
        if pnl > 0:
            print(f"EXIT:  {symbol} @ {exit_price:.2f} | PnL: ₹{pnl:.2f} (+{pnl_pct:.2f}%) | {exit_reason}")
        else:
            print(f"EXIT:  {symbol} @ {exit_price:.2f} | PnL: ₹{pnl:.2f} ({pnl_pct:.2f}%) | {exit_reason}")
    
    def _update_equity(self, current_date):
        """Update daily equity value."""
        
        position_value = 0
        for symbol, position in self.positions.items():
            if symbol in self.stocks:
                day_data = self.stocks[symbol][self.stocks[symbol]['date'] == current_date]
                if not day_data.empty:
                    current_price = day_data.iloc[0]['close']
                    position_value += position.quantity * current_price
        
        self.equity = self.cash + position_value
        self.equity_curve.append({
            'date': current_date,
            'equity': self.equity,
            'cash': self.cash,
            'positions': len(self.positions)
        })
    
    def get_results(self):
        """Calculate backtest results and metrics."""
        
        if not self.completed_trades:
            print("No trades completed")
            return None
        
        trades_df = pd.DataFrame([{
            'symbol': t.symbol,
            'entry_date': t.entry_date,
            'exit_date': t.exit_date,
            'entry_price': t.entry_price,
            'exit_price': t.exit_price,
            'quantity': t.quantity,
            'pnl': t.pnl,
            'pnl_pct': t.pnl_pct,
            'holding_days': t.holding_days,
            'exit_reason': t.exit_reason
        } for t in self.completed_trades])
        
        equity_df = pd.DataFrame(self.equity_curve)
        
        # Calculate metrics
        total_trades = len(self.completed_trades)
        winning_trades = len([t for t in self.completed_trades if t.pnl > 0])
        losing_trades = total_trades - winning_trades
        
        total_pnl = sum([t.pnl for t in self.completed_trades])
        final_equity = self.equity
        total_return_pct = ((final_equity - self.initial_capital) / self.initial_capital) * 100
        
        if total_trades > 0:
            win_rate = (winning_trades / total_trades) * 100
            avg_pnl_per_trade = total_pnl / total_trades
            avg_win = np.mean([t.pnl for t in self.completed_trades if t.pnl > 0]) if winning_trades > 0 else 0
            avg_loss = np.mean([t.pnl for t in self.completed_trades if t.pnl < 0]) if losing_trades > 0 else 0
            profit_factor = sum([t.pnl for t in self.completed_trades if t.pnl > 0]) / abs(sum([t.pnl for t in self.completed_trades if t.pnl < 0])) if losing_trades > 0 else 0
            risk_reward_ratio = abs(avg_win / avg_loss) if avg_loss != 0 else 0
            expectancy = (win_rate / 100 * avg_win) + ((1 - win_rate / 100) * avg_loss)
            avg_holding_days = np.mean([t.holding_days for t in self.completed_trades])
            avg_holding_winners = np.mean([t.holding_days for t in self.completed_trades if t.pnl > 0]) if winning_trades > 0 else 0
            avg_holding_losers = np.mean([t.holding_days for t in self.completed_trades if t.pnl < 0]) if losing_trades > 0 else 0
        else:
            win_rate = avg_pnl_per_trade = avg_win = avg_loss = profit_factor = 0
            risk_reward_ratio = expectancy = avg_holding_days = 0
            avg_holding_winners = avg_holding_losers = 0
        
        # Drawdown
        running_max = equity_df['equity'].cummax()
        drawdown = (equity_df['equity'] - running_max) / running_max
        max_drawdown_pct = drawdown.min() * 100
        
        # CAGR
        days = (self.backtest_end - self.backtest_start).days
        years = days / 365.25
        cagr = ((final_equity / self.initial_capital) ** (1 / years) - 1) * 100 if years > 0 else 0
        
        results = {
            'trades_df': trades_df,
            'equity_df': equity_df,
            'total_trades': total_trades,
            'winning_trades': winning_trades,
            'losing_trades': losing_trades,
            'win_rate': win_rate,
            'total_pnl': total_pnl,
            'final_equity': final_equity,
            'total_return_pct': total_return_pct,
            'cagr': cagr,
            'max_drawdown_pct': max_drawdown_pct,
            'avg_pnl_per_trade': avg_pnl_per_trade,
            'avg_win': avg_win,
            'avg_loss': avg_loss,
            'profit_factor': profit_factor,
            'risk_reward_ratio': risk_reward_ratio,
            'expectancy': expectancy,
            'avg_holding_days': avg_holding_days,
            'avg_holding_winners': avg_holding_winners,
            'avg_holding_losers': avg_holding_losers
        }
        
        return results


# ============================================================================
# BENCHMARK CALCULATION
# ============================================================================

def calculate_benchmark(stocks, initial_capital):
    """Calculate buy-and-hold benchmark on NIFTY 50 equal-weighted."""
    
    all_dates = set()
    for ticker, df in stocks.items():
        all_dates.update(df['date'].values)
    
    all_dates = sorted(list(all_dates))
    
    if not all_dates:
        return None
    
    start_date = all_dates[0]
    end_date = all_dates[-1]
    
    # Get opening prices at start and closing prices at end
    allocation_per_stock = initial_capital / len(stocks)
    benchmark_equity_curve = []
    total_start_value = 0
    
    for ticker, stock_df in stocks.items():
        start_data = stock_df[stock_df['date'] == start_date]
        end_data = stock_df[stock_df['date'] == end_date]
        
        if not start_data.empty and not end_data.empty:
            start_price = start_data.iloc[0]['close']
            total_start_value += allocation_per_stock
    
    # Calculate equity curve
    for current_date in all_dates:
        total_value = 0
        for ticker, stock_df in stocks.items():
            day_data = stock_df[stock_df['date'] == current_date]
            if not day_data.empty:
                current_price = day_data.iloc[0]['close']
                start_data = stock_df[stock_df['date'] == start_date]
                if not start_data.empty:
                    start_price = start_data.iloc[0]['close']
                    quantity = allocation_per_stock / start_price
                    total_value += quantity * current_price
        
        benchmark_equity_curve.append({
            'date': current_date,
            'equity': total_value if total_value > 0 else initial_capital
        })
    
    benchmark_df = pd.DataFrame(benchmark_equity_curve)
    
    if len(benchmark_df) > 0:
        final_equity = benchmark_df.iloc[-1]['equity']
        total_return = ((final_equity - initial_capital) / initial_capital) * 100
        
        # Drawdown
        running_max = benchmark_df['equity'].cummax()
        drawdown = (benchmark_df['equity'] - running_max) / running_max
        max_drawdown = drawdown.min() * 100
        
        # CAGR
        days = (end_date - start_date).days
        years = days / 365.25
        cagr = ((final_equity / initial_capital) ** (1 / years) - 1) * 100 if years > 0 else 0
        
        return {
            'equity_df': benchmark_df,
            'final_equity': final_equity,
            'total_return': total_return,
            'cagr': cagr,
            'max_drawdown': max_drawdown
        }
    
    return None


# ============================================================================
# OUTPUT & REPORTING
# ============================================================================

def save_results(backtest, benchmark, output_folder):
    """Save backtest results to CSV files."""
    
    output_folder.mkdir(exist_ok=True)
    
    results = backtest.get_results()
    
    if results is None:
        print("No results to save")
        return
    
    # Save trade log
    trades_csv = output_folder / "trades.csv"
    results['trades_df'].to_csv(trades_csv, index=False)
    print(f"✓ Trades saved: {trades_csv}")
    
    # Save equity curve
    equity_csv = output_folder / "equity_curve.csv"
    results['equity_df'].to_csv(equity_csv, index=False)
    print(f"✓ Equity curve saved: {equity_csv}")
    
    # Save summary
    summary_data = {
        'Metric': [
            'Total Trades', 'Winning Trades', 'Losing Trades', 'Win Rate (%)',
            'Final Equity (₹)', 'Total PnL (₹)', 'Total Return (%)', 'CAGR (%)',
            'Max Drawdown (%)', 'Avg PnL/Trade (₹)', 'Avg Win (₹)', 'Avg Loss (₹)',
            'Profit Factor', 'Risk-Reward Ratio', 'Expectancy (₹)',
            'Avg Holding Days', 'Avg Holding Winners (days)', 'Avg Holding Losers (days)'
        ],
        'Strategy': [
            results['total_trades'],
            results['winning_trades'],
            results['losing_trades'],
            f"{results['win_rate']:.2f}",
            f"{results['final_equity']:.2f}",
            f"{results['total_pnl']:.2f}",
            f"{results['total_return_pct']:.2f}",
            f"{results['cagr']:.2f}",
            f"{results['max_drawdown_pct']:.2f}",
            f"{results['avg_pnl_per_trade']:.2f}",
            f"{results['avg_win']:.2f}",
            f"{results['avg_loss']:.2f}",
            f"{results['profit_factor']:.2f}",
            f"{results['risk_reward_ratio']:.2f}",
            f"{results['expectancy']:.2f}",
            f"{results['avg_holding_days']:.2f}",
            f"{results['avg_holding_winners']:.2f}",
            f"{results['avg_holding_losers']:.2f}"
        ]
    }
    
    if benchmark:
        summary_data['Benchmark'] = [
            '', '', '', '',
            f"{benchmark['final_equity']:.2f}",
            '',
            f"{benchmark['total_return']:.2f}",
            f"{benchmark['cagr']:.2f}",
            f"{benchmark['max_drawdown']:.2f}",
            '', '', '', '', '', '',
            '', '', ''
        ]
    
    summary_df = pd.DataFrame(summary_data)
    summary_csv = output_folder / "summary.csv"
    summary_df.to_csv(summary_csv, index=False)
    print(f"✓ Summary saved: {summary_csv}")
    
    # Save readable trade log
    trades_txt = output_folder / "trades_readable.txt"
    with open(trades_txt, 'w') as f:
        f.write("="*100 + "\n")
        f.write("DETAILED TRADE LOG\n")
        f.write("="*100 + "\n\n")
        
        for idx, trade in results['trades_df'].iterrows():
            f.write(f"Trade #{idx + 1}\n")
            f.write(f"  Symbol:       {trade['symbol']}\n")
            f.write(f"  Entry Date:   {trade['entry_date'].strftime('%Y-%m-%d')}\n")
            f.write(f"  Exit Date:    {trade['exit_date'].strftime('%Y-%m-%d')}\n")
            f.write(f"  Entry Price:  ₹{trade['entry_price']:.2f}\n")
            f.write(f"  Exit Price:   ₹{trade['exit_price']:.2f}\n")
            f.write(f"  Quantity:     {trade['quantity']:.0f} shares\n")
            f.write(f"  PnL:          ₹{trade['pnl']:.2f} ({trade['pnl_pct']:.2f}%)\n")
            f.write(f"  Holding Days: {trade['holding_days']}\n")
            f.write(f"  Exit Reason:  {trade['exit_reason']}\n")
            f.write("\n")
    
    print(f"✓ Readable log saved: {trades_txt}")
    
    return results, summary_csv, trades_txt


def print_report(backtest, benchmark, results):
    """Print backtest report to console."""
    
    print("\n" + "="*80)
    print("BACKTEST COMPLETED")
    print("="*80)
    
    print(f"\nParameters Used:")
    print(f"  - Initial Capital: ₹{INITIAL_CAPITAL:,.0f}")
    print(f"  - Allocation per Trade: ₹{ALLOCATION_PER_TRADE:,.0f}")
    print(f"  - Max Concurrent Positions: {MAX_CONCURRENT_POSITIONS}")
    print(f"  - Entry Slippage: {ENTRY_SLIPPAGE*100:.2f}%")
    print(f"  - Exit Slippage: {EXIT_SLIPPAGE*100:.2f}%")
    print(f"  - Commission per Trade: ₹{COMMISSION_PER_TRADE}")
    
    print(f"\nStrategy Summary:")
    print(f"  - Backtest Period: {backtest.backtest_start} to {backtest.backtest_end}")
    print(f"  - Final Equity: ₹{results['final_equity']:,.2f}")
    print(f"  - Total Return: {results['total_return_pct']:.2f}%")
    print(f"  - CAGR: {results['cagr']:.2f}%")
    print(f"  - Max Drawdown: {results['max_drawdown_pct']:.2f}%")
    print(f"  - Total Trades: {results['total_trades']}")
    print(f"  - Winning Trades: {results['winning_trades']} ({results['win_rate']:.2f}%)")
    print(f"  - Losing Trades: {results['losing_trades']}")
    print(f"  - Avg PnL per Trade: ₹{results['avg_pnl_per_trade']:.2f}")
    print(f"  - Avg Winning Trade: ₹{results['avg_win']:.2f}")
    print(f"  - Avg Losing Trade: ₹{results['avg_loss']:.2f}")
    print(f"  - Risk-Reward Ratio: {results['risk_reward_ratio']:.2f}")
    print(f"  - Profit Factor: {results['profit_factor']:.2f}")
    print(f"  - Expectancy per Trade: ₹{results['expectancy']:.2f}")
    print(f"  - Avg Holding Days: {results['avg_holding_days']:.1f}")
    print(f"  - Avg Holding (Winners): {results['avg_holding_winners']:.1f} days")
    print(f"  - Avg Holding (Losers): {results['avg_holding_losers']:.1f} days")
    
    if benchmark:
        print(f"\nBenchmark (Equal-Weighted Buy-Hold):")
        print(f"  - Final Equity: ₹{benchmark['final_equity']:,.2f}")
        print(f"  - Total Return: {benchmark['total_return']:.2f}%")
        print(f"  - CAGR: {benchmark['cagr']:.2f}%")
        print(f"  - Max Drawdown: {benchmark['max_drawdown']:.2f}%")
    
    print(f"\n✓ Full trade log saved")
    print(f"\n" + "="*80 + "\n")


# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    print("\n" + "="*80)
    print("BACKTESTING WORKFLOW - STEP 2")
    print("="*80 + "\n")
    
    # Load data
    stocks = load_all_stocks(DATA_FOLDER)
    
    if not stocks:
        print("✗ No stocks loaded. Run Step 1 first.")
    else:
        # Run backtest
        backtest = Backtest(stocks, INITIAL_CAPITAL, ALLOCATION_PER_TRADE, MAX_CONCURRENT_POSITIONS)
        backtest.run()
        
        # Calculate benchmark
        benchmark = calculate_benchmark(stocks, INITIAL_CAPITAL)
        
        # Get results
        results = backtest.get_results()
        
        if results:
            # Save results
            results, summary_path, trades_path = save_results(backtest, benchmark, OUTPUT_FOLDER)
            
            # Print report
            print_report(backtest, benchmark, results)
            
            print(f"✓ Full results saved to: {OUTPUT_FOLDER.absolute()}")
            print(f"  - Summary:      {summary_path}")
            print(f"  - Trade Log:    {trades_path}")
            print(f"✓ Backtest complete!")
