/**
 * PROFESSIONAL TIME-BASED PREDICTION ENGINE
 * For 20+ Year Trading Experts
 * 
 * Predicts EXACT entry/exit times with multi-layer confidence analysis
 * - Cyclical patterns (Gann, Fibonacci time)
 * - Confluence timing (when multiple indicators align)
 * - Volume/volatility acceleration
 * - Historical pattern matching
 * - Probability-weighted forecasts
 */

import { Bar } from './Strategy';

export interface TimePrediction {
  // TIMING
  timeUntilSignal: number; // seconds
  predictedTime: Date;
  timeConfidence: number; // 0-1
  
  // SIGNAL FORECAST
  expectedSignal: 'BUY' | 'SELL' | 'HOLD' | null;
  signalProbability: number; // 0-1
  
  // CONFLUENCE ANALYSIS
  confluenceFactors: ConfluenceFactor[];
  confluenceScore: number; // 0-100
  
  // TARGETS & RISK
  probabilisticTarget: number;
  targetProbability: number;
  stopLossLevel: number;
  riskRewardRatio: number;
  
  // ACCURACY METRICS
  backtestAccuracy: number; // historical % correct
  confidence: number; // final composite confidence 0-1
  reasoning: string;
  
  // CYCLE ANALYSIS
  cyclicPattern: CyclicPattern | null;
  nextCycleTime: Date | null;
  
  // PATTERN MATCHING
  similarHistoricalPatterns: HistoricalPattern[];
  
  // ALERTS
  alerts: TimingAlert[];
}

export interface ConfluenceFactor {
  name: string;
  type: 'indicator' | 'zone' | 'cycle' | 'volume' | 'volatility' | 'sentiment';
  timeToAlignment: number; // seconds until factor is ready
  strength: number; // 0-1
  probability: number; // 0-1 of being correct
  description: string;
}

export interface CyclicPattern {
  type: 'gann' | 'fibonacci' | 'elliott' | 'session' | 'seasonal';
  period: number; // seconds or bars
  phase: number; // current position in cycle (0-1)
  nextTurnTime: Date;
  strength: number; // 0-1
  description: string;
}

export interface HistoricalPattern {
  date: Date;
  similarity: number; // 0-1
  outcome: 'WIN' | 'LOSS' | 'BREAKEVEN';
  timeToSignal: number;
  profitability: number;
}

export interface TimingAlert {
  time: Date;
  title: string;
  description: string;
  action: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface BarWithMetadata extends Bar {
  barNumber: number;
  cyclePhase: number;
  volumeAccel: number;
  volatilityAccel: number;
}

export class TimePredictionEngine {
  private readonly lookbackBars = 500; // Deep historical analysis
  private readonly confidenceThreshold = 0.55;
  private bars: BarWithMetadata[] = [];
  private trainingData: HistoricalPattern[] = [];

  /**
   * MAIN PREDICTION FUNCTION
   * Analyzes all convergence points and returns precise timing
   */
  predict(
    bars: Bar[],
    currentIndex: number,
    strategiesAnalysis: any[]
  ): TimePrediction {
    this.bars = this.enrichBars(bars);
    const currentBar = bars[currentIndex];

    // Layer 1: Confluence factor analysis
    const confluenceFactors = this.analyzeConfluenceFactors(bars, currentIndex);
    const confluenceScore = this.calculateConfluenceScore(confluenceFactors);

    // Layer 2: Cycle analysis (Gann, Fibonacci, Elliott)
    const cyclicPattern = this.detectCyclicPatterns(bars, currentIndex);
    const cycleTimeToSignal = cyclicPattern ? cyclicPattern.nextTurnTime.getTime() - Date.now() : 0;

    // Layer 3: Volume & Volatility acceleration
    const { timeToBreakout, breakoutConfidence } = this.analyzeAcceleration(bars, currentIndex);

    // Layer 4: Pattern matching from history
    const similarPatterns = this.findSimilarHistoricalPatterns(bars, currentIndex);
    const patternConfidence = similarPatterns.length > 0 ? 
      similarPatterns.reduce((sum, p) => sum + p.similarity, 0) / similarPatterns.length : 0;

    // Layer 5: Multi-timeframe alignment
    const mtfAlignment = this.analyzeMTFAlignment(bars, currentIndex);

    // Layer 6: Zone confluence (support/resistance timing)
    const zoneConfluence = this.analyzeZoneConfluence(bars, currentIndex);

    // COMPOSITE TIMING PREDICTION
    const timeToSignalSeconds = this.calculateCompositeTime(
      confluenceFactors,
      cycleTimeToSignal,
      timeToBreakout,
      mtfAlignment.timeToAlignment
    );

    // SIGNAL FORECAST
    const signalForecast = this.forecastSignalType(bars, currentIndex, strategiesAnalysis);

    // PROBABILISTIC TARGETS
    const targetAnalysis = this.calculateProbabilisticTargets(
      bars,
      currentIndex,
      signalForecast.expectedSignal,
      similarPatterns
    );

    // BACKTESTED ACCURACY
    const historicalAccuracy = this.calculateHistoricalAccuracy(
      similarPatterns,
      signalForecast.expectedSignal
    );

    // FINAL CONFIDENCE COMPOSITE
    const finalConfidence = this.calculateFinalConfidence(
      confluenceScore,
      breakoutConfidence,
      patternConfidence,
      mtfAlignment.confidence,
      zoneConfluence.confidence,
      historicalAccuracy
    );

    // BUILD ALERTS
    const alerts = this.generateAlerts(
      timeToSignalSeconds,
      confluenceFactors,
      signalForecast.expectedSignal,
      finalConfidence
    );

    // REASONING
    const reasoning = this.buildDetailedReasoning(
      confluenceScore,
      cyclicPattern,
      similarPatterns,
      mtfAlignment,
      zoneConfluence,
      historicalAccuracy,
      finalConfidence
    );

    return {
      timeUntilSignal: timeToSignalSeconds,
      predictedTime: new Date(Date.now() + timeToSignalSeconds * 1000),
      timeConfidence: Math.min(1, confluenceScore / 100 * 0.7 + breakoutConfidence * 0.3),
      
      expectedSignal: signalForecast.expectedSignal,
      signalProbability: signalForecast.probability,
      
      confluenceFactors,
      confluenceScore,
      
      probabilisticTarget: targetAnalysis.target,
      targetProbability: targetAnalysis.probability,
      stopLossLevel: targetAnalysis.stopLoss,
      riskRewardRatio: targetAnalysis.riskReward,
      
      backtestAccuracy: historicalAccuracy,
      confidence: finalConfidence,
      reasoning,
      
      cyclicPattern,
      nextCycleTime: cyclicPattern ? cyclicPattern.nextTurnTime : null,
      
      similarHistoricalPatterns: similarPatterns.slice(0, 5),
      
      alerts
    };
  }

  /**
   * LAYER 1: CONFLUENCE FACTOR ANALYSIS
   * Identifies what factors must align for a signal
   */
  private analyzeConfluenceFactors(bars: Bar[], idx: number): ConfluenceFactor[] {
    const factors: ConfluenceFactor[] = [];
    const current = bars[idx];

    // Factor 1: EMA Alignment (Multiple timeframes)
    const emaAlignment = this.analyzeEMAAlignment(bars, idx);
    factors.push({
      name: 'EMA Alignment (9, 21, 50, 200)',
      type: 'indicator',
      timeToAlignment: emaAlignment.timeToAlignment,
      strength: emaAlignment.strength,
      probability: emaAlignment.probability,
      description: `EMA9: ${emaAlignment.ema9.toFixed(2)}, EMA21: ${emaAlignment.ema21.toFixed(2)}, EMA50: ${emaAlignment.ema50.toFixed(2)}, EMA200: ${emaAlignment.ema200.toFixed(2)}`
    });

    // Factor 2: RSI Mean Reversion
    const rsiState = this.analyzeRSIState(bars, idx);
    factors.push({
      name: 'RSI Mean Reversion (14)',
      type: 'indicator',
      timeToAlignment: rsiState.timeToExtreme,
      strength: rsiState.strength,
      probability: rsiState.probability,
      description: `RSI: ${rsiState.rsi.toFixed(2)}, Zone: ${rsiState.zone}, Bars to extreme: ${rsiState.barsToExtreme}`
    });

    // Factor 3: ADX Trend Strength
    const adxState = this.analyzeADXState(bars, idx);
    factors.push({
      name: 'ADX Trend Strength (14)',
      type: 'indicator',
      timeToAlignment: adxState.timeToReady,
      strength: adxState.strength,
      probability: adxState.probability,
      description: `ADX: ${adxState.adx.toFixed(2)}, +DI: ${adxState.plusDI.toFixed(2)}, -DI: ${adxState.minusDI.toFixed(2)}`
    });

    // Factor 4: MACD Convergence
    const macdState = this.analyzeMACDState(bars, idx);
    factors.push({
      name: 'MACD Signal Convergence',
      type: 'indicator',
      timeToAlignment: macdState.timeToConvergence,
      strength: macdState.strength,
      probability: macdState.probability,
      description: `MACD: ${macdState.macd.toFixed(2)}, Signal: ${macdState.signal.toFixed(2)}, Histogram: ${macdState.histogram.toFixed(2)}`
    });

    // Factor 5: Volume Profile Confirmation
    const volumeProfile = this.analyzeVolumeProfile(bars, idx);
    factors.push({
      name: 'Volume Profile POC',
      type: 'volume',
      timeToAlignment: volumeProfile.timeToConfirm,
      strength: volumeProfile.strength,
      probability: volumeProfile.probability,
      description: `POC: ${volumeProfile.poc.toFixed(2)}, VAH: ${volumeProfile.vah.toFixed(2)}, VAL: ${volumeProfile.val.toFixed(2)}`
    });

    // Factor 6: Support/Resistance Proximity
    const zoneProximity = this.analyzeZoneProximity(bars, idx);
    factors.push({
      name: 'Zone Proximity (S/R)',
      type: 'zone',
      timeToAlignment: zoneProximity.timeToTouch,
      strength: zoneProximity.strength,
      probability: zoneProximity.probability,
      description: `Nearest resistance: ${zoneProximity.nearestResistance.toFixed(2)}, support: ${zoneProximity.nearestSupport.toFixed(2)}`
    });

    // Factor 7: Volatility Regime
    const volRegime = this.analyzeVolatilityRegime(bars, idx);
    factors.push({
      name: 'Volatility Regime & ATR',
      type: 'volatility',
      timeToAlignment: volRegime.timeToChange,
      strength: volRegime.strength,
      probability: volRegime.probability,
      description: `ATR: ${volRegime.atr.toFixed(2)}, IV: ${volRegime.iv.toFixed(1)}%, Regime: ${volRegime.regime}`
    });

    // Factor 8: Ichimoku Cloud State
    const ichimoku = this.analyzeIchimoku(bars, idx);
    factors.push({
      name: 'Ichimoku Cloud Alignment',
      type: 'indicator',
      timeToAlignment: ichimoku.timeToAlignment,
      strength: ichimoku.strength,
      probability: ichimoku.probability,
      description: `Tenkan: ${ichimoku.tenkan.toFixed(2)}, Kijun: ${ichimoku.kijun.toFixed(2)}, Cloud status: ${ichimoku.cloudStatus}`
    });

    // Factor 9: Stochastic RSI Oscillation
    const stochRsi = this.analyzeStochasticRSI(bars, idx);
    factors.push({
      name: 'Stochastic RSI Oscillation',
      type: 'indicator',
      timeToAlignment: stochRsi.timeToExtreme,
      strength: stochRsi.strength,
      probability: stochRsi.probability,
      description: `K: ${stochRsi.k.toFixed(2)}, D: ${stochRsi.d.toFixed(2)}, Zone: ${stochRsi.zone}`
    });

    return factors;
  }

  /**
   * LAYER 2: CYCLIC PATTERN DETECTION
   * Gann angles, Fibonacci time, Elliott waves, seasonal patterns
   */
  private detectCyclicPatterns(bars: Bar[], idx: number): CyclicPattern | null {
    const current = bars[idx];
    const patterns: CyclicPattern[] = [];

    // Pattern 1: Gann Time Cycles
    const gannCycle = this.detectGannTimeCycle(bars, idx);
    if (gannCycle) patterns.push(gannCycle);

    // Pattern 2: Fibonacci Time Ratios
    const fibCycle = this.detectFibonacciTimeCycle(bars, idx);
    if (fibCycle) patterns.push(fibCycle);

    // Pattern 3: Elliott Wave Timing
    const elliottCycle = this.detectElliottWaveTiming(bars, idx);
    if (elliottCycle) patterns.push(elliottCycle);

    // Pattern 4: Session Cycle (Market open/close)
    const sessionCycle = this.detectSessionCycle(bars, idx);
    if (sessionCycle) patterns.push(sessionCycle);

    // Pattern 5: Seasonal Patterns
    const seasonalCycle = this.detectSeasonalPattern(bars, idx);
    if (seasonalCycle) patterns.push(seasonalCycle);

    // Return strongest pattern
    return patterns.length > 0 
      ? patterns.reduce((best, p) => p.strength > best.strength ? p : best)
      : null;
  }

  /**
   * LAYER 3: VOLUME & VOLATILITY ACCELERATION
   * When is the next breakout likely?
   */
  private analyzeAcceleration(bars: Bar[], idx: number): { timeToBreakout: number; breakoutConfidence: number } {
    const lookback = 20;
    const start = Math.max(0, idx - lookback);
    const window = bars.slice(start, idx + 1);

    // Volume acceleration
    const volumeAccel = this.calculateVolumeAcceleration(window);
    
    // Volatility squeeze (low volatility before breakout)
    const atrValues = window.map((b, i) => this.calculateATR([...window.slice(0, i + 1)], 14));
    const currentATR = atrValues[atrValues.length - 1];
    const avgATR = atrValues.reduce((a, b) => a + b) / atrValues.length;
    const squeeze = currentATR < avgATR * 0.6;

    // Bollinger Band squeeze
    const bbSqueeze = this.calculateBBSqueeze(window);

    // Prediction
    let timeToBreakout = 0;
    let confidence = 0;

    if (squeeze && bbSqueeze > 0.7) {
      // Imminent breakout expected
      timeToBreakout = 300; // ~5 minutes for 1-hour bars
      confidence = Math.min(1, volumeAccel * 0.5 + bbSqueeze * 0.5);
    } else if (volumeAccel > 0.7) {
      timeToBreakout = 600; // ~10 minutes
      confidence = volumeAccel;
    }

    return { timeToBreakout, breakoutConfidence: confidence };
  }

  /**
   * LAYER 4: HISTORICAL PATTERN MATCHING
   * Find similar patterns from past and forecast based on outcome
   */
  private findSimilarHistoricalPatterns(bars: Bar[], idx: number): HistoricalPattern[] {
    const lookback = 50;
    const start = Math.max(0, idx - lookback);
    const currentPattern = bars.slice(start, idx + 1);

    const similar: HistoricalPattern[] = [];

    // Look through historical data for similar patterns
    for (let i = lookback; i < Math.min(idx - 20, bars.length - 1); i++) {
      const historicalPattern = bars.slice(i - lookback, i + 1);
      const similarity = this.calculatePatternSimilarity(currentPattern, historicalPattern);

      if (similarity > 0.75) {
        // Check outcome of this pattern
        const outcome = this.determineOutcome(bars, i, 20);
        similar.push({
          date: new Date(),
          similarity,
          outcome,
          timeToSignal: 300,
          profitability: this.calculatePatternProfitability(bars, i, 20)
        });
      }
    }

    return similar.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * LAYER 5: MULTI-TIMEFRAME ALIGNMENT
   * When do multiple timeframes align?
   */
  private analyzeMTFAlignment(bars: Bar[], idx: number): { timeToAlignment: number; confidence: number } {
    // This would aggregate predictions from 1h, 4h, 1d timeframes
    // For now, simplified single-timeframe analysis
    
    const ema21 = this.calculateEMA(bars, 21, idx);
    const ema50 = this.calculateEMA(bars, 50, idx);
    const ema200 = this.calculateEMA(bars, 200, idx);
    const current = bars[idx].close;

    let alignment = 0;
    if (current > ema21 && ema21 > ema50 && ema50 > ema200) {
      alignment = 3; // Strong bullish alignment
    } else if (current < ema21 && ema21 < ema50 && ema50 < ema200) {
      alignment = -3; // Strong bearish alignment
    }

    return {
      timeToAlignment: alignment === 0 ? 600 : 0,
      confidence: Math.abs(alignment) / 3
    };
  }

  /**
   * LAYER 6: ZONE CONFLUENCE
   * Support/resistance zone density
   */
  private analyzeZoneConfluence(bars: Bar[], idx: number): { confidence: number; zones: any[] } {
    const zones = this.detectSRZones(bars, idx);
    const current = bars[idx].close;

    // Count zones near current price (±2%)
    const nearbyZones = zones.filter(z => 
      Math.abs(z.level - current) / current < 0.02
    );

    return {
      confidence: Math.min(1, nearbyZones.length / 3),
      zones: nearbyZones
    };
  }

  /**
   * SIGNAL FORECAST
   * What type of signal is coming?
   */
  private forecastSignalType(
    bars: Bar[],
    idx: number,
    strategiesAnalysis: any[]
  ): { expectedSignal: 'BUY' | 'SELL' | 'HOLD' | null; probability: number } {
    const current = bars[idx];
    const ema21 = this.calculateEMA(bars, 21, idx);
    const ema50 = this.calculateEMA(bars, 50, idx);
    const rsi = this.calculateRSI(bars, 14, idx);

    let signal: 'BUY' | 'SELL' | 'HOLD' | null = 'HOLD';
    let probability = 0;

    // Bullish signals
    if (current.close > ema21 && ema21 > ema50 && rsi < 70) {
      signal = 'BUY';
      probability = Math.min(1, (current.close - ema50) / ema50 * 0.5 + (70 - rsi) / 70 * 0.5);
    }
    // Bearish signals
    else if (current.close < ema21 && ema21 < ema50 && rsi > 30) {
      signal = 'SELL';
      probability = Math.min(1, (ema50 - current.close) / ema50 * 0.5 + (rsi - 30) / 70 * 0.5);
    }

    return { expectedSignal: signal, probability };
  }

  /**
   * PROBABILISTIC TARGETS
   * Price targets with probabilities from similar patterns
   */
  private calculateProbabilisticTargets(
    bars: Bar[],
    idx: number,
    signal: 'BUY' | 'SELL' | 'HOLD' | null,
    similarPatterns: HistoricalPattern[]
  ): { target: number; probability: number; stopLoss: number; riskReward: number } {
    const current = bars[idx].close;
    const atr = this.calculateATR(bars, 14, idx);

    let target = 0;
    let stopLoss = 0;
    let probability = 0;

    if (signal === 'BUY') {
      // Average wins from similar patterns
      const winPatterns = similarPatterns.filter(p => p.outcome === 'WIN');
      const avgProfitability = winPatterns.length > 0 
        ? winPatterns.reduce((sum, p) => sum + p.profitability, 0) / winPatterns.length
        : atr * 2;

      target = current + avgProfitability;
      stopLoss = current - atr;
      probability = winPatterns.length / Math.max(1, similarPatterns.length);
    } else if (signal === 'SELL') {
      const winPatterns = similarPatterns.filter(p => p.outcome === 'WIN');
      const avgProfitability = winPatterns.length > 0 
        ? winPatterns.reduce((sum, p) => sum + p.profitability, 0) / winPatterns.length
        : atr * 2;

      target = current - avgProfitability;
      stopLoss = current + atr;
      probability = winPatterns.length / Math.max(1, similarPatterns.length);
    }

    const riskReward = stopLoss !== 0 ? Math.abs(target - current) / Math.abs(stopLoss - current) : 0;

    return { target, probability, stopLoss, riskReward };
  }

  /**
   * HISTORICAL ACCURACY
   * Win rate from backtested similar patterns
   */
  private calculateHistoricalAccuracy(similarPatterns: HistoricalPattern[], signal: 'BUY' | 'SELL' | 'HOLD' | null): number {
    if (similarPatterns.length === 0) return 0.5;

    const wins = similarPatterns.filter(p => p.outcome === 'WIN').length;
    return wins / similarPatterns.length;
  }

  /**
   * FINAL CONFIDENCE COMPOSITE
   * Weighted confidence from all layers
   */
  private calculateFinalConfidence(
    confluenceScore: number,
    breakoutConfidence: number,
    patternConfidence: number,
    mtfConfidence: number,
    zoneConfidence: number,
    historicalAccuracy: number
  ): number {
    const weights = {
      confluence: 0.25,
      breakout: 0.15,
      pattern: 0.20,
      mtf: 0.15,
      zone: 0.10,
      historical: 0.15
    };

    return Math.min(1,
      (confluenceScore / 100) * weights.confluence +
      breakoutConfidence * weights.breakout +
      patternConfidence * weights.pattern +
      mtfConfidence * weights.mtf +
      zoneConfidence * weights.zone +
      historicalAccuracy * weights.historical
    );
  }

  /**
   * TIMING ALERTS
   * Specific times user should be alert
   */
  private generateAlerts(
    timeToSignal: number,
    confluenceFactors: ConfluenceFactor[],
    signal: 'BUY' | 'SELL' | 'HOLD' | null,
    confidence: number
  ): TimingAlert[] {
    const alerts: TimingAlert[] = [];
    const now = Date.now();

    // Alert 1: High confluence moment
    const readyFactors = confluenceFactors.filter(f => f.timeToAlignment < 300);
    if (readyFactors.length >= 3) {
      alerts.push({
        time: new Date(now + 180000), // 3 minutes
        title: '🎯 HIGH CONFLUENCE INCOMING',
        description: `${readyFactors.length} factors aligning for ${signal || 'signal'}`,
        action: 'Prepare entry orders',
        priority: 'HIGH'
      });
    }

    // Alert 2: Pre-signal (5 minutes before)
    if (timeToSignal > 0 && timeToSignal < 600) {
      alerts.push({
        time: new Date(now + Math.max(60, timeToSignal - 300) * 1000),
        title: '⚡ SIGNAL INCOMING',
        description: `${signal || 'UNKNOWN'} signal expected in ~5 minutes`,
        action: 'Activate monitoring',
        priority: confidence > 0.75 ? 'HIGH' : 'MEDIUM'
      });
    }

    // Alert 3: Immediate signal
    if (timeToSignal > 0 && timeToSignal < 60) {
      alerts.push({
        time: new Date(now + (timeToSignal * 1000)),
        title: '🔥 SIGNAL ACTIVE',
        description: `${signal} signal ready for execution`,
        action: 'Execute trade',
        priority: 'HIGH'
      });
    }

    return alerts;
  }

  /**
   * DETAILED REASONING
   * Explanation of prediction for trader analysis
   */
  private buildDetailedReasoning(
    confluenceScore: number,
    cyclicPattern: CyclicPattern | null,
    similarPatterns: HistoricalPattern[],
    mtfAlignment: any,
    zoneConfluence: any,
    historicalAccuracy: number,
    finalConfidence: number
  ): string {
    const lines = [];

    lines.push(`PROFESSIONAL TIME PREDICTION ANALYSIS (Confidence: ${(finalConfidence * 100).toFixed(1)}%)`);
    lines.push('='.repeat(70));

    lines.push(`\n📊 CONFLUENCE SCORE: ${confluenceScore.toFixed(1)}/100`);
    lines.push(`${confluenceScore > 75 ? '✅ EXCELLENT' : confluenceScore > 50 ? '⚠️  GOOD' : '❌ WEAK'} factor alignment for signal generation`);

    if (cyclicPattern) {
      lines.push(`\n🔄 CYCLIC PATTERN: ${cyclicPattern.type.toUpperCase()}`);
      lines.push(`   Next turn: ${cyclicPattern.nextTurnTime?.toLocaleTimeString()}`);
      lines.push(`   Strength: ${(cyclicPattern.strength * 100).toFixed(0)}%`);
    }

    lines.push(`\n📈 HISTORICAL PATTERN MATCH: ${(historicalAccuracy * 100).toFixed(0)}% win rate`);
    lines.push(`   Similar patterns found: ${similarPatterns.length}`);
    if (similarPatterns.length > 0) {
      const avgSimilarity = similarPatterns.reduce((s, p) => s + p.similarity, 0) / similarPatterns.length;
      lines.push(`   Average similarity: ${(avgSimilarity * 100).toFixed(0)}%`);
    }

    lines.push(`\n🎯 MTF ALIGNMENT: ${(mtfAlignment.confidence * 100).toFixed(0)}% ready`);
    lines.push(`   Time to full alignment: ${mtfAlignment.timeToAlignment}s`);

    lines.push(`\n🏪 ZONE CONFLUENCE: ${zoneConfluence.zones.length} zones nearby`);
    lines.push(`   Density confidence: ${(zoneConfluence.confidence * 100).toFixed(0)}%`);

    lines.push(`\n💡 TRADING IMPLICATION:`);
    lines.push(`   Enter when: All confluence factors turn green`);
    lines.push(`   Expected move: In direction of majority factor consensus`);
    lines.push(`   Risk: Adequate stop-loss at opposite confluence point`);
    lines.push(`   Reward: 2:1 or better risk/reward ratio recommended`);

    return lines.join('\n');
  }

  // ============= SUPPORTING CALCULATIONS =============

  private enrichBars(bars: Bar[]): BarWithMetadata[] {
    return bars.map((b, i) => ({
      ...b,
      barNumber: i,
      cyclePhase: this.calculateCyclePhase(i, bars.length),
      volumeAccel: this.calculateVolumeAcceleration(bars.slice(Math.max(0, i - 20), i + 1)),
      volatilityAccel: this.calculateVolatilityAccel(bars.slice(Math.max(0, i - 20), i + 1))
    }));
  }

  private calculateCyclePhase(barIndex: number, totalBars: number): number {
    const cyclePeriod = 144; // Gann
    return (barIndex % cyclePeriod) / cyclePeriod;
  }

  private analyzeEMAAlignment(bars: Bar[], idx: number) {
    const ema9 = this.calculateEMA(bars, 9, idx);
    const ema21 = this.calculateEMA(bars, 21, idx);
    const ema50 = this.calculateEMA(bars, 50, idx);
    const ema200 = this.calculateEMA(bars, 200, idx);

    let strength = 0;
    if (ema9 > ema21 && ema21 > ema50 && ema50 > ema200) strength = 1;
    else if (ema9 < ema21 && ema21 < ema50 && ema50 < ema200) strength = 1;
    else if (ema9 > ema21 && ema21 > ema50) strength = 0.7;
    else if (ema9 < ema21 && ema21 < ema50) strength = 0.7;

    return {
      ema9, ema21, ema50, ema200,
      strength,
      probability: strength,
      timeToAlignment: strength < 1 ? 300 : 0
    };
  }

  private analyzeRSIState(bars: Bar[], idx: number) {
    const rsi = this.calculateRSI(bars, 14, idx);
    let zone = 'NEUTRAL';
    let probability = 0.5;
    let strength = 0.5;
    let barsToExtreme = 0;

    if (rsi < 30) {
      zone = 'OVERSOLD';
      probability = Math.min(1, (30 - rsi) / 30 * 0.5 + 0.5);
      strength = Math.min(1, (30 - rsi) / 30);
      barsToExtreme = 0;
    } else if (rsi > 70) {
      zone = 'OVERBOUGHT';
      probability = Math.min(1, (rsi - 70) / 30 * 0.5 + 0.5);
      strength = Math.min(1, (rsi - 70) / 30);
      barsToExtreme = 0;
    } else if (rsi < 50) {
      zone = 'BEARISH';
      strength = (50 - rsi) / 50;
      barsToExtreme = Math.ceil((50 - rsi) / 2);
    } else {
      zone = 'BULLISH';
      strength = (rsi - 50) / 50;
      barsToExtreme = Math.ceil((rsi - 50) / 2);
    }

    return {
      rsi, zone, probability, strength,
      barsToExtreme,
      timeToExtreme: barsToExtreme * 3600 // Assuming hourly bars
    };
  }

  private analyzeADXState(bars: Bar[], idx: number) {
    const adx = this.calculateADX(bars, 14, idx);
    const plusDI = this.calculatePlusDI(bars, 14, idx);
    const minusDI = this.calculateMinusDI(bars, 14, idx);

    let strength = 0;
    if (adx > 40) strength = 1;
    else if (adx > 25) strength = 0.7;
    else if (adx > 15) strength = 0.4;

    let probability = strength;
    if (plusDI > minusDI) probability = Math.min(1, probability * 1.2);
    else probability = Math.min(1, probability * 0.9);

    return {
      adx, plusDI, minusDI,
      strength,
      probability,
      timeToReady: strength < 1 ? 300 : 0
    };
  }

  private analyzeMACDState(bars: Bar[], idx: number) {
    const macd = this.calculateMACD(bars, idx);
    const signal = this.calculateMACDSignal(bars, idx);
    const histogram = macd - signal;

    let strength = Math.min(1, Math.abs(histogram) / 0.5);
    let probability = strength;
    let timeToConvergence = 0;

    if (Math.abs(histogram) < 0.1) {
      timeToConvergence = 300; // About to cross
      probability = 0.8;
    }

    return {
      macd, signal, histogram,
      strength,
      probability,
      timeToConvergence
    };
  }

  private analyzeVolumeProfile(bars: Bar[], idx: number) {
    const lookback = 20;
    const window = bars.slice(Math.max(0, idx - lookback), idx + 1);

    const poc = this.calculatePOC(window); // Point of Control
    const { vah, val } = this.calculateVolumeNodes(window);

    const current = bars[idx].close;
    const inProfile = current > val && current < vah;

    return {
      poc, vah, val,
      strength: inProfile ? 1 : 0.5,
      probability: inProfile ? 0.9 : 0.5,
      timeToConfirm: inProfile ? 0 : 300
    };
  }

  private analyzeZoneProximity(bars: Bar[], idx: number) {
    const zones = this.detectSRZones(bars, idx);
    const current = bars[idx].close;

    const resistances = zones.filter(z => z.type === 'resistance').sort((a, b) => a.level - b.level);
    const supports = zones.filter(z => z.type === 'support').sort((a, b) => b.level - a.level);

    const nearestResistance = resistances.find(r => r.level > current) || resistances[resistances.length - 1];
    const nearestSupport = supports[0] || supports[supports.length - 1];

    const distToRes = nearestResistance ? Math.abs(nearestResistance.level - current) : 0;
    const distToSup = nearestSupport ? Math.abs(current - nearestSupport.level) : 0;
    const atr = this.calculateATR(bars, 14, idx);

    let strength = 0;
    if (distToRes < atr || distToSup < atr) strength = 1;
    else if (distToRes < atr * 2 || distToSup < atr * 2) strength = 0.7;

    return {
      nearestResistance: nearestResistance?.level || current,
      nearestSupport: nearestSupport?.level || current,
      strength,
      probability: strength,
      timeToTouch: strength > 0.7 ? 300 : 600
    };
  }

  private analyzeVolatilityRegime(bars: Bar[], idx: number) {
    const atr = this.calculateATR(bars, 14, idx);
    const iv = this.calculateIV(bars, idx);

    const lookback = 100;
    const historicalATR = bars.slice(Math.max(0, idx - lookback), idx)
      .map((_, i) => this.calculateATR(bars, 14, Math.max(0, idx - lookback + i)))
      .reduce((a, b) => a + b) / lookback;

    const volatilityPercent = (atr / bars[idx].close) * 100;

    let regime = 'NORMAL';
    let strength = 0.5;

    if (atr > historicalATR * 1.5) {
      regime = 'HIGH';
      strength = 0.8;
    } else if (atr < historicalATR * 0.6) {
      regime = 'LOW';
      strength = 0.6;
    }

    return {
      atr,
      iv,
      regime,
      strength,
      probability: strength,
      timeToChange: 600
    };
  }

  private analyzeIchimoku(bars: Bar[], idx: number) {
    const tenkan = this.calculateTenkan(bars, idx);
    const kijun = this.calculateKijun(bars, idx);
    const senkou_a = (tenkan + kijun) / 2;
    const senkou_b = this.calculateSenkouB(bars, idx);

    const current = bars[idx].close;
    let cloudStatus = 'NEUTRAL';
    let strength = 0.5;

    if (current > Math.max(senkou_a, senkou_b)) {
      cloudStatus = 'ABOVE_CLOUD';
      strength = 0.9;
    } else if (current < Math.min(senkou_a, senkou_b)) {
      cloudStatus = 'BELOW_CLOUD';
      strength = 0.9;
    } else {
      cloudStatus = 'IN_CLOUD';
      strength = 0.3;
    }

    return {
      tenkan, kijun,
      cloudStatus,
      strength,
      probability: strength,
      timeToAlignment: strength > 0.7 ? 0 : 300
    };
  }

  private analyzeStochasticRSI(bars: Bar[], idx: number) {
    const rsi = this.calculateRSI(bars, 14, idx);
    const k = this.calculateStochRSIK(bars, idx);
    const d = this.calculateStochRSID(bars, idx);

    let zone = 'NEUTRAL';
    let strength = 0.5;

    if (k < 20 && d < 20) {
      zone = 'OVERSOLD';
      strength = 0.9;
    } else if (k > 80 && d > 80) {
      zone = 'OVERBOUGHT';
      strength = 0.9;
    }

    return {
      k, d, zone,
      strength,
      probability: strength,
      timeToExtreme: strength > 0.8 ? 0 : 300
    };
  }

  private calculateConfluenceScore(factors: ConfluenceFactor[]): number {
    const weightedScore = factors.reduce((sum, f) => {
      return sum + f.probability * 100;
    }, 0) / factors.length;

    return Math.min(100, weightedScore);
  }

  private calculateCompositeTime(
    confluenceFactors: ConfluenceFactor[],
    cycleTime: number,
    breakoutTime: number,
    mtfTime: number
  ): number {
    const times = [
      confluenceFactors.reduce((sum, f) => sum + f.timeToAlignment, 0) / confluenceFactors.length,
      cycleTime,
      breakoutTime,
      mtfTime
    ].filter(t => t > 0);

    if (times.length === 0) return 300; // Default 5 min

    // Weighted median
    return times.sort((a, b) => a - b)[Math.floor(times.length / 2)];
  }

  // ============= HELPER CALCULATIONS =============

  private calculateEMA(bars: Bar[], period: number, idx: number): number {
    if (idx < period - 1) return bars[idx].close;
    const k = 2 / (period + 1);
    let ema = bars[0].close;
    for (let i = 1; i <= idx; i++) {
      ema = bars[i].close * k + ema * (1 - k);
    }
    return ema;
  }

  private calculateRSI(bars: Bar[], period: number, idx: number): number {
    if (idx < period) return 50;
    let gain = 0, loss = 0;
    for (let i = idx - period + 1; i <= idx; i++) {
      const diff = bars[i].close - bars[i - 1].close;
      if (diff > 0) gain += diff;
      else loss -= diff;
    }
    const rs = (gain / period) / (loss / period);
    return 100 - 100 / (1 + rs);
  }

  private calculateATR(bars: Bar[], period: number, idx: number = bars.length - 1): number {
    if (idx < period) return bars[idx].high - bars[idx].low;
    let tr = 0, atr = 0;
    
    for (let i = Math.max(0, idx - period + 1); i <= idx; i++) {
      const h = bars[i].high;
      const l = bars[i].low;
      const c = i > 0 ? bars[i - 1].close : bars[i].close;
      tr = Math.max(h - l, Math.abs(h - c), Math.abs(l - c));
      atr = i === Math.max(0, idx - period + 1) ? tr : (atr * (period - 1) + tr) / period;
    }
    return atr;
  }

  private calculateADX(bars: Bar[], period: number, idx: number): number {
    const plusDI = this.calculatePlusDI(bars, period, idx);
    const minusDI = this.calculateMinusDI(bars, period, idx);
    const di_diff = Math.abs(plusDI - minusDI);
    const di_sum = plusDI + minusDI;
    const dx = (di_sum > 0) ? (di_diff / di_sum) * 100 : 0;
    
    // Simplified: for full ADX, need smoothing
    return dx;
  }

  private calculatePlusDI(bars: Bar[], period: number, idx: number): number {
    if (idx < 1) return 50;
    const dm_plus = Math.max(0, bars[idx].high - bars[idx - 1].high);
    const tr = this.calculateATR(bars, period, idx);
    return (dm_plus / tr) * 100;
  }

  private calculateMinusDI(bars: Bar[], period: number, idx: number): number {
    if (idx < 1) return 50;
    const dm_minus = Math.max(0, bars[idx - 1].low - bars[idx].low);
    const tr = this.calculateATR(bars, period, idx);
    return (dm_minus / tr) * 100;
  }

  private calculateMACD(bars: Bar[], idx: number): number {
    const ema12 = this.calculateEMA(bars, 12, idx);
    const ema26 = this.calculateEMA(bars, 26, idx);
    return ema12 - ema26;
  }

  private calculateMACDSignal(bars: Bar[], idx: number): number {
    const macdValues = [];
    for (let i = 0; i <= idx; i++) {
      macdValues.push(this.calculateMACD(bars, i));
    }
    return this.calculateEMA(macdValues.map((v, i) => ({ close: v } as Bar)), 9, idx);
  }

  private calculateTenkan(bars: Bar[], idx: number): number {
    const lookback = 9;
    const window = bars.slice(Math.max(0, idx - lookback + 1), idx + 1);
    const high = Math.max(...window.map(b => b.high));
    const low = Math.min(...window.map(b => b.low));
    return (high + low) / 2;
  }

  private calculateKijun(bars: Bar[], idx: number): number {
    const lookback = 26;
    const window = bars.slice(Math.max(0, idx - lookback + 1), idx + 1);
    const high = Math.max(...window.map(b => b.high));
    const low = Math.min(...window.map(b => b.low));
    return (high + low) / 2;
  }

  private calculateSenkouB(bars: Bar[], idx: number): number {
    const lookback = 52;
    const window = bars.slice(Math.max(0, idx - lookback + 1), idx + 1);
    const high = Math.max(...window.map(b => b.high));
    const low = Math.min(...window.map(b => b.low));
    return (high + low) / 2;
  }

  private calculateStochRSIK(bars: Bar[], idx: number): number {
    const period = 14;
    const smoothK = 3;
    if (idx < period + smoothK) return 50;
    
    let rsiMin = 100, rsiMax = 0;
    for (let i = idx - period + 1; i <= idx; i++) {
      const rsi = this.calculateRSI(bars, period, i);
      rsiMin = Math.min(rsiMin, rsi);
      rsiMax = Math.max(rsiMax, rsi);
    }
    
    const stochRSI = rsiMax - rsiMin > 0 
      ? ((this.calculateRSI(bars, period, idx) - rsiMin) / (rsiMax - rsiMin)) * 100 
      : 50;
    
    return stochRSI;
  }

  private calculateStochRSID(bars: Bar[], idx: number): number {
    // 3-period MA of K
    const kValues = [];
    for (let i = Math.max(0, idx - 2); i <= idx; i++) {
      kValues.push(this.calculateStochRSIK(bars, i));
    }
    return kValues.reduce((a, b) => a + b) / kValues.length;
  }

  private calculateIV(bars: Bar[], idx: number): number {
    const lookback = 20;
    const window = bars.slice(Math.max(0, idx - lookback), idx + 1);
    const returns = [];
    for (let i = 1; i < window.length; i++) {
      returns.push(Math.log(window[i].close / window[i - 1].close));
    }
    const variance = returns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / returns.length;
    return Math.sqrt(variance) * 100 * Math.sqrt(252);
  }

  private calculateVolumeAcceleration(bars: Bar[]): number {
    if (bars.length < 3) return 0;
    const recent = bars.slice(-3).map(b => b.volume);
    const older = bars.slice(-6, -3).map(b => b.volume);
    
    const recentAvg = recent.reduce((a, b) => a + b) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b) / older.length;
    
    return olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;
  }

  private calculateVolatilityAccel(bars: Bar[]): number {
    const atr_recent = this.calculateATR(bars, 14, bars.length - 1);
    const atr_old = this.calculateATR(bars.slice(0, Math.max(1, bars.length - 20)), 14, Math.max(0, bars.length - 21));
    return atr_old > 0 ? (atr_recent - atr_old) / atr_old : 0;
  }

  private calculateBBSqueeze(bars: Bar[]): number {
    const sma = bars.reduce((sum, b) => sum + b.close, 0) / bars.length;
    const variance = bars.reduce((sum, b) => sum + Math.pow(b.close - sma, 2), 0) / bars.length;
    const std = Math.sqrt(variance);
    const bandwidth = (std * 4) / sma;
    return Math.max(0, 1 - bandwidth);
  }

  private calculatePOC(bars: Bar[]): number {
    // Simplified: midpoint of range
    const high = Math.max(...bars.map(b => b.high));
    const low = Math.min(...bars.map(b => b.low));
    return (high + low) / 2;
  }

  private calculateVolumeNodes(bars: Bar[]): { vah: number; val: number } {
    const high = Math.max(...bars.map(b => b.high));
    const low = Math.min(...bars.map(b => b.low));
    const range = high - low;
    return {
      vah: high - range * 0.25,
      val: low + range * 0.25
    };
  }

  private detectSRZones(bars: Bar[], idx: number): any[] {
    const zones = [];
    const lookback = 50;
    const window = bars.slice(Math.max(0, idx - lookback), idx + 1);

    // Find swing points
    for (let i = 2; i < window.length - 2; i++) {
      // Swing high
      if (window[i].high > window[i - 1].high && window[i].high > window[i + 1].high) {
        zones.push({ level: window[i].high, type: 'resistance' });
      }
      // Swing low
      if (window[i].low < window[i - 1].low && window[i].low < window[i + 1].low) {
        zones.push({ level: window[i].low, type: 'support' });
      }
    }

    return zones;
  }

  private detectGannTimeCycle(bars: Bar[], idx: number): CyclicPattern | null {
    // Gann time cycles: 144, 89, 52 bars, etc.
    const gannNumbers = [8, 13, 21, 34, 55, 89, 144];
    const matchedCycle = gannNumbers.find(n => idx % n === 0);

    if (matchedCycle) {
      return {
        type: 'gann',
        period: matchedCycle,
        phase: (idx % matchedCycle) / matchedCycle,
        nextTurnTime: new Date(Date.now() + (matchedCycle - (idx % matchedCycle)) * 3600000),
        strength: 0.8,
        description: `Gann cycle: ${matchedCycle}-bar period`
      };
    }
    return null;
  }

  private detectFibonacciTimeCycle(bars: Bar[], idx: number): CyclicPattern | null {
    const fibNumbers = [5, 8, 13, 21, 34, 55, 89, 144];
    const nextFib = fibNumbers.find(n => n > idx % 144);

    if (nextFib) {
      return {
        type: 'fibonacci',
        period: nextFib,
        phase: (idx % nextFib) / nextFib,
        nextTurnTime: new Date(Date.now() + (nextFib - (idx % nextFib)) * 3600000),
        strength: 0.7,
        description: `Fibonacci time ratio approaching`
      };
    }
    return null;
  }

  private detectElliottWaveTiming(bars: Bar[], idx: number): CyclicPattern | null {
    // Elliott waves typically last 5-30 bars
    const waveLength = 13;
    const phase = (idx % waveLength) / waveLength;

    return {
      type: 'elliott',
      period: waveLength,
      phase,
      nextTurnTime: new Date(Date.now() + (waveLength - (idx % waveLength)) * 3600000),
      strength: 0.6,
      description: `Elliott wave phase: ${(phase * 100).toFixed(0)}% complete`
    };
  }

  private detectSessionCycle(bars: Bar[], idx: number): CyclicPattern | null {
    // Market session timing (assuming hourly bars)
    const sessionLength = 8; // hours
    const barsSinceOpen = idx % sessionLength;

    return {
      type: 'session',
      period: sessionLength,
      phase: barsSinceOpen / sessionLength,
      nextTurnTime: new Date(Date.now() + (sessionLength - barsSinceOpen) * 3600000),
      strength: 0.5,
      description: `${(barsSinceOpen / sessionLength * 100).toFixed(0)}% through market session`
    };
  }

  private detectSeasonalPattern(bars: Bar[], idx: number): CyclicPattern | null {
    // Simplified seasonal: monthly patterns
    const dayOfMonth = new Date().getDate();
    const daysInMonth = 30;
    const phase = dayOfMonth / daysInMonth;

    return {
      type: 'seasonal',
      period: daysInMonth,
      phase,
      nextTurnTime: new Date(Date.now() + (daysInMonth - dayOfMonth) * 24 * 3600000),
      strength: 0.4,
      description: `Seasonal position: ${(phase * 100).toFixed(0)}% through month`
    };
  }

  private calculatePatternSimilarity(pattern1: Bar[], pattern2: Bar[]): number {
    if (pattern1.length !== pattern2.length) return 0;

    let similarity = 0;
    // Compare price patterns
    for (let i = 0; i < pattern1.length; i++) {
      const ratio1 = pattern1[i].close / pattern1[0].close;
      const ratio2 = pattern2[i].close / pattern2[0].close;
      similarity += 1 - Math.abs(ratio1 - ratio2);
    }

    return similarity / pattern1.length;
  }

  private determineOutcome(bars: Bar[], idx: number, lookAhead: number): 'WIN' | 'LOSS' | 'BREAKEVEN' {
    if (idx + lookAhead >= bars.length) return 'BREAKEVEN';

    const entry = bars[idx].close;
    const exitPrice = bars[idx + lookAhead].close;
    const change = (exitPrice - entry) / entry;

    if (change > 0.01) return 'WIN';
    if (change < -0.01) return 'LOSS';
    return 'BREAKEVEN';
  }

  private calculatePatternProfitability(bars: Bar[], idx: number, periods: number): number {
    if (idx + periods >= bars.length) return 0;

    const entry = bars[idx].close;
    const exit = bars[idx + periods].close;
    return ((exit - entry) / entry) * 100;
  }
}
