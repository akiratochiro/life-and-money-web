import { useState } from "react";
import { useBudgetDashboard, type BudgetLine, type BudgetStatus } from "./budgetApi";
import { BudgetLineCard } from "./BudgetLineCard";
import { BudgetEditor } from "./BudgetEditor";
import { useCategories } from "../categories/categoriesApi";
import { MonthSwitcher } from "../../shared/ui/MonthSwitcher";
import { Money } from "../../shared/ui/Money";
import { currentMonth, monthLabel } from "../../shared/lib/dates";
import { toCents } from "../../shared/lib/money";

const SEVERITY: Record<BudgetStatus, number> = {
  EXCEEDED: 0,
  WARNING: 1,
  OK: 2,
  IN_PROGRESS: 3,
  REACHED: 4,
};

function bySeverityThenName(a: BudgetLine, b: BudgetLine): number {
  const bySeverity = SEVERITY[a.status] - SEVERITY[b.status];
  return bySeverity !== 0 ? bySeverity : a.categoryName.localeCompare(b.categoryName);
}

export function BudgetPage() {
  const thisMonth = currentMonth();
  const [month, setMonth] = useState(thisMonth);
  const [definingId, setDefiningId] = useState<number | null>(null);
  const dashboard = useBudgetDashboard(month);
  const categories = useCategories();

  const editable = month === thisMonth;
  const lines = [...(dashboard.data?.items ?? [])].sort(bySeverityThenName);
  const income = dashboard.data?.income ?? 0;

  const expenseLines = lines.filter((line) => line.categoryType === "EXPENSE");
  const plannedCents = expenseLines.reduce((sum, line) => sum + toCents(line.effectiveLimit), 0);
  const spentCents = expenseLines.reduce((sum, line) => sum + toCents(line.spent), 0);
  const hasPercentage = lines.some((line) => line.mode === "PERCENTAGE");

  const budgetedIds = new Set(lines.map((line) => line.categoryId));
  const unbudgeted = (categories.data ?? []).filter(
    (category) => category.type !== "INCOME" && !budgetedIds.has(category.id),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Orçamento</h1>

      <MonthSwitcher
        month={month}
        onChange={(next) => {
          setMonth(next);
          setDefiningId(null);
        }}
      />

      {!editable && (
        <p role="status" className="rounded-2xl bg-ink-800 p-4 text-sm leading-snug text-text-soft">
          {month < thisMonth
            ? `Você está vendo o orçamento que valia em ${monthLabel(month).toLowerCase()}. Meses passados não podem ser alterados.`
            : `Alterações no orçamento valem a partir do mês atual. Volte para ${monthLabel(thisMonth).toLowerCase()} para editar.`}
        </p>
      )}

      {dashboard.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Carregando">
          <div className="h-36 animate-pulse rounded-hero bg-surface" />
          <div className="h-32 animate-pulse rounded-card bg-surface" />
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-4 rounded-hero bg-surface p-6 shadow-card">
            <dl className="grid grid-cols-3 gap-2">
              <Figure label="Receita do mês" cents={toCents(income)} className="text-income" />
              <Figure label="Planejado" cents={plannedCents} className="text-text" />
              <Figure label="Gasto" cents={spentCents} className="text-expense" />
            </dl>
            {plannedCents > toCents(income) && income > 0 && (
              <p className="rounded-2xl bg-ink-800 px-4 py-3 text-sm leading-snug text-text-soft">
                Seus limites de gastos somam mais do que a receita do mês. Vale rever o plano.
              </p>
            )}
            {!dashboard.data?.closed && hasPercentage && (
              <p className="text-xs leading-snug text-text-muted">
                Os limites em porcentagem acompanham a receita, e ainda podem mudar até o fim do mês.
              </p>
            )}
          </section>

          {lines.length === 0 ? (
            <p className="rounded-card border border-dashed border-line p-5 text-sm text-text-soft">
              Nenhuma categoria com orçamento em {monthLabel(month).toLowerCase()}.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {lines.map((line) => (
                <BudgetLineCard key={`${month}-${line.categoryId}`} line={line} editable={editable} />
              ))}
            </div>
          )}

          {editable && unbudgeted.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="px-1 font-display text-base font-semibold">Sem orçamento</h2>
              <ul className="flex flex-col gap-2">
                {unbudgeted.map((category) => (
                  <li key={category.id} className="flex flex-col gap-2 rounded-card bg-surface p-3">
                    <div className="flex items-center justify-between gap-2 px-2">
                      <span className="truncate font-bold">{category.name}</span>
                      {definingId !== category.id && (
                        <button
                          type="button"
                          onClick={() => setDefiningId(category.id)}
                          className="h-11 px-2 text-sm font-bold text-signal"
                        >
                          Definir limite
                        </button>
                      )}
                    </div>
                    {definingId === category.id && (
                      <BudgetEditor categoryId={category.id} onDone={() => setDefiningId(null)} />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Figure({ label, cents, className }: { label: string; cents: number; className: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-semibold text-text-muted">{label}</dt>
      <dd className={`m-0 text-[15px] font-bold ${className}`}>
        <Money value={cents / 100} />
      </dd>
    </div>
  );
}