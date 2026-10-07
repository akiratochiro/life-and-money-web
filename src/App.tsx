export default function App() {
  return (
    <main className="min-h-dvh bg-ink-900 p-6">
      <section className="max-w-sm rounded-hero bg-surface p-6 shadow-card">
        <p className="text-sm font-semibold text-text-muted">Saldo de outubro</p>
        <p className="mt-2 font-display text-4xl font-bold tracking-tight tabular-nums">
          R$ 3.820,00
        </p>
        <button className="mt-5 rounded-full bg-signal px-5 py-3 font-bold text-ink-900 transition active:scale-95">
          Nova transação
        </button>
      </section>
    </main>
  );
}