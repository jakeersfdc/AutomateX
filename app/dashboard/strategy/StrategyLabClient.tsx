"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

interface StrategyMeta { id: string; name: string; description: string }

interface BacktestSummary {
  symbol: string;
  strategyId: string;
  startingCapital: number;
  endingCapital: number;
  totalNetPnl: number;
  roiPct: number;
  cagrPct?: number;
  closedTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  maxDrawdownPct: number;
  sharpe?: number;
  sortino?: number;
}

interface Ensemble {
  startingCapital: number;
  endingCapital: number;
  totalNetPnl: number;
  roiPct: number;
  closedTrades: number;
  winRate: number;
  avgSharpe: number | null;
  perStrategyAllocation: Record<string, number>;
}

interface PriceBar { date: string; open: number; high: number; low: number; close: number }

interface GannFanPoint { date: string; g1x1: number; g2x1: number; g4x1: number; g1x2: number; g1x4: number }

interface GannFan {
  pivot: { index: number; date: string; price: number; direction: "up" | "down"; unit: number };
  series: GannFanPoint[];
  squareSupport: number;
  squareResistance: number;
}

interface StrategyVerdict {
  id: string;
  name: string;
  action: "BUY" | "SELL" | "HOLD" | "EXIT";
  stopLoss?: number;
  target?: number;
  confidence?: number;
  reason?: string;
}

interface SnapshotResponse {
  symbol: string;
  interval: string;
  bars: number;
  lastClose: number;
  lastDate: string;
  verdicts: StrategyVerdict[];
  gannFan: GannFan | null;
  error?: string;
}

interface AllResponse {
  mode: "all";
  symbol: string;
  bars: PriceBar[];
  gannFan: GannFan | null;
  results: Record<string, BacktestSummary>;
  ensemble: Ensemble;
}

export default function StrategyLabClient({ initialStrategies }: { initialStrategies: StrategyMeta[] }) {
  const [strategies, setStrategies] = useState<StrategyMeta[]>(initialStrategies ?? []);
  const [symbol, setSymbol] = useState("RELIANCE");
  const [capital, setCapital] = useState(100000);
  const [risk, setRisk] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AllResponse | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotResponse | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const ghostStrategies = useMemo(
    () => strategies.filter((s) => ["gti_momentum", "ghost_pullback", "ghost_breakout"].includes(s.id)),
    [strategies]
  );

  useEffect(() => {
    // keep strategies fresh but start with server-provided list
    fetch("/api/strategy/backtest", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setStrategies(d.strategies ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let canceled = false;
    setSnapshotLoading(true);
    setSnapshotError(null);

    fetch(`/api/strategy/snapshot?symbol=${encodeURIComponent(symbol)}&interval=1d`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json: SnapshotResponse) => {
        if (canceled) return;
        if (json.error) {
          setSnapshotError(json.error);
          setSnapshot(null);
        } else {
          setSnapshot(json);
        }
      })
      .catch((e) => {
        if (canceled) return;
        setSnapshotError((e as Error).message);
        setSnapshot(null);
      })
      .finally(() => {
        if (!canceled) setSnapshotLoading(false);
      });

    return () => { canceled = true; };
  }, [symbol]);

  const run = useCallback(async () => {
    setBusy(true);
    setError(null);
    setData(null);
    try {
      const r = await fetch("/api/strategy/backtest", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          strategyId: "all",
          startingCapital: capital,
          riskPerTrade: risk / 100,
        }),
      });
      const text = await r.text();
      const json = text ? (JSON.parse(text) as AllResponse | { error: string; hint?: string; tried?: string[]; count?: number }) : null;
      if (!json) throw new Error("Empty response");
      if ("error" in json) {
        const detail = [
          json.error === "insufficient_history"
            ? `Not enough historical data for "${symbol}".`
            : json.error,
          json.hint,
          json.tried?.length ? `Tried: ${json.tried.join(", ")}` : null,
        ].filter(Boolean).join(" — ");
        throw new Error(detail);
      }
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [symbol, capital, risk]);

  return (
    <div className="p-6 space-y-6 text-zinc-100 bg-zinc-950 min-h-screen">
      <header className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Strategy Lab</h1>
          <p className="text-sm text-zinc-400">All strategies, side by side, with the Gann fan projection.</p>
        </div>
        <div className="ml-auto flex flex-wrap items-end gap-2 text-sm">
          <div>
            <label className="text-xs text-zinc-400">Symbol</label>
            <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 w-32" />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Capital ₹</label>
            <input type="number" value={capital} onChange={(e) => setCapital(Number(e.target.value))} className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 w-32" />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Risk %</label>
            <input type="number" step={0.25} value={risk} onChange={(e) => setRisk(Number(e.target.value))} className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 w-20" />
          </div>
          <button onClick={run} disabled={busy || !symbol} className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50">
            {busy ? "Running…" : "Run all strategies"}
          </button>
        </div>
      </header>

      {ghostStrategies.length > 0 && (
        <section className="rounded border border-emerald-800/40 bg-emerald-950/10 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-emerald-100">Ghost Trader strategies</h2>
              <p className="mt-1 text-sm text-zinc-400">
                These new strategies are live and registered below. Ghost Trader Breakout uses compression zones, Pullback uses EMA21/VWAP support, and Momentum uses VWAP + MACD trend confirmation.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {ghostStrategies.map((s) => (
              <div key={s.id} className="rounded-xl border border-emerald-800/50 bg-black/20 p-3">
                <div className="font-semibold text-white">{s.name}</div>
                <div className="text-xs text-zinc-500">{s.id}</div>
                <div className="mt-2 text-sm text-zinc-300">{s.description}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded border border-zinc-800 bg-slate-950/60 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold">Live strategy snapshot</h2>
            <p className="text-sm text-zinc-400">Fetches a live verdict for the entered symbol and shows strategy actions, including Ghost Trader signals.</p>
          </div>
          <div className="text-xs text-zinc-500">
            {snapshotLoading ? "Loading snapshot…" : snapshot ? `${snapshot.symbol} · ${snapshot.lastDate}` : "Snapshot not loaded yet"}
          </div>
        </div>

        {snapshotError && <div className="mt-3 rounded border border-rose-700 bg-rose-950/40 p-3 text-sm text-rose-200">{snapshotError}</div>}

        {snapshot && !snapshotError && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {snapshot.verdicts.map((v) => {
              const isGhost = ["gti_momentum", "ghost_pullback", "ghost_breakout"].includes(v.id);
              const tone = v.action === "BUY" ? "bg-emerald-900/60 border-emerald-700/50"
                : v.action === "SELL" ? "bg-rose-900/60 border-rose-700/50"
                : v.action === "EXIT" ? "bg-amber-900/60 border-amber-700/50"
                : "bg-white/5 border-white/10";
              return (
                <div key={v.id} className={`rounded-2xl border p-4 ${tone}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-white">{v.name}</div>
                      <div className="text-xs text-zinc-400">{v.id}</div>
                    </div>
                    <div className="text-sm font-semibold uppercase text-white/80">{v.action}</div>
                  </div>
                  {v.confidence != null && (
                    <div className="mt-2 text-xs text-zinc-300">Confidence: {(v.confidence * 100).toFixed(0)}%</div>
                  )}
                  {(v.stopLoss != null || v.target != null) && (
                    <div className="mt-2 grid gap-2 text-sm text-zinc-200">
                      {v.stopLoss != null && <div>Stop: ₹{v.stopLoss.toLocaleString("en-IN")}</div>}
                      {v.target != null && <div>Target: ₹{v.target.toLocaleString("en-IN")}</div>}
                    </div>
                  )}
                  {v.reason && <div className="mt-3 text-sm text-zinc-300">{v.reason}</div>}
                  {isGhost && <div className="mt-3 inline-flex rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">Ghost Trader</div>}
                </div>
              );
            })}
          </div>
        )}

        {snapshot && snapshot.gannFan && (
          <div className="mt-4 rounded-2xl border border-blue-700/40 bg-blue-950/30 p-4 text-sm text-zinc-200">
            <div className="font-semibold text-white">Gann fan overlay summary</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div>Pivot: {snapshot.gannFan.pivot.price.toLocaleString("en-IN")} ({snapshot.gannFan.pivot.date})</div>
              <div>Direction: {snapshot.gannFan.pivot.direction}</div>
              <div>Sq9 support: ₹{snapshot.gannFan.squareSupport.toLocaleString("en-IN")}</div>
              <div>Sq9 resistance: ₹{snapshot.gannFan.squareResistance.toLocaleString("en-IN")}</div>
            </div>
          </div>
        )}
      </section>

      {error && <div className="p-3 rounded bg-red-900/40 border border-red-700">{error}</div>}

      <section className="rounded border border-zinc-800 overflow-x-auto">
        <h2 className="text-lg font-semibold p-4 pb-2">Registered strategies (server)</h2>
        <ul className="p-4 text-sm text-zinc-300">
          {strategies.map((s) => (
            <li key={s.id} className="py-1">{s.name} — <span className="text-xs text-zinc-500">{s.id}</span></li>
          ))}
        </ul>
      </section>

      {data && (
        <>
          <section className="rounded border border-zinc-800 p-4">
            <h3 className="font-semibold">Ensemble</h3>
            <div className="text-sm text-zinc-400">ROI {data.ensemble.roiPct}% · Trades {data.ensemble.closedTrades}</div>
          </section>
          <section className="rounded border border-zinc-800 overflow-x-auto">
            <h2 className="text-lg font-semibold p-4 pb-2">Per-strategy results</h2>
            <table className="w-full text-sm">
              <thead className="text-zinc-400"><tr className="border-b border-zinc-800"><th className="p-2 text-left">Strategy</th><th>Trades</th><th>Win %</th><th>Net P&L</th></tr></thead>
              <tbody>
                {Object.entries(data.results).map(([id, r]) => (
                  <tr key={id} className="border-b border-zinc-900"><td className="p-2 font-medium">{strategies.find(s => s.id === id)?.name ?? id}</td><td className="p-2">{r.closedTrades}</td><td className="p-2">{r.winRate}%</td><td className={`p-2 ${r.totalNetPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{r.totalNetPnl}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      <footer className="text-xs text-zinc-500 pt-2">Backtest results are historical and do not guarantee future performance.</footer>
    </div>
  );
}
