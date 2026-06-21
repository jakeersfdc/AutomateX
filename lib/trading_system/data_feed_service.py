"""
Professional Trading System - Data Feed Service
Handles real-time market data ingestion, storage, and retrieval
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
import pandas as pd
import numpy as np
from dotenv import load_dotenv
from abc import ABC, abstractmethod

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()


class DatabaseConnection:
    """PostgreSQL connection manager"""
    
    def __init__(self):
        self.conn = None
        self.connect()
    
    def connect(self):
        try:
            self.conn = psycopg2.connect(
                host=os.getenv('DB_HOST', 'localhost'),
                port=os.getenv('DB_PORT', '5432'),
                database=os.getenv('DB_NAME', 'trading_system'),
                user=os.getenv('DB_USER', 'postgres'),
                password=os.getenv('DB_PASSWORD')
            )
            logger.info("✓ Database connected successfully")
        except psycopg2.Error as e:
            logger.error(f"✗ Database connection failed: {e}")
            raise
    
    def get_cursor(self):
        if self.conn is None:
            self.connect()
        return self.conn.cursor(cursor_factory=RealDictCursor)
    
    def commit(self):
        if self.conn:
            self.conn.commit()
    
    def rollback(self):
        if self.conn:
            self.conn.rollback()
    
    def close(self):
        if self.conn:
            self.conn.close()
            logger.info("Database connection closed")


class DataFeedService:
    """
    Service for fetching, storing, and retrieving market data
    """
    
    def __init__(self):
        self.db = DatabaseConnection()
        self.account_size = float(os.getenv('ACCOUNT_SIZE', 100000))
        self.max_risk_percent = float(os.getenv('MAX_RISK_PERCENT', 2.0))
        self.profit_target_percent = float(os.getenv('PROFIT_TARGET_PERCENT', 3.0))
        
        self.vix_low = float(os.getenv('VIX_LOW', 12.0))
        self.vix_mid = float(os.getenv('VIX_MID', 20.0))
        self.vix_high = float(os.getenv('VIX_HIGH', 30.0))
    
    # =========== OHLCV Data Management ===========
    
    def store_ohlcv(self, symbol: str, ohlcv_records: List[Dict]) -> bool:
        """
        Store OHLCV records in database
        
        Args:
            symbol: 'NSE_NIFTY50' or 'NSE_BANKNIFTY'
            ohlcv_records: List of {'time', 'open', 'high', 'low', 'close', 'volume'}
        
        Returns:
            bool: Success status
        """
        try:
            cursor = self.db.get_cursor()
            
            for record in ohlcv_records:
                cursor.execute("""
                    INSERT INTO ohlcv_5m 
                    (time, symbol, open, high, low, close, volume)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (time, symbol) DO UPDATE SET
                    open = EXCLUDED.open,
                    high = EXCLUDED.high,
                    low = EXCLUDED.low,
                    close = EXCLUDED.close,
                    volume = EXCLUDED.volume
                """, (
                    record['time'],
                    symbol,
                    record['open'],
                    record['high'],
                    record['low'],
                    record['close'],
                    record['volume']
                ))
            
            self.db.commit()
            logger.info(f"✓ Stored {len(ohlcv_records)} OHLCV records for {symbol}")
            cursor.close()
            return True
            
        except psycopg2.Error as e:
            logger.error(f"✗ Error storing OHLCV: {e}")
            self.db.rollback()
            return False
    
    def get_ohlcv(self, symbol: str, limit: int = 100, 
                   hours_back: int = 24) -> pd.DataFrame:
        """
        Retrieve OHLCV data
        
        Args:
            symbol: Trading symbol
            limit: Max records to retrieve
            hours_back: Lookback period
        
        Returns:
            DataFrame with OHLCV data
        """
        try:
            cursor = self.db.get_cursor()
            
            cursor.execute("""
                SELECT time, symbol, open, high, low, close, volume
                FROM ohlcv_5m
                WHERE symbol = %s
                AND time > NOW() - INTERVAL '%s hours'
                ORDER BY time DESC
                LIMIT %s
            """, (symbol, hours_back, limit))
            
            records = cursor.fetchall()
            cursor.close()
            
            if not records:
                logger.warning(f"No OHLCV data found for {symbol}")
                return pd.DataFrame()
            
            df = pd.DataFrame(records)
            df = df.sort_values('time').reset_index(drop=True)
            return df
            
        except psycopg2.Error as e:
            logger.error(f"✗ Error retrieving OHLCV: {e}")
            return pd.DataFrame()
    
    # =========== Support/Resistance Levels ===========
    
    def calculate_sr_levels(self, symbol: str, lookback_days: int = 20) -> Dict:
        """
        Calculate professional S/R levels
        Using 20+ year trader formula
        
        R2 = High + 2(Close - Low)
        R1 = 2*Close - Low
        POC = (High + Low + Close) / 3
        S1 = 2*Close - High
        S2 = Low - 2(High - Close)
        
        Args:
            symbol: Trading symbol
            lookback_days: Period for calculation
        
        Returns:
            Dict with R2, R1, POC, S1, S2 levels
        """
        try:
            cursor = self.db.get_cursor()
            
            # Get daily OHLCV (use latest daily data)
            cursor.execute("""
                SELECT 
                    MAX(high) as day_high,
                    MIN(low) as day_low,
                    (array_agg(close ORDER BY time DESC))[1] as day_close
                FROM ohlcv_5m
                WHERE symbol = %s
                AND time > NOW() - INTERVAL '%s days'
            """, (symbol, lookback_days))
            
            result = cursor.fetchone()
            cursor.close()
            
            if not result or result['day_high'] is None:
                logger.warning(f"Insufficient data to calculate S/R for {symbol}")
                return {}
            
            h = float(result['day_high'])
            l = float(result['day_low'])
            c = float(result['day_close'])
            
            # Professional trader formulas
            r2 = h + 2 * (c - l)
            r1 = 2 * c - l
            poc = (h + l + c) / 3
            s1 = 2 * c - h
            s2 = l - 2 * (h - c)
            
            levels = {
                'r2': round(r2, 2),
                'r1': round(r1, 2),
                'poc': round(poc, 2),
                's1': round(s1, 2),
                's2': round(s2, 2),
                'calculated_at': datetime.now().isoformat()
            }
            
            logger.info(f"✓ S/R Levels for {symbol}: R2={r2:.2f}, R1={r1:.2f}, "
                       f"POC={poc:.2f}, S1={s1:.2f}, S2={s2:.2f}")
            
            return levels
            
        except Exception as e:
            logger.error(f"✗ Error calculating S/R levels: {e}")
            return {}
    
    # =========== Volume Analysis ===========
    
    def calculate_volume_profile(self, symbol: str, periods: int = 20) -> Dict:
        """
        Calculate volume profile metrics
        
        Returns:
            Dict with Strong/Normal/Weak classification
        """
        try:
            df = self.get_ohlcv(symbol, limit=periods)
            
            if df.empty:
                return {}
            
            current_vol = df.iloc[-1]['volume']
            avg_vol = df['volume'].mean()
            vol_ratio = current_vol / avg_vol if avg_vol > 0 else 0
            
            if vol_ratio > 1.5:
                classification = "Strong"
            elif vol_ratio > 0.7:
                classification = "Normal"
            else:
                classification = "Weak"
            
            profile = {
                'current_volume': int(current_vol),
                'average_volume': int(avg_vol),
                'volume_ratio': round(vol_ratio, 2),
                'classification': classification,
                'calculated_at': datetime.now().isoformat()
            }
            
            logger.info(f"✓ Volume Profile for {symbol}: {classification} "
                       f"(Ratio: {vol_ratio:.2f}x)")
            
            return profile
            
        except Exception as e:
            logger.error(f"✗ Error calculating volume profile: {e}")
            return {}
    
    # =========== VIX Analysis ===========
    
    def store_vix(self, vix_value: float) -> bool:
        """Store VIX data"""
        try:
            cursor = self.db.get_cursor()
            
            regime = self.get_vix_regime(vix_value)
            
            cursor.execute("""
                INSERT INTO vix_data (time, vix_value, vix_regime)
                VALUES (NOW(), %s, %s)
            """, (vix_value, regime))
            
            self.db.commit()
            cursor.close()
            
            logger.info(f"✓ VIX stored: {vix_value} ({regime})")
            return True
            
        except psycopg2.Error as e:
            logger.error(f"✗ Error storing VIX: {e}")
            self.db.rollback()
            return False
    
    def get_vix_regime(self, vix: float) -> str:
        """
        Classify VIX into regime
        
        Returns: "LOW_VOLATILITY", "NORMAL", "ELEVATED", or "HIGH_VOLATILITY"
        """
        if vix < self.vix_low:
            return "LOW_VOLATILITY"
        elif vix < self.vix_mid:
            return "NORMAL"
        elif vix < self.vix_high:
            return "ELEVATED"
        else:
            return "HIGH_VOLATILITY"
    
    def get_position_size_multiplier(self, vix: float) -> float:
        """
        Get position size multiplier based on VIX
        
        Returns: 1.0 (Normal), 0.5 (Half), 0.2 (Micro), etc.
        """
        regime = self.get_vix_regime(vix)
        
        multipliers = {
            "LOW_VOLATILITY": 0.0,      # No trading
            "NORMAL": 1.0,               # Full size
            "ELEVATED": 0.5,             # Half size
            "HIGH_VOLATILITY": 0.2       # Micro size
        }
        
        return multipliers.get(regime, 1.0)
    
    # =========== Trade Logging ===========
    
    def log_trade(self, trade_data: Dict) -> Optional[int]:
        """
        Log a trade to database
        
        Args:
            trade_data: Dict with trade details
        
        Returns:
            trade_id if successful, None otherwise
        """
        try:
            cursor = self.db.get_cursor()
            
            cursor.execute("""
                INSERT INTO trades 
                (entry_time, symbol, direction, entry_price, quantity, 
                 stop_loss, take_profit, entry_signal, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'OPEN')
                RETURNING trade_id
            """, (
                trade_data['entry_time'],
                trade_data['symbol'],
                trade_data['direction'],
                trade_data['entry_price'],
                trade_data['quantity'],
                trade_data['stop_loss'],
                trade_data['take_profit'],
                trade_data['entry_signal']
            ))
            
            trade_id = cursor.fetchone()['trade_id']
            self.db.commit()
            cursor.close()
            
            logger.info(f"✓ Trade logged: ID={trade_id}, {trade_data['symbol']}, "
                       f"{trade_data['direction']} @ {trade_data['entry_price']}")
            
            return trade_id
            
        except psycopg2.Error as e:
            logger.error(f"✗ Error logging trade: {e}")
            self.db.rollback()
            return None
    
    def update_trade_exit(self, trade_id: int, exit_data: Dict) -> bool:
        """Update trade with exit details"""
        try:
            cursor = self.db.get_cursor()
            
            cursor.execute("""
                UPDATE trades
                SET exit_time = %s,
                    exit_price = %s,
                    pnl = %s,
                    pnl_percent = %s,
                    status = %s,
                    exit_reason = %s
                WHERE trade_id = %s
            """, (
                exit_data['exit_time'],
                exit_data['exit_price'],
                exit_data['pnl'],
                exit_data['pnl_percent'],
                exit_data['status'],
                exit_data['exit_reason'],
                trade_id
            ))
            
            self.db.commit()
            cursor.close()
            
            logger.info(f"✓ Trade {trade_id} updated: PnL = {exit_data['pnl']}")
            return True
            
        except psycopg2.Error as e:
            logger.error(f"✗ Error updating trade: {e}")
            self.db.rollback()
            return False
    
    def get_daily_trades(self, symbol: Optional[str] = None) -> List[Dict]:
        """Get all trades from today"""
        try:
            cursor = self.db.get_cursor()
            
            if symbol:
                cursor.execute("""
                    SELECT * FROM trades
                    WHERE DATE(entry_time) = CURRENT_DATE
                    AND symbol = %s
                    ORDER BY entry_time DESC
                """, (symbol,))
            else:
                cursor.execute("""
                    SELECT * FROM trades
                    WHERE DATE(entry_time) = CURRENT_DATE
                    ORDER BY entry_time DESC
                """)
            
            trades = cursor.fetchall()
            cursor.close()
            
            return [dict(trade) for trade in trades]
            
        except psycopg2.Error as e:
            logger.error(f"✗ Error retrieving daily trades: {e}")
            return []
    
    def get_performance_metrics(self, days: int = 30) -> Dict:
        """Calculate performance metrics"""
        try:
            cursor = self.db.get_cursor()
            
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_trades,
                    SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
                    SUM(CASE WHEN pnl < 0 THEN 1 ELSE 0 END) as losing_trades,
                    SUM(pnl) as total_pnl,
                    AVG(CASE WHEN pnl > 0 THEN pnl END) as avg_win,
                    AVG(CASE WHEN pnl < 0 THEN pnl END) as avg_loss,
                    MAX(pnl_percent) as best_trade,
                    MIN(pnl_percent) as worst_trade
                FROM trades
                WHERE DATE(entry_time) > CURRENT_DATE - INTERVAL '%s days'
                AND status IN ('CLOSED', 'SL_HIT', 'TP_HIT')
            """, (days,))
            
            result = cursor.fetchone()
            cursor.close()
            
            total_trades = result['total_trades'] or 0
            winning_trades = result['winning_trades'] or 0
            
            win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
            
            metrics = {
                'total_trades': total_trades,
                'winning_trades': winning_trades,
                'losing_trades': result['losing_trades'] or 0,
                'win_rate_percent': round(win_rate, 2),
                'total_pnl': round(result['total_pnl'] or 0, 2),
                'avg_win': round(result['avg_win'] or 0, 2),
                'avg_loss': round(result['avg_loss'] or 0, 2),
                'profit_factor': round(
                    abs(result['avg_win'] / result['avg_loss']) 
                    if result['avg_loss'] and result['avg_loss'] != 0 else 0, 2
                ),
                'best_trade_percent': round(result['best_trade'] or 0, 2),
                'worst_trade_percent': round(result['worst_trade'] or 0, 2)
            }
            
            logger.info(f"✓ Performance Metrics: {win_rate:.1f}% WR, "
                       f"PF={metrics['profit_factor']}, PnL={metrics['total_pnl']}")
            
            return metrics
            
        except psycopg2.Error as e:
            logger.error(f"✗ Error calculating metrics: {e}")
            return {}
    
    def __del__(self):
        """Cleanup on object destruction"""
        self.db.close()


# ==================== EXAMPLE USAGE ====================

if __name__ == "__main__":
    # Initialize service
    service = DataFeedService()
    
    # Example 1: Calculate S/R levels
    levels = service.calculate_sr_levels("NSE_NIFTY50")
    print(f"\nS/R Levels: {json.dumps(levels, indent=2)}")
    
    # Example 2: Get volume profile
    volume = service.calculate_volume_profile("NSE_NIFTY50")
    print(f"\nVolume Profile: {json.dumps(volume, indent=2)}")
    
    # Example 3: VIX regime
    vix_value = 18.5
    regime = service.get_vix_regime(vix_value)
    multiplier = service.get_position_size_multiplier(vix_value)
    print(f"\nVIX {vix_value}: Regime={regime}, Position Multiplier={multiplier}x")
    
    # Example 4: Store VIX
    service.store_vix(vix_value)
    
    # Example 5: Get performance
    performance = service.get_performance_metrics(days=30)
    print(f"\n30-Day Performance: {json.dumps(performance, indent=2)}")

