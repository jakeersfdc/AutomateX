"""
STEP 1: Backtesting Workflow - Data Gathering
=============================================
Download daily OHLCV data for Indian market stocks from Yahoo Finance.
Saves data locally for later backtesting.

Features:
- Downloads from Yahoo Finance (reliable, free)
- Handles failed downloads gracefully
- Saves individual ticker CSVs + combined CSV
- Includes progress tracking and logging
"""

import pandas as pd
import yfinance as yf
from pathlib import Path
from datetime import datetime, timedelta
import time

# ============================================================================
# CONFIGURATION
# ============================================================================

# Universe: NIFTY 50 tickers (as of June 2026)
NIFTY50_TICKERS = [
    "RELIANCE.NS", "TCS.NS", "INFY.NS", "HINDUNILVR.NS", "ICICIBANK.NS",
    "HDFC.NS", "HDFCBANK.NS", "MARUTI.NS", "BAJAJFINSV.NS", "BAJAJ-AUTO.NS",
    "TATASTEEL.NS", "TATAMOTORS.NS", "LT.NS", "ASIANPAINT.NS", "SBIN.NS",
    "SUNPHARMA.NS", "WIPRO.NS", "JSWSTEEL.NS", "KOTAKBANK.NS", "NTPC.NS",
    "ONGC.NS", "POWERGRID.NS", "COALINDIA.NS", "ULTRACEMCO.NS", "BPCL.NS",
    "IOCL.NS", "GRASIM.NS", "ADANIPORTS.NS", "ADANIGREEN.NS", "ADANIEQ.NS",
    "ADANIENT.NS", "APOLLOHOSP.NS", "AXISBANK.NS", "BHARTIARTL.NS", "CIPLA.NS",
    "DIVISLAB.NS", "EICHERMOT.NS", "ESCORTS.NS", "INDIGO.NS", "INDUSINDBK.NS",
    "LRKT.NS", "M&M.NS", "MCDOWELL-N.NS", "NESTLEIND.NS", "PGHH.NS",
    "PIDILITIND.NS", "SBFMSFB.NS", "SHREECEM.NS", "SIEMENS.NS", "TECHM.NS"
]

# Output settings
DATA_FOLDER = Path("backtest_data")
LOOKBACK_DAYS = 365 * 5  # 5 years of daily data
START_DATE = (datetime.now() - timedelta(days=LOOKBACK_DAYS)).strftime("%Y-%m-%d")
END_DATE = datetime.now().strftime("%Y-%m-%d")

# ============================================================================
# SETUP
# ============================================================================

def setup_output_folder():
    """Create output folder if it doesn't exist."""
    DATA_FOLDER.mkdir(exist_ok=True)
    print(f"✓ Output folder: {DATA_FOLDER.absolute()}")


# ============================================================================
# DATA DOWNLOADING
# ============================================================================

def download_stock_data(ticker, start_date, end_date, max_retries=3):
    """
    Download daily OHLCV data for a single stock.
    
    Returns:
        pd.DataFrame or None if download fails
    """
    for attempt in range(max_retries):
        try:
            df = yf.download(
                ticker,
                start=start_date,
                end=end_date,
                progress=False,
                timeout=10
            )
            
            if df.empty:
                return None
            
            # Flatten multi-index columns if present
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.droplevel(1)
            
            # Standardize column names to lowercase
            df.columns = [col.lower() for col in df.columns]
            
            # Rename adj close if present
            if 'adj close' in df.columns:
                df = df.rename(columns={'adj close': 'adjclose'})
            
            # Reset index to make date a column
            df = df.reset_index()
            df.columns = [col.lower() for col in df.columns]
            
            # Ensure date column name is consistent
            if 'date' not in df.columns:
                if 'index' in df.columns:
                    df = df.rename(columns={'index': 'date'})
            
            # Add symbol column
            df['symbol'] = ticker
            
            # Select required columns
            required_cols = ['date', 'open', 'high', 'low', 'close', 'volume', 'symbol']
            if 'adjclose' in df.columns:
                required_cols.insert(5, 'adjclose')
            
            df = df[required_cols]
            
            # Convert date to datetime
            df['date'] = pd.to_datetime(df['date'])
            
            # Convert OHLCV to numeric
            for col in ['open', 'high', 'low', 'close', 'volume']:
                if col in df.columns:
                    df[col] = pd.to_numeric(df[col], errors='coerce')
            
            if 'adjclose' in df.columns:
                df['adjclose'] = pd.to_numeric(df['adjclose'], errors='coerce')
            
            # Drop NaN rows
            df = df.dropna()
            
            if df.empty:
                return None
            
            # Sort by date
            df = df.sort_values('date').reset_index(drop=True)
            
            return df
        
        except Exception as e:
            if attempt == max_retries - 1:
                return None
            time.sleep(1)
    
    return None


def save_ticker_csv(df, ticker):
    """Save individual ticker CSV."""
    csv_path = DATA_FOLDER / f"{ticker}.csv"
    df.to_csv(csv_path, index=False)
    return csv_path


# ============================================================================
# MAIN DOWNLOAD WORKFLOW
# ============================================================================

def run_data_download(tickers, start_date, end_date):
    """Download data for all tickers and save locally."""
    
    setup_output_folder()
    
    print(f"\n{'='*70}")
    print(f"DATA DOWNLOAD - NIFTY 50 Universe")
    print(f"{'='*70}")
    print(f"Period: {start_date} to {end_date}")
    print(f"Tickers: {len(tickers)}")
    print(f"Output: {DATA_FOLDER.absolute()}\n")
    
    successful_tickers = []
    failed_tickers = []
    all_data = []
    
    # Download data for each ticker
    for i, ticker in enumerate(tickers, 1):
        print(f"[{i:2d}/{len(tickers)}] Downloading {ticker}...", end=" ", flush=True)
        
        df = download_stock_data(ticker, start_date, end_date)
        
        if df is not None and len(df) > 0:
            save_ticker_csv(df, ticker)
            successful_tickers.append(ticker)
            all_data.append(df)
            print(f"✓ ({len(df)} rows)")
            time.sleep(0.5)  # Rate limiting
        else:
            failed_tickers.append(ticker)
            print(f"✗ Failed")
    
    # Combine all data
    if all_data:
        combined_df = pd.concat(all_data, ignore_index=True)
        combined_path = DATA_FOLDER / "combined_data.csv"
        combined_df.to_csv(combined_path, index=False)
        print(f"\n✓ Combined data saved: {combined_path}")
    
    # Save constituents list
    constituents_path = DATA_FOLDER / "constituents.csv"
    constituents_df = pd.DataFrame({
        'symbol': successful_tickers,
        'status': 'success'
    })
    constituents_df.to_csv(constituents_path, index=False)
    print(f"✓ Constituents list saved: {constituents_path}")
    
    # Save failed downloads if any
    if failed_tickers:
        failed_path = DATA_FOLDER / "failed_downloads.csv"
        failed_df = pd.DataFrame({
            'symbol': failed_tickers,
            'status': 'failed'
        })
        failed_df.to_csv(failed_path, index=False)
        print(f"✓ Failed downloads log saved: {failed_path}")
    
    # Print summary
    print(f"\n{'='*70}")
    print(f"DOWNLOAD SUMMARY")
    print(f"{'='*70}")
    print(f"Total tickers attempted: {len(tickers)}")
    print(f"Successful downloads: {len(successful_tickers)}")
    print(f"Failed downloads: {len(failed_tickers)}")
    print(f"Data folder: {DATA_FOLDER.absolute()}")
    print(f"{'='*70}\n")
    
    return successful_tickers, failed_tickers


if __name__ == "__main__":
    successful, failed = run_data_download(NIFTY50_TICKERS, START_DATE, END_DATE)
    print("\n✓ Step 1 complete. Ready for backtesting.")
    print(f"\nNext: Run Step 2 backtesting script using data from: {DATA_FOLDER.absolute()}")
