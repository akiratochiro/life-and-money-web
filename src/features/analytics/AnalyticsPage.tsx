import { useState } from "react";
import { useExpensesByCategory, useMonthlyTotals } from "./analyticsApi";
import { ExpensesDonut } from "./ExpensesDonut";
import { MonthlyBars } from "./MonthlyBars";
import { MonthSwitcher } from "../../shared/ui/MonthSwitcher";
import { Money } from "../../shared/ui/Money";
import { currentMonth } from "../../shared/lib/dates";

const RANGES = [3, 6, 12];

export function AnalyticsPage() {
  const [month, setMonth] = useState(currentMonth());
  const [range, setRange] = useState(6);
  const expenses = useExpensesByCategory(month);
  const totals = useMonthlyTotals(range);
  const averages = totals.data?.averages ?? null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Análises</h1>

      <section className="flex flex-col gap-5 rounded-hero bg-surface p-6 shadow-card">
        <h2 className="font-display text-base font-semibold">Para onde foi o dinheiro</h2>
        <MonthSwitcher month={month} onChange={setMonth} />
        {expenses.isPending ? (
          <div className="h-52 animate-pulse rounded-card bg-ink-800" aria-busy="true" aria-label="Carregando" />
        ) : expenses.isError ? (
          <p role="alert" className="text-sm text-text-soft">Não foi possível carregar os gastos.</p>
        ) : (
          <ExpensesDonut key={month} data={expenses.data} />
        )}
      </section>

      <section className="flex flex-col gap-5 rounded-hero bg-surface p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold">Mês a mês</h2>
          <div role="group" aria-label="Período" className="flex gap-1 rounded-full bg-ink-800 p-1">
            {RANGES.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={range === option}
                onClick={() => setRange(option)}
                className={`h-9 rounded-full px-3 text-xs font-bold transition active:scale-95 ${
                  range === option ? "bg-signal text-ink-900" : "text-text-muted"
                }`}
              >
                {option} meses
              </button>
            ))}
          </div>
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-text-muted">
          <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-income" />Entrou</li>
          <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-expense" />Saiu</li>
          <li className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-saving" />Guardou</li>
          {averages && (
            <li className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-expense" />Média de gastos</li>
          )}
          <li>* mês em andamento</li>
        </ul>

        {totals.isPending ? (
          <div className="h-64 animate-pulse rounded-card bg-ink-800" aria-busy="true" aria-label="Carregando" />
        ) : totals.isError ? (
          <p role="alert" className="text-sm text-text-soft">Não foi possível carregar o histórico.</p>
        ) : (
          <MonthlyBars key={range} months={totals.data.months ?? []} averages={averages} />
        )}

        {!totals.isPending && !totals.isError && (
          averages ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-bold">
                Médias de {averages.basedOnMonths} {averages.basedOnMonths === 1 ? "mês fechado" : "meses fechados"}
              </p>
              <dl className="grid grid-cols-3 gap-2">
                <Average label="Entrou" value={averages.income ?? 0} className="text-income" />
                <Average label="Saiu" value={averages.expense ?? 0} className="text-expense" />
                <Average label="Guardou" value={averages.saving ?? 0} className="text-saving-soft" />
              </dl>
            </div>
          ) : (
            <p className="rounded-2xl bg-ink-800 p-4 text-sm leading-snug text-text-soft">
              Ainda não há meses fechados desde o seu cadastro neste período, então ainda não dá para calcular médias.
            </p>
          )
        )}
      </section>
    </div>
  );
}

function Average({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-semibold text-text-muted">{label}</dt>
      <dd className={`m-0 text-[15px] font-bold ${className}`}>
        <Money value={value} />
      </dd>
    </div>
  );
}