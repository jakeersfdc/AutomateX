#!/usr/bin/env python3
"""
Load a joblib model and produce a prediction for the latest bar of a symbol.
Supports both v1 (6-feature) and v2 (30+-feature ensemble) models.
Outputs JSON to stdout.

Usage: python ml/predict.py --symbol RELIANCE.NS --model ml/models/RELIANCE.NS.joblib
"""
import argparse
import json
import os
import urllib.parse
import urllib.request
import warnings
import joblib
import numpy as np
import yfinance as yf
import pandas as pd
from typing import Any, Dict, Optional
from ta.momentum import RSIIndicator, StochasticOscillator, WilliamsRIndicator
from ta.trend import MACD, ADXIndicator, CCIIndicator, EMAIndicator
from ta.volatility import BollingerBands, AverageTrueRange
from ta.volume import OnBalanceVolumeIndicator

warnings.filterwarnings('ignore')

FEATURE_COLS_V2 = [
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

FEATURE_COLS_V1 = ['sma5', 'sma20', 'rsi14', 'volatility', 'ma_diff', 'return1']


def compute_features_v2(df: pd.DataFrame) -> pd.DataFrame:
    """Compute 30+ technical indicator features from OHLCV data."""
    df = df.copy()
    for col in ['Close', 'Open', 'High', 'Low', 'Volume']:
        if col in df.columns:
            df[col.lower()] = df[col]

    c = df['close']
    h = df.get('high', c)
    l = df.get('low', c)
    v = df.get('volume', pd.Series(0, index=df.index))

    df['sma5'] = c.rolling(5).mean()
    df['sma10'] = c.rolling(10).mean()
    df['sma20'] = c.rolling(20).mean()
    df['sma50'] = c.rolling(50).mean()
    df['ema12'] = EMAIndicator(c, window=12).ema_indicator()
    df['ema26'] = EMAIndicator(c, window=26).ema_indicator()
    df['rsi14'] = RSIIndicator(c, window=14).rsi()
    df['rsi7'] = RSIIndicator(c, window=7).rsi()

    macd = MACD(c, window_slow=26, window_fast=12, window_sign=9)
    df['macd'] = macd.macd()
    df['macd_signal'] = macd.macd_signal()
    df['macd_hist'] = macd.macd_diff()

    bb = BollingerBands(c, window=20, window_dev=2)
    df['bb_upper'] = bb.bollinger_hband()
    df['bb_lower'] = bb.bollinger_lband()
    df['bb_width'] = (df['bb_upper'] - df['bb_lower']) / (c + 1e-9)
    df['bb_pct'] = bb.bollinger_pband()

    df['atr14'] = AverageTrueRange(h, l, c, window=14).average_true_range()
    df['adx14'] = ADXIndicator(h, l, c, window=14).adx()
    df['cci20'] = CCIIndicator(h, l, c, window=20).cci()

    stoch = StochasticOscillator(h, l, c, window=14, smooth_window=3)
    df['stoch_k'] = stoch.stoch()
    df['stoch_d'] = stoch.stoch_signal()
    df['williams_r'] = WilliamsRIndicator(h, l, c, lbp=14).williams_r()

    try:
        df['obv_slope'] = OnBalanceVolumeIndicator(c, v).on_balance_volume().pct_change(5)
    except Exception:
        df['obv_slope'] = 0

    df['return1'] = c.pct_change(1)
    df['return3'] = c.pct_change(3)
    df['return5'] = c.pct_change(5)
    df['volatility'] = df['return1'].rolling(10).std()
    df['volatility20'] = df['return1'].rolling(20).std()
    df['ma_diff'] = (df['sma5'] - df['sma20']) / (df['sma20'] + 1e-9)
    df['ma_diff_10_50'] = (df['sma10'] - df['sma50']) / (df['sma50'] + 1e-9)
    df['volume_ratio'] = v / (v.rolling(20).mean() + 1)
    df['close_to_sma20'] = (c - df['sma20']) / (df['sma20'] + 1e-9)
    df['close_to_sma50'] = (c - df['sma50']) / (df['sma50'] + 1e-9)
    df['high_low_range'] = (h - l) / (c + 1e-9)

    df = df.dropna()
    return df


def compute_features_v1(df: pd.DataFrame) -> pd.DataFrame:
    """Legacy 6-feature computation for v1 models."""
    df = df.copy()
    df['close'] = df['Close']
    df['return1'] = df['close'].pct_change()
    df['sma5'] = df['close'].rolling(5).mean()
    df['sma20'] = df['close'].rolling(20).mean()
    df['rsi14'] = RSIIndicator(df['close'], window=14).rsi()
    df['volatility'] = df['return1'].rolling(10).std()
    df['ma_diff'] = (df['sma5'] - df['sma20']) / (df['sma20'] + 1e-9)
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

    from datetime import datetime
    encoded_symbol = urllib.parse.quote(symbol, safe='')
    from_date = datetime.fromisoformat(start).strftime('%Y-%m-%d')
    to_date = datetime.fromisoformat(end).strftime('%Y-%m-%d')
    url = (
        f'https://api.polygon.io/v2/aggs/ticker/{encoded_symbol}/range/1/{interval}/{from_date}/{to_date}'
        f'?adjusted=true&sort=asc&limit=50000&apiKey={urllib.parse.quote(api_key)}'
    )
    with urllib.request.urlopen(url) as resp:
        payload = json.loads(resp.read().decode('utf-8'))
    if not payload.get('results'):
        raise RuntimeError('Polygon returned no data for symbol ' + symbol)
    rows = [
        {
            'date': datetime.utcfromtimestamp(item['t'] / 1000),
            'open': item['o'],
            'high': item['h'],
            'low': item['l'],
            'close': item['c'],
            'volume': item['v'],
        }
        for item in payload['results']
    ]
    df = pd.DataFrame(rows).set_index('date')
    return df


def load_ohlcv(symbol: str, interval: str = '1d', period: Optional[str] = None, csv_path: Optional[str] = None, provider: Optional[str] = None, start: Optional[str] = None, end: Optional[str] = None) -> pd.DataFrame:
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

    df = yf.download(symbol, period=period, interval=interval, progress=False)

    if df is None or df.shape[0] < 60:
        raise RuntimeError('insufficient data')
    return df


def load_model_bundle(path: str) -> Dict[str, Any]:
    bundle = joblib.load(path)
    if isinstance(bundle, dict):
        return bundle
    return {
        'model': bundle,
        'version': '1.0',
        'columns': FEATURE_COLS_V1,
        'interval': '1d',
        'horizons': [1],
    }


def predict_from_bundle(bundle: Dict[str, Any], symbol: str, interval: str = '1d', period: Optional[str] = None, provider: Optional[str] = None, csv_path: Optional[str] = None) -> Dict[str, Any]:
    interval = _normalize_interval(interval)
    provider = provider or bundle.get('provider')
    df = load_ohlcv(symbol, interval=interval, period=period, provider=provider, csv_path=csv_path)

    version = bundle.get('version', '1.0')
    scaler = bundle.get('scaler')
    columns = bundle.get('columns')
    is_v2 = version >= '2.0' or (columns is not None and len(columns) > 10)

    if is_v2:
        feats = compute_features_v2(df)
        feature_cols = FEATURE_COLS_V2
    else:
        feats = compute_features_v1(df)
        feature_cols = FEATURE_COLS_V1

    if feats.empty:
        return {'error': 'no features generated'}

    last = feats.iloc[-1:]
    X = last[feature_cols]
    if scaler is not None:
        X = pd.DataFrame(scaler.transform(X), columns=X.columns, index=X.index)

    models = bundle.get('models')
    predictions = []
    if models:
        for horizon_key, estimator_bundle in models.items():
            estimator = estimator_bundle.get('model') if isinstance(estimator_bundle, dict) and 'model' in estimator_bundle else estimator_bundle
            prob_buy = None
            try:
                probs = estimator.predict_proba(X)[0]
                prob_buy = float(probs[1]) if len(probs) > 1 else float(probs[0])
            except Exception:
                pred = int(estimator.predict(X)[0])
                prob_buy = 1.0 if pred == 1 else 0.0
            last_close = float(last['close'].values[0])
            atr_val = float(last['atr14'].values[0]) if 'atr14' in last.columns else None
            action, entry, stop, target, confidence = recommend_from_prob(prob_buy, last_close, atr_val)
            strength = min(100, int(abs(prob_buy - 0.5) * 200))
            predictions.append({
                'horizon': int(horizon_key),
                'prob_buy': round(prob_buy, 4),
                'action': action,
                'entry': entry,
                'stop': stop,
                'target': target,
                'confidence': round(confidence, 4),
                'strength': strength,
            })

        best_prediction = sorted(predictions, key=lambda p: abs(p['prob_buy'] - 0.5), reverse=True)[0]
        return {
            'symbol': symbol,
            'interval': interval,
            'provider': provider,
            'horizons': bundle.get('horizons', list(models.keys())),
            'predictions': predictions,
            'action': best_prediction['action'],
            'entry': best_prediction['entry'],
            'stop': best_prediction['stop'],
            'target': best_prediction['target'],
            'confidence': best_prediction['confidence'],
            'prob_buy': best_prediction['prob_buy'],
            'strength': best_prediction['strength'],
            'model_version': version,
        }

    model_obj = bundle.get('model') if isinstance(bundle, dict) else bundle
    try:
        probs = model_obj.predict_proba(X)[0]
        prob_buy = float(probs[1]) if len(probs) > 1 else float(probs[0])
    except Exception:
        pred = int(model_obj.predict(X)[0])
        prob_buy = 1.0 if pred == 1 else 0.0

    last_close = float(last['close'].values[0])
    atr_val = float(last['atr14'].values[0]) if 'atr14' in last.columns else None
    action, entry, stop, target, confidence = recommend_from_prob(prob_buy, last_close, atr_val)
    strength = min(100, int(abs(prob_buy - 0.5) * 200))

    return {
        'symbol': symbol,
        'interval': interval,
        'provider': provider,
        'action': action,
        'entry': entry,
        'stop': stop,
        'target': target,
        'confidence': round(confidence, 4),
        'prob_buy': round(prob_buy, 4),
        'strength': strength,
        'model_version': version,
    }


def recommend_from_prob(prob, last_close, atr=None):
    """Generate entry/stop/target based on probability and ATR-based risk."""
    atr_val = atr if atr and atr > 0 else last_close * 0.015

    if prob >= 0.6:
        entry = last_close
        stop = round(last_close - 1.5 * atr_val, 2)
        target = round(last_close + 3.0 * atr_val, 2)
        confidence = prob
        return 'BUY', entry, stop, target, confidence
    elif prob <= 0.4:
        entry = last_close
        stop = round(last_close + 1.5 * atr_val, 2)
        target = round(last_close - 3.0 * atr_val, 2)
        confidence = 1 - prob
        return 'SELL', entry, stop, target, confidence
    else:
        return 'HOLD', last_close, None, None, prob


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--symbol', required=True)
    p.add_argument('--model', required=True)
    p.add_argument('--interval', default='1d')
    p.add_argument('--period', default=None)
    p.add_argument('--provider', default=None, help='Optional data provider for OHLCV: polygon')
    p.add_argument('--csv', default=None)
    args = p.parse_args()

    try:
        bundle = load_model_bundle(args.model)
        output = predict_from_bundle(
            bundle,
            args.symbol,
            interval=args.interval,
            period=args.period,
            provider=args.provider,
            csv_path=args.csv,
        )
    except Exception as exc:
        output = {'error': str(exc)}

    print(json.dumps(output))


if __name__ == '__main__':
    main()
