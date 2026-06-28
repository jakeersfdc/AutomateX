/**
 * REAL-TIME SIGNAL PREDICTOR
 * Integrates TimePredictionEngine with live market data
 * Generates alerts 5-60 minutes before signals fire
 * 
 * For professional traders who need exact entry timing
 */

import { TimePredictionEngine, TimePrediction } from './TimePredictionEngine';
import { Bar } from './Strategy';

export interface RealTimeAlert {
  id: string;
  timestamp: Date;
  type: 'CONFLUENCE_BUILDING' | 'PRE_SIGNAL' | 'SIGNAL_ACTIVE' | 'MOMENTUM_SHIFT' | 'ZONE_TOUCH';
  title: string;
  description: string;
  expectedSignal: 'BUY' | 'SELL' | 'HOLD' | null;
  confidence: number;
  timeToSignal: number; // seconds
  action: string;
  price: number;
  volume: number;
}

export interface PredictionSummary {
  currentTime: Date;
  nextSignalIn: number; // seconds
  predictedSignal: 'BUY' | 'SELL' | 'HOLD' | null;
  probability: number;
  confluenceReady: number; // 0-9 factors ready
  topReasons: string[];
  alerts: RealTimeAlert[];
  isHighProbability: boolean;
}

export class RealTimeSignalPredictor {
  private timePredictionEngine = new TimePredictionEngine();
  private previousPredictions: Map<string, TimePrediction> = new Map();
  private alertHistory: RealTimeAlert[] = [];
  private readonly maxHistoryAlerts = 100;

  /**
   * MAIN REAL-TIME PREDICTION FUNCTION
   * Call this every bar close or tick
   */
  analyzeCurrentMarket(
    bars: Bar[],
    symbolId: string,
    strategiesAnalysis: any[] = []
  ): PredictionSummary {
    const now = new Date();
    const idx = bars.length - 1;

    // Get detailed prediction
    const prediction = this.timePredictionEngine.predict(bars, idx, strategiesAnalysis);

    // Generate real-time alerts
    const alerts = this.generateRealTimeAlerts(
      prediction,
      symbolId,
      bars[idx],
      this.previousPredictions.get(symbolId)
    );

    // Extract top reasons
    const topReasons = this.extractTopReasons(prediction);

    // Check if high probability
    const isHighProbability = this.isHighProbability(prediction);

    // Store prediction
    this.previousPredictions.set(symbolId, prediction);

    // Store alerts
    this.alertHistory.push(...alerts);
    if (this.alertHistory.length > this.maxHistoryAlerts) {
      this.alertHistory = this.alertHistory.slice(-this.maxHistoryAlerts);
    }

    return {
      currentTime: now,
      nextSignalIn: prediction.timeUntilSignal,
      predictedSignal: prediction.expectedSignal,
      probability: prediction.signalProbability,
      confluenceReady: Math.ceil(
        prediction.confluenceFactors.filter(f => f.timeToAlignment < 60).length
      ),
      topReasons,
      alerts,
      isHighProbability
    };
  }

  /**
   * GENERATE REAL-TIME ALERTS
   * Notifies trader at critical moments
   */
  private generateRealTimeAlerts(
    prediction: TimePrediction,
    symbolId: string,
    currentBar: Bar,
    previousPrediction: TimePrediction | undefined
  ): RealTimeAlert[] {
    const alerts: RealTimeAlert[] = [];
    const now = Date.now();

    // Alert 1: Confluence Building (5+ factors aligned in next 5 min)
    const readyFactors = prediction.confluenceFactors.filter(f => f.timeToAlignment < 300);
    if (readyFactors.length >= 5) {
      alerts.push({
        id: `confluence_${symbolId}_${now}`,
        timestamp: new Date(),
        type: 'CONFLUENCE_BUILDING',
        title: '🎯 HIGH CONFLUENCE DETECTED',
        description: `${readyFactors.length}/9 factors aligning for ${prediction.expectedSignal}`,
        expectedSignal: prediction.expectedSignal,
        confidence: prediction.confidence,
        timeToSignal: prediction.timeUntilSignal,
        action: '⚠️ PREPARE ENTRY - Monitor closely',
        price: currentBar.close,
        volume: currentBar.volume
      });
    }

    // Alert 2: Pre-Signal (Signal in 5-60 minutes)
    if (prediction.timeUntilSignal > 60 && prediction.timeUntilSignal < 3600 && prediction.confidence > 0.65) {
      alerts.push({
        id: `presignal_${symbolId}_${now}`,
        timestamp: new Date(),
        type: 'PRE_SIGNAL',
        title: `⚡ ${prediction.expectedSignal} SIGNAL INCOMING`,
        description: `Expected in ${Math.ceil(prediction.timeUntilSignal / 60)} minutes - Confluence: ${prediction.confluenceScore.toFixed(1)}/100`,
        expectedSignal: prediction.expectedSignal,
        confidence: prediction.confidence,
        timeToSignal: prediction.timeUntilSignal,
        action: '📋 SET ALERTS - Prepare order templates',
        price: currentBar.close,
        volume: currentBar.volume
      });
    }

    // Alert 3: Signal Active (Signal ready to execute)
    if (prediction.timeUntilSignal < 60 && prediction.confidence > 0.60) {
      alerts.push({
        id: `signal_${symbolId}_${now}`,
        timestamp: new Date(),
        type: 'SIGNAL_ACTIVE',
        title: `🔥 ${prediction.expectedSignal} SIGNAL READY!`,
        description: `Execute ${prediction.expectedSignal} | Target: ${prediction.probabilisticTarget.toFixed(2)} | SL: ${prediction.stopLossLevel.toFixed(2)}`,
        expectedSignal: prediction.expectedSignal,
        confidence: prediction.confidence,
        timeToSignal: 0,
        action: '🚀 EXECUTE TRADE - Risk:Reward ${prediction.riskRewardRatio.toFixed(1)}:1',
        price: currentBar.close,
        volume: currentBar.volume
      });
    }

    // Alert 4: Momentum Shift (Significant change from previous prediction)
    if (previousPrediction && 
        previousPrediction.expectedSignal !== prediction.expectedSignal &&
        prediction.confidence > 0.65) {
      alerts.push({
        id: `shift_${symbolId}_${now}`,
        timestamp: new Date(),
        type: 'MOMENTUM_SHIFT',
        title: `↔️ SIGNAL SHIFT: ${previousPrediction.expectedSignal || 'HOLD'} → ${prediction.expectedSignal}`,
        description: `Confluence increased from ${previousPrediction.confluenceScore.toFixed(0)} to ${prediction.confluenceScore.toFixed(0)}`,
        expectedSignal: prediction.expectedSignal,
        confidence: prediction.confidence,
        timeToSignal: prediction.timeUntilSignal,
        action: '🔄 RE-EVALUATE POSITIONS - New direction confirmed',
        price: currentBar.close,
        volume: currentBar.volume
      });
    }

    // Alert 5: Zone Touch (Price touching key support/resistance)
    if (prediction.similarHistoricalPatterns.length > 0) {
      const avgTarget = prediction.probabilisticTarget;
      const distToTarget = Math.abs(currentBar.close - avgTarget) / currentBar.close * 100;
      
      if (distToTarget < 2) {
        alerts.push({
          id: `zone_${symbolId}_${now}`,
          timestamp: new Date(),
          type: 'ZONE_TOUCH',
          title: '🎯 APPROACHING TARGET ZONE',
          description: `Price ${distToTarget.toFixed(2)}% from probabilistic target ${avgTarget.toFixed(2)}`,
          expectedSignal: prediction.expectedSignal,
          confidence: prediction.targetProbability,
          timeToSignal: prediction.timeUntilSignal,
          action: '📊 ADJUST TARGETS - Consider profit-taking levels',
          price: currentBar.close,
          volume: currentBar.volume
        });
      }
    }

    return alerts;
  }

  /**
   * EXTRACT TOP REASONING FACTORS
   */
  private extractTopReasons(prediction: TimePrediction): string[] {
    const reasons: string[] = [];

    // Top confluence factors
    const topFactors = prediction.confluenceFactors
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 3);

    for (const factor of topFactors) {
      reasons.push(`${factor.name}: ${(factor.probability * 100).toFixed(0)}% ready`);
    }

    // Cyclic pattern
    if (prediction.cyclicPattern) {
      reasons.push(`${prediction.cyclicPattern.type.toUpperCase()} cycle: ${(prediction.cyclicPattern.phase * 100).toFixed(0)}% complete`);
    }

    // Historical accuracy
    if (prediction.backtestAccuracy > 0.65) {
      reasons.push(`Historical pattern match: ${(prediction.backtestAccuracy * 100).toFixed(0)}% win rate`);
    }

    // Risk/reward
    if (prediction.riskRewardRatio > 1.5) {
      reasons.push(`Strong risk/reward: ${prediction.riskRewardRatio.toFixed(1)}:1`);
    }

    return reasons;
  }

  /**
   * DETERMINE IF HIGH PROBABILITY SETUP
   */
  private isHighProbability(prediction: TimePrediction): boolean {
    const checks = {
      confidenceHigh: prediction.confidence > 0.70,
      confluenceStrong: prediction.confluenceScore > 65,
      patternMatch: prediction.backtestAccuracy > 0.65,
      riskRewardGood: prediction.riskRewardRatio > 1.5,
      multipleFactors: prediction.confluenceFactors.filter(f => f.strength > 0.7).length >= 3
    };

    const passingChecks = Object.values(checks).filter(v => v).length;
    return passingChecks >= 3;
  }

  /**
   * GET ALERT HISTORY
   */
  getRecentAlerts(limit: number = 10): RealTimeAlert[] {
    return this.alertHistory.slice(-limit).reverse();
  }

  /**
   * GET PREDICTION STATISTICS
   */
  getPredictionStats(): {
    totalPredictions: number;
    successfulPredictions: number;
    avgConfidence: number;
    avgAccuracy: number;
  } {
    const predictions = Array.from(this.previousPredictions.values());
    
    return {
      totalPredictions: predictions.length,
      successfulPredictions: predictions.filter(p => p.confidence > 0.65).length,
      avgConfidence: predictions.length > 0 
        ? predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length 
        : 0,
      avgAccuracy: predictions.length > 0 
        ? predictions.reduce((sum, p) => sum + p.backtestAccuracy, 0) / predictions.length 
        : 0
    };
  }

  /**
   * CLEAR HISTORY (for new trading session)
   */
  clearHistory(): void {
    this.previousPredictions.clear();
    this.alertHistory = [];
  }
}

/**
 * EXPORTS FOR INTEGRATION
 */
export function createRealTimePredictor(): RealTimeSignalPredictor {
  return new RealTimeSignalPredictor();
}
