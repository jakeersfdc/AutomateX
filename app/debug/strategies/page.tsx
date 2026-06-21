import { listStrategies } from "../../../lib/strategy/strategies";

export default function Page() {
  const strategies = listStrategies();
  return (
    <div style={{ padding: 24, fontFamily: "system-ui, Arial" }}>
      <h1>Registered strategies (public debug)</h1>
      <p>Temporary public page for verification. Remove after confirmation.</p>
      <ul>
        {strategies.map((s) => (
          <li key={s.id}><strong>{s.name}</strong> — <em>{s.id}</em><br />{s.description}</li>
        ))}
      </ul>
    </div>
  );
}
