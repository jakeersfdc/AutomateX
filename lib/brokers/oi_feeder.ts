/**
 * Options Data & OI Feeder
 * Real-time Open Interest and Greeks tracking
 */

export interface OptionStrike {
  strikePrice: number;
  symbol: string;
  expiry: string;
  optionType: 'CE' | 'PE';
  bid: number;
  ask: number;
  lastPrice: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  greeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    rho: number;
  };
}

export interface OptionChainSnapshot {
  baseSymbol: string;
  spotPrice: number;
  expiry: string;
  timestamp: Date;
  calls: OptionStrike[];
  puts: OptionStrike[];
  maxPainLevel: number;
  totalOI: number;
}

export interface OILevel {
  level: number;
  callOI: number;
  putOI: number;
  totalOI: number;
  vixLevel: number;
}

export class OIDataFeeder {
  private cache: Map<string, OptionChainSnapshot> = new Map();
  private oiLevels: Map<string, OILevel[]> = new Map();

  /**
   * Update option chain with real-time data
   */
  async updateOptionChain(
    baseSymbol: string,
    expiry: string,
    data: OptionChainSnapshot
  ): Promise<void> {
    const cacheKey = `${baseSymbol}-${expiry}`;
    this.cache.set(cacheKey, data);

    // Calculate OI levels
    this.calculateOILevels(data);
  }

  /**
   * Get option chain for a specific expiry
   */
  getOptionChain(
    baseSymbol: string,
    expiry: string
  ): OptionChainSnapshot | null {
    const cacheKey = `${baseSymbol}-${expiry}`;
    return this.cache.get(cacheKey) || null;
  }

  /**
   * Get nearby option strikes (for strike selector)
   */
  getNearbyStrikes(
    baseSymbol: string,
    expiry: string,
    strikesPerSide: number = 5
  ): { calls: OptionStrike[]; puts: OptionStrike[] } {
    const chain = this.getOptionChain(baseSymbol, expiry);
    if (!chain) {
      return { calls: [], puts: [] };
    }

    const spotPrice = chain.spotPrice;
    const nearestStrike =
      Math.round(spotPrice / 100) * 100;

    const sortedCalls = chain.calls.sort(
      (a, b) => a.strikePrice - b.strikePrice
    );
    const sortedPuts = chain.puts.sort(
      (a, b) => a.strikePrice - b.strikePrice
    );

    const callIndex = sortedCalls.findIndex(
      (c) => c.strikePrice >= nearestStrike
    );
    const putIndex = sortedPuts.findIndex(
      (p) => p.strikePrice >= nearestStrike
    );

    return {
      calls: sortedCalls.slice(
        Math.max(0, callIndex - strikesPerSide),
        callIndex + strikesPerSide + 1
      ),
      puts: sortedPuts.slice(
        Math.max(0, putIndex - strikesPerSide),
        putIndex + strikesPerSide + 1
      ),
    };
  }

  /**
   * Calculate max pain level
   */
  calculateMaxPain(baseSymbol: string, expiry: string): number {
    const chain = this.getOptionChain(baseSymbol, expiry);
    if (!chain) return 0;

    // Simplified max pain calculation
    let maxPain = 0;
    let maxOI = 0;

    const allStrikes = [...chain.calls, ...chain.puts];
    const uniqueStrikes = Array.from(
      new Set(allStrikes.map((s) => s.strikePrice))
    );

    for (const strike of uniqueStrikes) {
      const totalOI =
        (chain.calls.find((c) => c.strikePrice === strike)?.openInterest || 0) +
        (chain.puts.find((p) => p.strikePrice === strike)?.openInterest || 0);

      if (totalOI > maxOI) {
        maxOI = totalOI;
        maxPain = strike;
      }
    }

    return maxPain;
  }

  /**
   * Get OI distribution
   */
  getOIDistribution(baseSymbol: string, expiry: string): OILevel[] {
    const cacheKey = `${baseSymbol}-${expiry}`;
    return this.oiLevels.get(cacheKey) || [];
  }

  /**
   * Detect OI changes (potential price movement)
   */
  detectOIAnomaly(
    baseSymbol: string,
    expiry: string,
    threshold: number = 1.2 // 20% increase
  ): { level: number; changePercent: number } | null {
    const chain = this.getOptionChain(baseSymbol, expiry);
    if (!chain) return null;

    // Check for significant OI buildup at certain levels
    const allStrikes = [...chain.calls, ...chain.puts];
    const uniqueStrikes = Array.from(
      new Set(allStrikes.map((s) => s.strikePrice))
    );

    for (const strike of uniqueStrikes) {
      const callOI =
        chain.calls.find((c) => c.strikePrice === strike)?.openInterest || 0;
      const putOI =
        chain.puts.find((p) => p.strikePrice === strike)?.openInterest || 0;
      const totalOI = callOI + putOI;

      // Average OI
      const avgOI =
        (chain.calls
          .filter((c) => Math.abs(c.strikePrice - strike) < 500)
          .reduce((s, c) => s + c.openInterest, 0) +
          chain.puts
            .filter((p) => Math.abs(p.strikePrice - strike) < 500)
            .reduce((s, p) => s + p.openInterest, 0)) /
        (chain.calls.filter((c) => Math.abs(c.strikePrice - strike) < 500)
          .length +
          chain.puts.filter((p) => Math.abs(p.strikePrice - strike) < 500)
            .length);

      if (totalOI > avgOI * threshold) {
        return {
          level: strike,
          changePercent: ((totalOI - avgOI) / avgOI) * 100,
        };
      }
    }

    return null;
  }

  /**
   * Recommend strike based on signal
   */
  recommendStrike(
    baseSymbol: string,
    expiry: string,
    signal: 'BUY' | 'SELL',
    vixLevel: number
  ): { ce: number; pe: number } {
    const chain = this.getOptionChain(baseSymbol, expiry);
    if (!chain) return { ce: 0, pe: 0 };

    const spotPrice = chain.spotPrice;

    // ATM (At The Money)
    const atmStrike = Math.round(spotPrice / 100) * 100;

    // OTM (Out of The Money) based on VIX
    const strikeOffset = vixLevel > 25 ? 500 : 200;

    if (signal === 'BUY') {
      // Buy CE above current price
      return {
        ce: atmStrike + strikeOffset,
        pe: atmStrike - strikeOffset,
      };
    } else {
      // Sell PE below current price
      return {
        ce: atmStrike + strikeOffset,
        pe: atmStrike - strikeOffset,
      };
    }
  }

  /**
   * Calculate implied volatility skew
   */
  getVolSkew(
    baseSymbol: string,
    expiry: string
  ): { callSkew: number; putSkew: number } {
    const chain = this.getOptionChain(baseSymbol, expiry);
    if (!chain || chain.calls.length === 0 || chain.puts.length === 0) {
      return { callSkew: 0, putSkew: 0 };
    }

    const avgCallIV =
      chain.calls.reduce((sum, c) => sum + c.impliedVolatility, 0) /
      chain.calls.length;
    const avgPutIV =
      chain.puts.reduce((sum, p) => sum + p.impliedVolatility, 0) /
      chain.puts.length;

    return {
      callSkew: avgCallIV,
      putSkew: avgPutIV,
    };
  }

  /**
   * Private: Calculate OI levels
   */
  private calculateOILevels(chain: OptionChainSnapshot): void {
    const cacheKey = `${chain.baseSymbol}-${chain.expiry}`;
    const levels: OILevel[] = [];

    const allStrikes = [...chain.calls, ...chain.puts];
    const uniqueStrikes = Array.from(
      new Set(allStrikes.map((s) => s.strikePrice))
    ).sort((a, b) => a - b);

    for (const strike of uniqueStrikes) {
      const callOI =
        chain.calls.find((c) => c.strikePrice === strike)?.openInterest || 0;
      const putOI =
        chain.puts.find((p) => p.strikePrice === strike)?.openInterest || 0;

      levels.push({
        level: strike,
        callOI,
        putOI,
        totalOI: callOI + putOI,
        vixLevel: chain.totalOI || 0,
      });
    }

    this.oiLevels.set(cacheKey, levels);
  }
}
