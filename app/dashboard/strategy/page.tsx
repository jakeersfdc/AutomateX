import StrategyLabClient from "./StrategyLabClient";
import { listStrategies } from "../../../lib/strategy/strategies";

export default function Page() {
  const strategies = listStrategies().map((s) => ({ id: s.id, name: s.name, description: s.description ?? "" }));
  const ghostStrategies = strategies.filter((s) => ["gti_momentum", "ghost_pullback", "ghost_breakout"].includes(s.id));

  return (
    <>
      <section className="p-6 bg-zinc-900 border-b border-zinc-800">
        <h2 className="text-lg font-semibold">Registered strategies (server)</h2>
        <ul className="mt-2 text-sm text-zinc-300">
          {strategies.map((s) => (
            <li key={s.id} className="py-0.5">{s.name} — <span className="text-xs text-zinc-500">{s.id}</span></li>
          ))}
        </ul>
      </section>

      {ghostStrategies.length > 0 && (
        <section className="p-6 bg-emerald-950/10 border-b border-emerald-700/30">
          <h2 className="text-lg font-semibold text-emerald-200">Ghost Trader strategies are live</h2>
          <p className="mt-2 text-sm text-zinc-300">
            The new Ghost Trader strategies are registered and available in Strategy Lab. They include zone-aware breakout, VWAP/EMA pullback, and momentum entries.
          </p>
          <ul className="mt-3 space-y-2 text-sm text-zinc-200">
            {ghostStrategies.map((s) => (
              <li key={s.id} className="rounded-xl border border-emerald-800/40 bg-emerald-950/40 p-3">
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs text-zinc-400">{s.id}</div>
                <div className="mt-1 text-sm text-zinc-300">{s.description}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <StrategyLabClient initialStrategies={strategies} />
    </>
  );
}
