import { useState } from "react";
import type { Averages, MonthlyTotal } from "./analyticsApi";
import { Money } from "../../shared/ui/Money";
import { monthLabel, shortMonthName } from "../../shared/lib/dates";

type Props = { months: MonthlyTotal[]; averages: Averages | null };

export function MonthlyBars({ months, averages }: Props) {
  const [selected, setSelected] = useState(months.at(-1)?.month ?? null);

  const max = Math.max(
    1,
    ...months.flatMap((month) => [month.income, month.expense, month.saving]),
    averages?.expense ?? 0,
  );
  const heightOf = (value: number) => `${(value / max) * 100}%`;
  const active = months.find((month) => month.month === selected);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-48">
        {averages && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-dashed border-expense/70"
            style={{ bottom: heightOf(averages.expense) }}
          />
        )}
        <div className="flex h-full items-end gap-1.5">
          {months.map((month) => (
            <button
              key={month.month}
              type="button"
              aria-pressed={selected === month.month}
              aria-label={`${monthLabel(month.month)}${month.closed ? "" : ", em andamento"}`}
              onClick={() => setSelected(month.month)}
              className={`flex h-full flex-1 items-end justify-center gap-0.5 rounded-xl px-1 transition hover:bg-ink-800 aria-pressed:bg-ink-800 ${
                month.closed ? "" : "opacity-55"
              }`}
            >
              <span className="block w-full max-w-3 rounded-t-md bg-income transition-[height] duration-700" style={{ height: heightOf(month.income) }} />
              <span className="block w-full max-w-3 rounded-t-md bg-expense transition-[height] duration-700" style={{ height: heightOf(month.expense) }} />
              <span className="block w-full max-w-3 rounded-t-md bg-saving transition-[height] duration-700" style={{ height: heightOf(month.saving) }} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1.5" aria-hidden="true">
        {months.map((month) => (
          <span key={month.month} className="flex-1 text-center text-[11px] font-bold uppercase text-text-muted">
            {shortMonthName(month.month)}
            {month.closed ? "" : "*"}
          </span>
        ))}
      </div>

      {active && (
        <div className="rounded-2xl bg-ink-800 p-4">
          <p className="mb-3 text-sm font-bold">
            {monthLabel(active.month)}
            {!active.closed && <span className="font-semibold text-text-muted"> · em andamento</span>}
          </p>
          <dl className="grid grid-cols-3 gap-2">
            <Value label="Entrou" value={active.income} className="text-income" />
            <Value label="Saiu" value={active.expense} className="text-expense" />
            <Value label="Guardou" value={active.saving} className="text-saving-soft" />
          </dl>
        </div>
      )}
    </div>
  );
}

function Value({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-semibold text-text-muted">{label}</dt>
      <dd className={`m-0 text-sm font-bold ${className}`}>
        <Money value={value} />
      </dd>
    </div>
  );
}