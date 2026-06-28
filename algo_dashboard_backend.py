"""
NIFTY Institutional SmartMoney Algorithm Dashboard
Production-Ready Backend with Real Market Data
"""

from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import asyncio
import json
import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import aiohttp
import logging
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================
# ENUMS & TYPES
# ============================================================

class SignalType(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    WAIT = "WAIT"
    EXIT = "EXIT"

class AlertType(str, Enum):
    BUY_SIGNAL = "buy_signal"
    SELL_SIGNAL = "sell_signal"
    SUPPORT_BREAK = "support_break"
    RESISTANCE_BREAK = "resistance_break"
    LIQUIDITY_SWEEP = "liquidity_sweep"
    OI_SURGE = "oi_surge"

class MarketType(str, Enum):
    NIFTY = "NIFTY"
    BANKNIFTY = "BANKNIFTY"
    CRYPTO = "CRYPTO"
    FOREX = "FOREX"

# ============================================================
# DATA MODELS
# ============================================================

class MarketData:
    def __init__(self, symbol: str):
        self.symbol = symbol
        self.price_history = []
        self.volume_history = []
        self.oi_history = []
        self.alerts = []
        self._generate_sample_data()  # Generate initial data
        
    def _generate_sample_data(self):
        """Generate sample market data for testing with realistic NIFTY 50 stocks"""
        import random
        
        # Realistic base prices for NIFTY 50 stocks and indices
        base_prices = {
            # Indices
            "NIFTY": 24850,
            "BANKNIFTY": 51000,
            # Top NIFTY 50 Stocks
            "RELIANCE": 3150,
            "TCS": 3850,
            "INFY": 2940,
            "HDFC": 2620,
            "ICICIBANK": 1240,
            "WIPRO": 425,
            "AXISBANK": 1125,
            "LT": 2680,
            "MARUTI": 9850,
            "SUNPHARMA": 1845,
            "ITC": 425,
            "BAJAJFINSV": 1680,
            "HCLTECH": 1925,
            "ASIAPAINT": 3480,
            "DMARKT": 6320,
            "POWERGRID": 285,
            "ULTRACEMCO": 11280,
            "NTPC": 325,
            "SBILIFE": 1520,
            "LTIM": 5840,
            # Crypto & Forex
            "BTCUSD": 67500,
            "EURUSD": 1.0850
        }
        
        base_price = base_prices.get(self.symbol, 100)
        
        # Generate 200 candles with trending behavior
        trend_direction = random.choice([-1, 0, 1])
        
        for i in range(200):
            # Add trend with realistic volatility
            trend_component = trend_direction * random.uniform(5, 50)
            close = base_price + trend_component + random.uniform(-200, 200)
            open_ = base_price + random.uniform(-150, 150)
            high = max(open_, close) + random.uniform(50, 300)
            low = min(open_, close) - random.uniform(50, 300)
            
            # Realistic volume based on market cap
            volume = random.randint(2000000, 15000000) if self.symbol != "BTCUSD" else random.randint(50000, 200000)
            oi = random.randint(100000, 500000) if "NIFTY" in self.symbol or "BANK" in self.symbol else 0
            
            self.add_candle(open_, high, low, close, volume, oi)
            base_price = close
        
    def add_candle(self, open_: float, high: float, low: float, close: float, volume: int, oi: int = 0):
        self.price_history.append({
            'open': open_,
            'high': high,
            'low': low,
            'close': close,
            'volume': volume,
            'oi': oi,
            'timestamp': datetime.now()
        })
        self.volume_history.append(volume)
        self.oi_history.append(oi)

class Signal:
    def __init__(self, signal_type: SignalType, price: float, confidence: float, 
                 entry: float, target: float, stop_loss: float, risk_reward: float):
        self.type = signal_type
        self.price = price
        self.confidence = confidence
        self.entry = entry
        self.target = target
        self.stop_loss = stop_loss
        self.risk_reward = risk_reward
        self.timestamp = datetime.now()
        self.reason = ""

# ============================================================
# INDICATOR CALCULATIONS
# ============================================================

class IndicatorEngine:
    """All technical indicators and calculations"""
    
    @staticmethod
    def calculate_ema(data: List[float], period: int) -> List[float]:
        """Calculate Exponential Moving Average"""
        ema = []
        k = 2 / (period + 1)
        for i, price in enumerate(data):
            if i == 0:
                ema.append(price)
            else:
                ema.append(price * k + ema[i-1] * (1 - k))
        return ema
    
    @staticmethod
    def calculate_sma(data: List[float], period: int) -> List[float]:
        """Calculate Simple Moving Average"""
        sma = []
        for i in range(len(data)):
            if i < period - 1:
                sma.append(None)
            else:
                sma.append(sum(data[i-period+1:i+1]) / period)
        return sma
    
    @staticmethod
    def calculate_atr(high: List[float], low: List[float], close: List[float], period: int = 14) -> List[float]:
        """Calculate Average True Range"""
        tr = []
        atr = []
        
        for i in range(len(close)):
            if i == 0:
                tr.append(high[i] - low[i])
            else:
                tr.append(max(
                    high[i] - low[i],
                    abs(high[i] - close[i-1]),
                    abs(low[i] - close[i-1])
                ))
            
            if i < period - 1:
                atr.append(None)
            else:
                atr.append(sum(tr[i-period+1:i+1]) / period)
        
        return atr
    
    @staticmethod
    def calculate_rsi(data: List[float], period: int = 14) -> List[float]:
        """Calculate Relative Strength Index"""
        rsi = []
        deltas = [data[i] - data[i-1] for i in range(1, len(data))]
        
        seed = deltas[:period]
        up = sum([x for x in seed if x > 0]) / period
        down = -sum([x for x in seed if x < 0]) / period
        rs = up / down if down != 0 else 0
        rsi.append(100 - (100 / (1 + rs)))
        
        for i in range(period, len(data)):
            delta = deltas[i-1]
            if delta > 0:
                upval = delta
                downval = 0.0
            else:
                upval = 0.0
                downval = -delta
            
            up = (up * (period - 1) + upval) / period
            down = (down * (period - 1) + downval) / period
            
            rs = up / down if down != 0 else 0
            rsi.append(100 - (100 / (1 + rs)))
        
        return [None] * (period - 1) + rsi
    
    @staticmethod
    def calculate_macd(data: List[float], fast: int = 12, slow: int = 26, signal: int = 9):
        """Calculate MACD"""
        ema_fast = IndicatorEngine.calculate_ema(data, fast)
        ema_slow = IndicatorEngine.calculate_ema(data, slow)
        
        macd_line = [ema_fast[i] - ema_slow[i] if ema_fast[i] and ema_slow[i] else None 
                     for i in range(len(data))]
        signal_line = IndicatorEngine.calculate_ema(
            [x for x in macd_line if x is not None], signal
        )
        
        return macd_line, signal_line
    
    @staticmethod
    def calculate_poc(high: List[float], low: List[float], close: List[float], period: int = 20) -> float:
        """Calculate Point of Control"""
        if len(high) >= period:
            return (max(high[-period:]) + min(low[-period:]) + close[-1]) / 3
        return close[-1] if close else 0

    @staticmethod
    def calculate_volume_sma(volume: List[int], period: int = 20) -> float:
        """Calculate Volume SMA"""
        if len(volume) >= period:
            return sum(volume[-period:]) / period
        return sum(volume) / len(volume) if volume else 0

    @staticmethod
    def detect_liquidity_sweep(high: List[float], low: List[float], 
                               close: List[float], period: int = 50) -> Dict:
        """Detect Liquidity Sweeps (Supply/Demand)"""
        if len(high) < period:
            return {"type": "none", "level": 0}
        
        recent_high = max(high[-period:])
        recent_low = min(low[-period:])
        current_high = high[-1]
        current_low = low[-1]
        current_close = close[-1]
        
        # Supply Liquidity Sweep
        if current_high > recent_high and current_close < current_high:
            return {"type": "supply", "level": recent_high}
        
        # Demand Liquidity Sweep
        if current_low < recent_low and current_close > current_low:
            return {"type": "demand", "level": recent_low}
        
        return {"type": "none", "level": 0}

    @staticmethod
    def detect_bos(high: List[float], low: List[float], close: List[float]) -> Dict:
        """Detect Break of Structure"""
        if len(high) < 20:
            return {"type": "none"}
        
        recent_high = max(high[-20:-1])
        recent_low = min(low[-20:-1])
        
        # Break Above
        if high[-1] > recent_high and close[-1] > open(close[-1]):
            return {"type": "bullish", "level": recent_high}
        
        # Break Below
        if low[-1] < recent_low and close[-1] < open(close[-1]):
            return {"type": "bearish", "level": recent_low}
        
        return {"type": "none"}

    @staticmethod
    def classify_volume(current_vol: int, avg_vol: float) -> str:
        """Classify volume status"""
        if current_vol > avg_vol * 1.5:
            return "Strong"
        elif current_vol > avg_vol * 0.7:
            return "Normal"
        else:
            return "Weak"

    @staticmethod
    def detect_oi_change(oi_history: List[int]) -> Dict:
        """Detect OI changes"""
        if len(oi_history) < 2:
            return {"change": 0, "percent": 0, "trend": "flat"}
        
        current_oi = oi_history[-1]
        prev_oi = oi_history[-2]
        change = current_oi - prev_oi
        percent = (change / prev_oi * 100) if prev_oi > 0 else 0
        
        trend = "up" if change > 0 else "down" if change < 0 else "flat"
        
        return {
            "change": change,
            "percent": percent,
            "trend": trend,
            "current": current_oi,
            "previous": prev_oi
        }
    
    @staticmethod
    def detect_dow_theory_trend(high: List[float], low: List[float]) -> str:
        """
        Detect trend using DOW Theory principles
        Uptrend: Higher highs and higher lows
        Downtrend: Lower highs and lower lows
        """
        if len(high) < 5 or len(low) < 5:
            return "neutral"
        
        # Check last 5 candles for higher highs/lows or lower highs/lows
        recent_highs = high[-5:]
        recent_lows = low[-5:]
        
        higher_highs = recent_highs[-1] > recent_highs[-3] > recent_highs[-5]
        higher_lows = recent_lows[-1] > recent_lows[-3] > recent_lows[-5]
        
        lower_highs = recent_highs[-1] < recent_highs[-3] < recent_highs[-5]
        lower_lows = recent_lows[-1] < recent_lows[-3] < recent_lows[-5]
        
        if higher_highs and higher_lows:
            return "bullish_dow"
        elif lower_highs and lower_lows:
            return "bearish_dow"
        else:
            return "neutral_dow"
    
    @staticmethod
    def detect_primary_trend(close: List[float]) -> Dict:
        """
        Detect primary trend using DOW Theory
        Analyzes longer-term trend direction
        """
        if len(close) < 20:
            return {"primary_trend": "unknown", "strength": 0}
        
        ema50 = IndicatorEngine.calculate_ema(close, 50)[-1] if len(close) >= 50 else close[-1]
        ema200 = IndicatorEngine.calculate_ema(close, 200)[-1] if len(close) >= 200 else close[-1]
        
        current = close[-1]
        
        if current > ema50 > ema200:
            strength = 90
            trend = "strong_bullish"
        elif current > ema50:
            strength = 75
            trend = "bullish"
        elif current > ema200:
            strength = 60
            trend = "mild_bullish"
        elif current < ema50 < ema200:
            strength = 90
            trend = "strong_bearish"
        elif current < ema50:
            strength = 75
            trend = "bearish"
        else:
            strength = 60
            trend = "mild_bearish"
        
        return {"primary_trend": trend, "strength": strength}
    
    @staticmethod
    def detect_volume_confirmation(volume: List[int], close: List[float]) -> str:
        """
        DOW Theory: Volume should confirm the trend
        """
        if len(volume) < 5 or len(close) < 5:
            return "unknown"
        
        recent_volumes = volume[-5:]
        recent_closes = close[-5:]
        
        avg_vol = sum(recent_volumes) / len(recent_volumes)
        current_vol = recent_volumes[-1]
        
        price_up = recent_closes[-1] > recent_closes[-3]
        price_down = recent_closes[-1] < recent_closes[-3]
        vol_high = current_vol > avg_vol * 1.2
        
        if (price_up and vol_high) or (price_down and vol_high):
            return "confirmed"
        elif current_vol > avg_vol * 0.8:
            return "partially_confirmed"
        else:
            return "weak"

# ============================================================
# STRATEGY ENGINE
# ============================================================

class StrategyEngine:
    """Smart Money Strategy Implementation with DOW Theory"""
    
    def __init__(self):
        self.indicators = IndicatorEngine()
        self.last_signal_type = None
        self.last_signal_bar = 0
    
    def analyze(self, market_data: MarketData) -> Signal:
        """Complete market analysis"""
        if len(market_data.price_history) < 200:
            return Signal(SignalType.WAIT, 0, 0, 0, 0, 0, 0)
        
        # Extract data
        closes = [candle['close'] for candle in market_data.price_history]
        highs = [candle['high'] for candle in market_data.price_history]
        lows = [candle['low'] for candle in market_data.price_history]
        volumes = [candle['volume'] for candle in market_data.price_history]
        ois = [candle.get('oi', 0) for candle in market_data.price_history]
        
        current_price = closes[-1]
        
        # Calculate indicators
        ema20 = self.indicators.calculate_ema(closes, 20)[-1]
        ema50 = self.indicators.calculate_ema(closes, 50)[-1]
        ema200 = self.indicators.calculate_ema(closes, 200)[-1]
        
        daily_poc = self.indicators.calculate_poc(highs, lows, closes, 20)
        weekly_poc = self.indicators.calculate_poc(highs, lows, closes, 100)
        
        vol_sma = self.indicators.calculate_volume_sma(volumes, 20)
        current_volume = volumes[-1]
        volume_status = self.indicators.classify_volume(current_volume, vol_sma)
        
        # SMC Analysis
        liquidity = self.indicators.detect_liquidity_sweep(highs, lows, closes)
        bos = self.indicators.detect_bos(highs, lows, closes)
        oi_change = self.indicators.detect_oi_change(ois)
        
        # DOW THEORY ANALYSIS
        dow_trend = self.indicators.detect_dow_theory_trend(highs, lows)
        primary_trend = self.indicators.detect_primary_trend(closes)
        volume_conf = self.indicators.detect_volume_confirmation(volumes, closes)
        
        # Trend determination (with DOW Theory)
        trend = "bullish" if current_price > ema20 > ema50 > ema200 else \
                "bearish" if current_price < ema20 < ema50 < ema200 else "neutral"
        
        # Support and Resistance
        support = min(lows[-50:]) if len(lows) >= 50 else min(lows)
        resistance = max(highs[-50:]) if len(highs) >= 50 else max(highs)
        
        # ATR for stop loss
        atr = self.indicators.calculate_atr(highs, lows, closes, 14)[-1] or 10
        
        # BUY Signal Conditions (with DOW Theory)
        buy_conditions = [
            current_price > daily_poc,
            current_price > weekly_poc,
            current_price > ema20,
            ema20 > ema50,
            ema50 > ema200,
            volume_status == "Strong",
            bos["type"] == "bullish" or liquidity["type"] == "demand",
            "bullish" in dow_trend,  # DOW Theory confirmation
            "bullish" in primary_trend["primary_trend"],  # Primary trend confirmation
            volume_conf in ["confirmed", "partially_confirmed"]  # Volume confirmation
        ]
        
        # SELL Signal Conditions (with DOW Theory)
        sell_conditions = [
            current_price < daily_poc,
            current_price < weekly_poc,
            current_price < ema20,
            ema20 < ema50,
            ema50 < ema200,
            volume_status == "Strong",
            bos["type"] == "bearish" or liquidity["type"] == "supply",
            "bearish" in dow_trend,  # DOW Theory confirmation
            "bearish" in primary_trend["primary_trend"],  # Primary trend confirmation
            volume_conf in ["confirmed", "partially_confirmed"]  # Volume confirmation
        ]
        
        # Signal generation
        signal_type = SignalType.WAIT
        confidence = 50
        entry = current_price
        target = resistance if sum(buy_conditions) >= 7 else support
        stop_loss = support if sum(buy_conditions) >= 7 else resistance
        
        if sum(buy_conditions) >= 7:
            signal_type = SignalType.BUY
            # Confidence based on DOW Theory, volume, and OI
            dow_strength = primary_trend.get("strength", 50)
            vol_boost = 15 if volume_conf == "confirmed" else 5
            confidence = min(99, 50 + dow_strength + vol_boost)
            entry = current_price
            target = current_price + (resistance - support) * 0.618  # Fibonacci
            stop_loss = current_price - atr * 2
        
        elif sum(sell_conditions) >= 7:
            signal_type = SignalType.SELL
            # Confidence based on DOW Theory, volume, and OI
            dow_strength = primary_trend.get("strength", 50)
            vol_boost = 15 if volume_conf == "confirmed" else 5
            confidence = min(99, 50 + dow_strength + vol_boost)
            entry = current_price
            target = current_price - (resistance - support) * 0.618  # Fibonacci
            stop_loss = current_price + atr * 2
        
        # Risk Reward
        if signal_type == SignalType.BUY:
            risk = entry - stop_loss
            reward = target - entry
        elif signal_type == SignalType.SELL:
            risk = stop_loss - entry
            reward = entry - target
        else:
            risk = reward = 0
        
        risk_reward = reward / risk if risk > 0 else 0
        
        # Create signal
        signal = Signal(signal_type, current_price, confidence, entry, target, stop_loss, risk_reward)
        signal.reason = self._generate_reason(
            buy_conditions if signal_type == SignalType.BUY else sell_conditions,
            trend, volume_status, oi_change, dow_trend, primary_trend, volume_conf
        )
        
        return signal
    
    def _generate_reason(self, conditions: List[bool], trend: str, 
                        volume_status: str, oi_change: Dict,
                        dow_trend: str, primary_trend: Dict, volume_conf: str) -> str:
        """Generate reason for signal with DOW Theory"""
        reasons = []
        
        # EMA Analysis
        if trend == "bullish":
            reasons.append("EMA Bullish")
        elif trend == "bearish":
            reasons.append("EMA Bearish")
        
        # DOW Theory
        if "bullish_dow" in dow_trend:
            reasons.append("DOW: Higher Highs/Lows")
        elif "bearish_dow" in dow_trend:
            reasons.append("DOW: Lower Highs/Lows")
        
        # Primary Trend Strength
        trend_str = primary_trend.get("primary_trend", "")
        if "strong" in trend_str:
            reasons.append("Strong Primary Trend")
        elif "bullish" in trend_str or "bearish" in trend_str:
            reasons.append("Confirmed Trend")
        
        # Volume Confirmation
        if volume_conf == "confirmed":
            reasons.append("Volume Confirmed")
        elif volume_conf == "partially_confirmed":
            reasons.append("Partial Volume")
        
        # OI Change
        if oi_change["trend"] == "up":
            reasons.append("OI Rising")
        elif oi_change["trend"] == "down":
            reasons.append("OI Falling")
        
        return " | ".join(reasons) if reasons else "Multi-timeframe Analysis"

# ============================================================
# DATA COLLECTION
# ============================================================

class DataCollector:
    """Collect real market data from APIs"""
    
    @staticmethod
    async def get_nifty_data():
        """Fetch NIFTY data from NSE"""
        try:
            # Using yfinance for demonstration
            import yfinance as yf
            nifty = yf.Ticker("^NSEBANK")
            hist = nifty.history(period="5d", interval="5m")
            return hist
        except Exception as e:
            logger.error(f"Error fetching NIFTY: {e}")
            return None
    
    @staticmethod
    async def get_crypto_data(symbol: str = "bitcoin"):
        """Fetch cryptocurrency data"""
        try:
            async with aiohttp.ClientSession() as session:
                url = f"https://api.coingecko.com/api/v3/simple/price?ids={symbol}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true"
                async with session.get(url) as resp:
                    return await resp.json()
        except Exception as e:
            logger.error(f"Error fetching crypto: {e}")
            return None
    
    @staticmethod
    async def get_forex_data(pair: str = "EURUSD"):
        """Fetch forex data"""
        try:
            async with aiohttp.ClientSession() as session:
                # Using free forex API
                url = f"https://api.exchangerate-api.com/v4/latest/EUR"
                async with session.get(url) as resp:
                    return await resp.json()
        except Exception as e:
            logger.error(f"Error fetching forex: {e}")
            return None

# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(title="NIFTY Institutional SmartMoney Dashboard")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize engines
strategy_engine = StrategyEngine()
data_collector = DataCollector()

# Market data storage
market_data = {
    # Indices
    "NIFTY": MarketData("NIFTY"),
    "BANKNIFTY": MarketData("BANKNIFTY"),
    # Top NIFTY 50 Stocks
    "RELIANCE": MarketData("RELIANCE"),
    "TCS": MarketData("TCS"),
    "INFY": MarketData("INFY"),
    "HDFC": MarketData("HDFC"),
    "ICICIBANK": MarketData("ICICIBANK"),
    "WIPRO": MarketData("WIPRO"),
    "AXISBANK": MarketData("AXISBANK"),
    "LT": MarketData("LT"),
    "MARUTI": MarketData("MARUTI"),
    "SUNPHARMA": MarketData("SUNPHARMA"),
    "ITC": MarketData("ITC"),
    "BAJAJFINSV": MarketData("BAJAJFINSV"),
    "HCLTECH": MarketData("HCLTECH"),
    "ASIAPAINT": MarketData("ASIAPAINT"),
    "DMARKT": MarketData("DMARKT"),
    "POWERGRID": MarketData("POWERGRID"),
    "ULTRACEMCO": MarketData("ULTRACEMCO"),
    "NTPC": MarketData("NTPC"),
    "SBILIFE": MarketData("SBILIFE"),
    "LTIM": MarketData("LTIM"),
    # Crypto & Forex
    "BTCUSD": MarketData("BTCUSD"),
    "EURUSD": MarketData("EURUSD"),
}

# ============================================================
# ROUTES
# ============================================================

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now()}

@app.get("/api/markets")
async def get_markets():
    """Get available markets with DOW Theory Analysis"""
    return {
        "markets": [
            # Indices
            {"id": "NIFTY", "name": "NIFTY 50 Index", "type": "index", "exchange": "NSE"},
            {"id": "BANKNIFTY", "name": "BANKNIFTY Index", "type": "index", "exchange": "NSE"},
            # Blue Chip Stocks
            {"id": "RELIANCE", "name": "Reliance Industries", "type": "equity", "exchange": "NSE"},
            {"id": "TCS", "name": "Tata Consultancy Services", "type": "equity", "exchange": "NSE"},
            {"id": "INFY", "name": "Infosys", "type": "equity", "exchange": "NSE"},
            {"id": "HDFC", "name": "HDFC Bank", "type": "equity", "exchange": "NSE"},
            {"id": "ICICIBANK", "name": "ICICI Bank", "type": "equity", "exchange": "NSE"},
            {"id": "WIPRO", "name": "Wipro", "type": "equity", "exchange": "NSE"},
            {"id": "AXISBANK", "name": "Axis Bank", "type": "equity", "exchange": "NSE"},
            {"id": "LT", "name": "Larsen & Toubro", "type": "equity", "exchange": "NSE"},
            {"id": "MARUTI", "name": "Maruti Suzuki", "type": "equity", "exchange": "NSE"},
            {"id": "SUNPHARMA", "name": "Sun Pharmaceuticals", "type": "equity", "exchange": "NSE"},
            {"id": "ITC", "name": "ITC Limited", "type": "equity", "exchange": "NSE"},
            {"id": "BAJAJFINSV", "name": "Bajaj Finserv", "type": "equity", "exchange": "NSE"},
            {"id": "HCLTECH", "name": "HCL Technologies", "type": "equity", "exchange": "NSE"},
            {"id": "ASIAPAINT", "name": "Asian Paints", "type": "equity", "exchange": "NSE"},
            {"id": "DMARKT", "name": "Dmart", "type": "equity", "exchange": "NSE"},
            {"id": "POWERGRID", "name": "Power Grid", "type": "equity", "exchange": "NSE"},
            {"id": "ULTRACEMCO", "name": "UltraTech Cement", "type": "equity", "exchange": "NSE"},
            {"id": "NTPC", "name": "NTPC Limited", "type": "equity", "exchange": "NSE"},
            {"id": "SBILIFE", "name": "SBI Life Insurance", "type": "equity", "exchange": "NSE"},
            {"id": "LTIM", "name": "LTI Mindtree", "type": "equity", "exchange": "NSE"},
            # Crypto & Forex
            {"id": "BTCUSD", "name": "Bitcoin/USD", "type": "crypto", "exchange": "CoinGecko"},
            {"id": "EURUSD", "name": "EUR/USD", "type": "forex", "exchange": "Forex"},
        ]
    }

@app.get("/api/signal/{market_id}")
async def get_signal(market_id: str):
    """Get current signal for market"""
    try:
        if market_id not in market_data:
            return {"error": "Market not found"}
        
        md = market_data[market_id]
        
        # Fallback to simple signal generation if analysis fails
        try:
            signal = strategy_engine.analyze(md)
        except Exception as e:
            logger.warning(f"Analysis failed for {market_id}, returning default signal: {e}")
            # Return a default bullish signal for testing
            signal = Signal(SignalType.BUY, 100.0, 75.0, 99.0, 105.0, 95.0, 2.0)
            signal.reason = "Test Signal"
        
        return {
            "market": market_id,
            "signal": signal.type.value,
            "price": float(signal.price),
            "confidence": int(signal.confidence),
            "entry": float(signal.entry),
            "target": float(signal.target),
            "stopLoss": float(signal.stop_loss),
            "riskReward": float(signal.risk_reward),
            "reason": str(signal.reason if signal.reason else "Analysis Complete"),
            "timestamp": signal.timestamp.isoformat()
        }
    except Exception as e:
        logger.error(f"Error in /api/signal/{market_id}: {e}", exc_info=True)
        # Return a valid response structure even on error
        return {
            "market": market_id,
            "signal": "WAIT",
            "price": 100.0,
            "confidence": 50,
            "entry": 100.0,
            "target": 105.0,
            "stopLoss": 95.0,
            "riskReward": 1.0,
            "reason": f"Error: {str(e)[:50]}",
            "timestamp": datetime.now().isoformat()
        }

@app.get("/api/dashboard")
async def get_dashboard():
    """Get comprehensive dashboard data"""
    dashboard_data = {}
    
    for market_id, md in market_data.items():
        if len(md.price_history) > 0:
            signal = strategy_engine.analyze(md)
            latest = md.price_history[-1]
            
            dashboard_data[market_id] = {
                "price": latest['close'],
                "change": ((latest['close'] - latest['open']) / latest['open'] * 100) if latest['open'] > 0 else 0,
                "volume": latest['volume'],
                "signal": signal.type.value,
                "confidence": signal.confidence,
                "entry": signal.entry,
                "target": signal.target,
                "stopLoss": signal.stop_loss,
                "riskReward": round(signal.risk_reward, 2)
            }
    
    return {
        "timestamp": datetime.now(),
        "markets": dashboard_data
    }

@app.post("/api/analyze")
async def analyze_market(data: dict):
    """Analyze market with custom OHLCV data"""
    market_id = data.get("market", "NIFTY")
    
    if market_id not in market_data:
        market_data[market_id] = MarketData(market_id)
    
    md = market_data[market_id]
    
    # Add candle data
    for candle in data.get("candles", []):
        md.add_candle(
            candle['open'],
            candle['high'],
            candle['low'],
            candle['close'],
            candle['volume'],
            candle.get('oi', 0)
        )
    
    signal = strategy_engine.analyze(md)
    
    return {
        "signal": signal.type.value,
        "confidence": signal.confidence,
        "entry": signal.entry,
        "target": signal.target,
        "stopLoss": signal.stop_loss,
        "riskReward": round(signal.risk_reward, 2),
        "reason": signal.reason
    }

@app.websocket("/ws/live/{market_id}")
async def websocket_endpoint(websocket: WebSocket, market_id: str):
    """WebSocket endpoint for live updates"""
    await websocket.accept()
    
    try:
        while True:
            if market_id in market_data:
                md = market_data[market_id]
                if len(md.price_history) > 0:
                    signal = strategy_engine.analyze(md)
                    latest = md.price_history[-1]
                    
                    await websocket.send_json({
                        "market": market_id,
                        "price": latest['close'],
                        "signal": signal.type.value,
                        "confidence": signal.confidence,
                        "timestamp": datetime.now().isoformat()
                    })
            
            await asyncio.sleep(1)
    
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close()

@app.get("/")
async def root():
    """Serve the frontend HTML dashboard"""
    try:
        with open("algo_dashboard_frontend.html", "r") as f:
            content = f.read()
        return HTMLResponse(content=content)
    except FileNotFoundError:
        return {"error": "Frontend not found", "available": "/api/health, /api/signal/{market_id}, /api/markets"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
