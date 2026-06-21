#!/usr/bin/env python3
"""
Train an ensemble ML model for buy/sell signals for a given symbol.
Uses XGBoost + LightGBM + GradientBoosting with 30+ technical features.
Walk-forward cross-validation for robust out-of-sample evaluation.

Saves model to ml/models/{symbol}.joblib

Usage: python train.py --symbol RELIANCE.NS --start 2018-01-01 --end 2024-12-31
"""
import argparse
import os
import warnings
from datetime import datetime
from typing import Dict, List, Optional
import json
import urllib.parse
import urllib.request
import pandas as pd
import numpy as np
import yfinance as yf
from ta.momentum import RSIIndicator, StochasticOscillator, WilliamsRIndicator
from ta.trend import MACD, ADXIndicator, CCIIndicator, EMAIndicator, SMAIndicator
from ta.volatility import BollingerBands, AverageTrueRange
from ta.volume import OnBalanceVolumeIndicator, MFIIndicator, VolumeWeightedAveragePrice
from sklearn.ensemble import GradientBoostingClassifier, VotingClassifier, RandomForestClassifier
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import classification_report, f1_score, precision_score, recall_score
from sklearn.calibration import CalibratedClassifierCV
from sklearn.preprocessing import StandardScaler
import joblib

warnings.filterwarnings('ignore')

try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except ImportError:
    HAS_XGB = False

try:
    from lightgbm import LGBMClassifier
    HAS_LGBM = True
except ImportError:
    HAS_LGBM = False


FEATURE_COLS = [
    'sma5', 'sma10', 'sma20', 'sma50', 'ema12', 'ema26',
    'rsi14', 'rsi7',
    'macd', 'macd_signal', 'macd_hist',
    'bb_upper', 'bb_lower', 'bb_width', 'bb_pct',
    'atr14',
    'adx14', 'cci20',
    'stoch_k', 'stoch_d', 'williams_r',
    'obv_slope',
    'volatility', 'volatility20',
    'ma_diff', 'ma_diff_10_50',
    'return1', 'return3', 'return5',
    'volume_ratio',
    'close_to_sma20', 'close_to_sma50',
    'high_low_range',
]


def compute_features(df: pd.DataFrame) -> pd.DataFrame:
    """Compute 30+ technical indicator features from OHLCV data."""
    df = df.copy()
    # Normalize column names
    for col in ['Close', 'Open', 'High', 'Low', 'Volume']:
        if col in df.columns:
            df[col.lower()] = df[col]

    c = df['close']
    h = df['high'] if 'high' in df.columns else c
    l = df['low'] if 'low' in df.columns else c
    v = df['volume'] if 'volume' in df.columns else pd.Series(0, index=df.index)

    # Moving Averages
    df['sma5'] = c.rolling(5).mean()
    df['sma10'] = c.rolling(10).mean()
    df['sma20'] = c.rolling(20).mean()
    df['sma50'] = c.rolling(50).mean()
    ema12 = EMAIndicator(c, window=12)
    ema26 = EMAIndicator(c, window=26)
    df['ema12'] = ema12.ema_indicator()
    df['ema26'] = ema26.ema_indicator()

    # RSI
    rsi14 = RSIIndicator(c, window=14)
    rsi7 = RSIIndicator(c, window=7)
    df['rsi14'] = rsi14.rsi()
    df['rsi7'] = rsi7.rsi()

    # MACD
    macd = MACD(c, window_slow=26, window_fast=12, window_sign=9)
    df['macd'] = macd.macd()
    df['macd_signal'] = macd.macd_signal()
    df['macd_hist'] = macd.macd_diff()

    # Bollinger Bands
    bb = BollingerBands(c, window=20, window_dev=2)
    df['bb_upper'] = bb.bollinger_hband()
    df['bb_lower'] = bb.bollinger_lband()
    df['bb_width'] = (df['bb_upper'] - df['bb_lower']) / (c + 1e-9)
    df['bb_pct'] = bb.bollinger_pband()

    # ATR
    atr = AverageTrueRange(h, l, c, window=14)
    df['atr14'] = atr.average_true_range()

    # ADX
    adx = ADXIndicator(h, l, c, window=14)
    df['adx14'] = adx.adx()

    # CCI
    cci = CCIIndicator(h, l, c, window=20)
    df['cci20'] = cci.cci()

    # Stochastic
    stoch = StochasticOscillator(h, l, c, window=14, smooth_window=3)
    df['stoch_k'] = stoch.stoch()
    df['stoch_d'] = stoch.stoch_signal()

    # Williams %R
    wr = WilliamsRIndicator(h, l, c, lbp=14)
    df['williams_r'] = wr.williams_r()

    # OBV slope
    try:
        obv = OnBalanceVolumeIndicator(c, v)
        df['obv_slope'] = obv.on_balance_volume().pct_change(5)
    except Exception:
        df['obv_slope'] = 0

    # Volatility
    df['return1'] = c.pct_change(1)
    df['return3'] = c.pct_change(3)
    df['return5'] = c.pct_change(5)
    df['volatility'] = df['return1'].rolling(10).std()
    df['volatility20'] = df['return1'].rolling(20).std()

    # MA differences (normalized)
    df['ma_diff'] = (df['sma5'] - df['sma20']) / (df['sma20'] + 1e-9)
    df['ma_diff_10_50'] = (df['sma10'] - df['sma50']) / (df['sma50'] + 1e-9)

    # Volume ratio (current vs 20-day avg)
    df['volume_ratio'] = v / (v.rolling(20).mean() + 1)

    # Price relative to SMAs
    df['close_to_sma20'] = (c - df['sma20']) / (df['sma20'] + 1e-9)
    df['close_to_sma50'] = (c - df['sma50']) / (df['sma50'] + 1e-9)

    # High-low range
    df['high_low_range'] = (h - l) / (c + 1e-9)

    df = df.dropna()
    return df


def _normalize_interval(interval: str) -> str:
    interval = interval.lower().strip()
    if interval == '1h':
        return '60m'
    if interval == '1d':
        return '1d'
    return interval


def _default_intraday_period(interval: str) -> str:
    interval = interval.lower().strip()
    if interval in ['1m', '2m', '5m']:
        return '30d'
    if interval in ['15m', '30m']:
        return '60d'
    if interval in ['60m', '1h']:
        return '730d'
    return '730d'


def _load_from_polygon(symbol: str, interval: str, start: Optional[str], end: Optional[str]) -> pd.DataFrame:
    api_key = os.environ.get('POLYGON_API_KEY')
    if not api_key:
        raise RuntimeError('POLYGON_API_KEY must be set to use provider=polygon')

    interval = interval.lower().strip()
    if interval == '1h':
        interval = '60m'
    if interval not in ['1m', '2m', '5m', '15m', '30m', '60m']:
        raise RuntimeError(f'Unsupported polygon interval: {interval}')

    if not start or not end:
        raise RuntimeError('start and end dates are required for polygon provider')

    from_date = datetime.fromisoformat(start).strftime('%Y-%m-%d')
    to_date = datetime.fromisoformat(end).strftime('%Y-%m-%d')
    encoded_symbol = urllib.parse.quote(symbol, safe='')
    url = (
        f'https://api.polygon.io/v2/aggs/ticker/{encoded_symbol}/range/1/{interval}/{from_date}/{to_date}'
        f'?adjusted=true&sort=asc&limit=50000&apiKey={urllib.parse.quote(api_key)}'
    )

    with urllib.request.urlopen(url) as resp:
        body = resp.read()
        payload = json.loads(body.decode('utf-8'))

    if not payload.get('results'):
        raise RuntimeError('Polygon returned no data for symbol ' + symbol)

    rows = []
    for item in payload['results']:
        rows.append({
            'date': datetime.utcfromtimestamp(item['t'] / 1000),
            'open': item['o'],
            'high': item['h'],
            'low': item['l'],
            'close': item['c'],
            'volume': item['v'],
        })
    df = pd.DataFrame(rows).set_index('date')
    return df


def load_ohlcv(symbol: str, interval: str = '1d', period: Optional[str] = None, start: Optional[str] = None, end: Optional[str] = None, csv_path: Optional[str] = None, provider: Optional[str] = None) -> pd.DataFrame:
    """Load OHLCV data for a symbol, using a provider, CSV fallback, or yfinance history."""
    if csv_path:
        if not os.path.exists(csv_path):
            raise RuntimeError(f'CSV path not found: {csv_path}')
        df = pd.read_csv(csv_path, parse_dates=True, index_col=0)
        if df.empty:
            raise RuntimeError('CSV data is empty')
        return df

    interval = _normalize_interval(interval)
    if period is None:
        period = _default_intraday_period(interval)

    if provider == 'polygon':
        return _load_from_polygon(symbol, interval, start, end)

    if interval in ['1d', '1wk', '1mo']:
        df = yf.download(symbol, start=start, end=end, interval=interval, period=period, progress=False)
    else:
        df = yf.download(symbol, period=period, interval=interval, progress=False)

    if df is None or df.shape[0] < 100:
        raise RuntimeError('insufficient historical data for interval ' + interval)
    return df


def build_labels(df: pd.DataFrame, horizon=1, threshold=0.005) -> pd.Series:
    """Label: 1 if price rises > threshold in next horizon bars, else 0."""
    future = df['close'].shift(-horizon)
    ret = (future - df['close']) / df['close']
    labels = (ret > threshold).astype(int)
    return labels


def walk_forward_validate(X, y, n_splits=5):
    """Walk-forward time-series cross-validation returning avg metrics."""
    tscv = TimeSeriesSplit(n_splits=n_splits)
    f1s, precs, recs = [], [], []
    for train_idx, test_idx in tscv.split(X):
        X_tr, X_te = X.iloc[train_idx], X.iloc[test_idx]
        y_tr, y_te = y.iloc[train_idx], y.iloc[test_idx]
        if y_tr.sum() < 5 or (y_tr == 0).sum() < 5:
            continue
        clf = GradientBoostingClassifier(n_estimators=200, max_depth=4, random_state=42)
        clf.fit(X_tr, y_tr)
        preds = clf.predict(X_te)
        f1s.append(f1_score(y_te, preds, zero_division=0))
        precs.append(precision_score(y_te, preds, zero_division=0))
        recs.append(recall_score(y_te, preds, zero_division=0))
    return {
        'avg_f1': float(np.mean(f1s)) if f1s else 0,
        'avg_precision': float(np.mean(precs)) if precs else 0,
        'avg_recall': float(np.mean(recs)) if recs else 0,
        'n_folds': len(f1s),
    }


def train_for_symbol(
    symbol: str,
    start: str = None,
    end: str = None,
    interval: str = '1d',
    period: str = None,
    horizons: Optional[List[int]] = None,
    threshold: float = 0.005,
    out_dir: str = 'ml/models',
    csv_path: Optional[str] = None,
    provider: Optional[str] = None,
):
    if horizons is None:
        horizons = [1]
    print(f"Training for {symbol} interval={interval} horizons={horizons} start={start} end={end} period={period} provider={provider}")
    df = load_ohlcv(symbol, interval=interval, period=period, start=start, end=end, csv_path=csv_path, provider=provider)
    if df is None or df.shape[0] < 100:
        raise RuntimeError('insufficient historical data (need 100+ bars)')

    features = compute_features(df)
    if features.empty:
        raise RuntimeError('no features generated from historical data')

    X = features[FEATURE_COLS]
    scaler = StandardScaler()
    X_scaled = pd.DataFrame(scaler.fit_transform(X), columns=X.columns, index=X.index)

    models: Dict[str, Any] = {}
    horizon_metrics: Dict[str, Dict[str, float]] = {}

    for horizon in horizons:
        labels = build_labels(features, horizon=horizon, threshold=threshold)
        data = features.copy()
        data['label'] = labels
        data = data.dropna()
        if data.empty or data.shape[0] < 100:
            print(f"Skipping horizon={horizon}: insufficient labeled data after feature build")
            continue

        X_h = X_scaled.loc[data.index]
        y_h = data['label']

        wf_metrics = walk_forward_validate(X_h, y_h, n_splits=5)
        print(f"Horizon {horizon}: Walk-forward CV: F1={wf_metrics['avg_f1']:.3f} Prec={wf_metrics['avg_precision']:.3f} Rec={wf_metrics['avg_recall']:.3f}")

        split_idx = int(len(X_h) * 0.8)
        X_train, X_test = X_h.iloc[:split_idx], X_h.iloc[split_idx:]
        y_train, y_test = y_h.iloc[:split_idx], y_h.iloc[split_idx:]

        estimators = []
        gb = GradientBoostingClassifier(
            n_estimators=300, max_depth=4, learning_rate=0.05,
            subsample=0.8, min_samples_leaf=20, random_state=42
        )
        estimators.append(('gb', gb))

        rf = RandomForestClassifier(
            n_estimators=300, max_depth=6, min_samples_leaf=20,
            random_state=42, n_jobs=-1
        )
        estimators.append(('rf', rf))

        if HAS_XGB:
            xgb = XGBClassifier(
                n_estimators=300, max_depth=4, learning_rate=0.05,
                subsample=0.8, colsample_bytree=0.8,
                min_child_weight=20, eval_metric='logloss',
                random_state=42, verbosity=0
            )
            estimators.append(('xgb', xgb))

        if HAS_LGBM:
            lgbm = LGBMClassifier(
                n_estimators=300, max_depth=4, learning_rate=0.05,
                subsample=0.8, colsample_bytree=0.8,
                min_child_weight=20, random_state=42, verbose=-1
            )
            estimators.append(('lgbm', lgbm))

        print(f"Horizon {horizon}: Ensemble models: {[n for n, _ in estimators]}")
        ensemble = VotingClassifier(estimators=estimators, voting='soft', n_jobs=-1)
        ensemble.fit(X_train, y_train)

        calibrated = CalibratedClassifierCV(ensemble, cv=3, method='isotonic')
        calibrated.fit(X_train, y_train)

        preds = calibrated.predict(X_test)
        f1 = f1_score(y_test, preds, zero_division=0)
        rep = classification_report(y_test, preds, output_dict=False, zero_division=0)
        print(f'\nHorizon {horizon} Test F1: {f1:.4f}')
        print('Classification report:\n', rep)

        models[str(horizon)] = calibrated
        horizon_metrics[str(horizon)] = {
            'test_f1': float(f1),
            'walk_forward': wf_metrics,
            'samples': int(len(y_h)),
            'positive_ratio': float(y_h.mean()),
        }

    if not models:
        raise RuntimeError('no valid horizon models were trained')

    os.makedirs(out_dir, exist_ok=True)
    model_path = os.path.join(out_dir, f"{symbol.replace('/', '_')}.joblib")
    bundle = {
        'models': models,
        'scaler': scaler,
        'columns': FEATURE_COLS,
        'symbol': symbol,
        'interval': interval,
        'horizons': horizons,
        'threshold': threshold,
        'provider': provider,
        'train_end': str(end or datetime.today().strftime('%Y-%m-%d')),
        'metrics': horizon_metrics,
        'version': '3.0',
    }
    joblib.dump(bundle, model_path)
    print('Saved model to', model_path)
    return model_path


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--symbol', required=True)
    p.add_argument('--start', default='2018-01-01')
    p.add_argument('--end', default=datetime.today().strftime('%Y-%m-%d'))
    p.add_argument('--interval', default='1d', help='OHLCV interval: 1d, 1h, 15m, 5m, etc.')
    p.add_argument('--period', default=None, help='Historical period for intraday data (e.g. 60d)')
    p.add_argument('--horizons', default='1', help='Comma-separated horizon steps in bars, e.g. 1,3,5')
    p.add_argument('--threshold', type=float, default=0.005, help='Minimum return threshold for a positive label')
    p.add_argument('--csv', default=None, help='Optional CSV path containing OHLCV data')
    p.add_argument('--provider', default=None, help='Optional data provider: polygon')
    p.add_argument('--out', default='ml/models')
    args = p.parse_args()

    horizons = [int(x) for x in args.horizons.split(',') if x.strip().isdigit()]
    model = train_for_symbol(
        args.symbol,
        start=args.start,
        end=args.end,
        interval=args.interval,
        period=args.period,
        horizons=horizons,
        threshold=args.threshold,
        out_dir=args.out,
        csv_path=args.csv,
        provider=args.provider,
    )
    print(model)


if __name__ == '__main__':
    main()
