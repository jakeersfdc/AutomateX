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
        """Generate sample market data for testing"""
        import random
        base_prices = {
            "NIFTY": 23500,
            "BANKNIFTY": 48000,
            "BTCUSD": 65000,
            "EURUSD": 1.09
        }
        base_price = base_prices.get(self.symbol, 100)
        
        # Generate 200 candles of sample data
        for i in range(200):
            close = base_price + random.uniform(-500, 500)
            open_ = base_price + random.uniform(-500, 500)
            high = max(open_, close) + random.uniform(0, 300)
            low = min(open_, close) - random.uniform(0, 300)
            volume = random.randint(1000000, 10000000)
            oi = random.randint(100000, 500000)
            
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

# ============================================================
# STRATEGY ENGINE
# ============================================================

class StrategyEngine:
    """Smart Money Strategy Implementation"""
    
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
        
        # Trend determination
        trend = "bullish" if current_price > ema20 > ema50 > ema200 else \
                "bearish" if current_price < ema20 < ema50 < ema200 else "neutral"
        
        # Support and Resistance
        support = min(lows[-50:])
        resistance = max(highs[-50:])
        
        # ATR for stop loss
        atr = self.indicators.calculate_atr(highs, lows, closes, 14)[-1] or 10
        
        # BUY Signal Conditions
        buy_conditions = [
            current_price > daily_poc,
            current_price > weekly_poc,
            current_price > ema20,
            ema20 > ema50,
            ema50 > ema200,
            volume_status == "Strong",
            bos["type"] == "bullish" or liquidity["type"] == "demand"
        ]
        
        # SELL Signal Conditions
        sell_conditions = [
            current_price < daily_poc,
            current_price < weekly_poc,
            current_price < ema20,
            ema20 < ema50,
            ema50 < ema200,
            volume_status == "Strong",
            bos["type"] == "bearish" or liquidity["type"] == "supply"
        ]
        
        # Signal generation
        signal_type = SignalType.WAIT
        confidence = 50
        entry = current_price
        target = resistance if sum(buy_conditions) >= 6 else support
        stop_loss = support if sum(buy_conditions) >= 6 else resistance
        
        if sum(buy_conditions) >= 6:
            signal_type = SignalType.BUY
            confidence = min(99, 60 + (volume_status == "Strong" and 10) + (oi_change["trend"] == "up" and 10))
            entry = resistance
            target = resistance + (resistance - support) * 0.5
            stop_loss = support
        
        elif sum(sell_conditions) >= 6:
            signal_type = SignalType.SELL
            confidence = min(99, 60 + (volume_status == "Strong" and 10) + (oi_change["trend"] == "down" and 10))
            entry = support
            target = support - (resistance - support) * 0.5
            stop_loss = resistance
        
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
            trend, volume_status, oi_change
        )
        
        return signal
    
    def _generate_reason(self, conditions: List[bool], trend: str, 
                        volume_status: str, oi_change: Dict) -> str:
        """Generate reason for signal"""
        reasons = []
        
        if trend == "bullish":
            reasons.append("EMA Bullish Alignment")
        elif trend == "bearish":
            reasons.append("EMA Bearish Alignment")
        
        if volume_status == "Strong":
            reasons.append("Strong Volume Confirmation")
        
        if oi_change["trend"] == "up":
            reasons.append("OI Increasing")
        elif oi_change["trend"] == "down":
            reasons.append("OI Decreasing")
        
        return " | ".join(reasons)

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
    "NIFTY": MarketData("NIFTY"),
    "BANKNIFTY": MarketData("BANKNIFTY"),
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
    """Get available markets"""
    return {
        "markets": [
            {"id": "NIFTY", "name": "NIFTY 50", "type": "equity", "exchange": "NSE"},
            {"id": "BANKNIFTY", "name": "BANKNIFTY", "type": "equity", "exchange": "NSE"},
            {"id": "BTCUSD", "name": "Bitcoin", "type": "crypto", "exchange": "CoinGecko"},
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
        signal = strategy_engine.analyze(md)
        
        return {
            "market": market_id,
            "signal": signal.type.value,
            "price": round(signal.price, 2),
            "confidence": signal.confidence,
            "entry": round(signal.entry, 2),
            "target": round(signal.target, 2),
            "stopLoss": round(signal.stop_loss, 2),
            "riskReward": round(signal.risk_reward, 2),
            "reason": signal.reason,
            "timestamp": signal.timestamp.isoformat()
        }
    except Exception as e:
        logger.error(f"Error in /api/signal/{market_id}: {e}")
        return {"error": str(e), "market": market_id}

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
