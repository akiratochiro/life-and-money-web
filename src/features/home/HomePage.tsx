import { useBudgetDashboard, useGoals, useMe, useMonthTotals } from "./homeApi";
import { BalanceCard } from "./BalanceCard";
import { AttentionSection, isAlert } from "./AttentionSection";
import { GoalsSection } from "./GoalsSection";
import { BudgetSummary } from "./BudgetSummary";
import { useLogout } from "../auth/useLogout";
import { currentMonth, greeting, longDate } from "../../shared/lib/dates";

export function HomePage() {
  const month = currentMonth();
  const me = useMe();
  const totals = useMonthTotals();
  const budget = useBudgetDashboard(month);
  const goals = useGoals();
  const logout = useLogout();

  const firstName = me.data?.name?.split(" ")[0];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-text-muted">{longDate()}</p>
          <h1 className="font-display text-2xl font-semibold">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </h1>
        </div>
        <button type="button" onClick={logout} className="h-11 rounded-full px-4 text-sm font-bold text-text-muted transition hover:text-text active:scale-95">
          Sair
        </button>
      </header>

      {totals.isPending || budget.isPending || goals.isPending ? (
        <HomeSkeleton />
      ) : totals.isError || budget.isError || goals.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-card bg-surface p-5">
          <p className="text-sm text-text-soft">Não foi possível carregar seus dados agora.</p>
          <button
            type="button"
            onClick={() => {
              totals.refetch();
              budget.refetch();
              goals.refetch();
            }}
            className="text-sm font-bold text-signal"
          >
            Tentar de novo
          </button>
        </div>
      ) : (
        <Feed month={month} totals={totals.data} lines={budget.data.items ?? []} goals={goals.data ?? []} />
      )}
    </div>
  );
}

type FeedProps = {
  month: string;
  totals: NonNullable<ReturnType<typeof useMonthTotals>["data"]>;
  lines: NonNullable<ReturnType<typeof useBudgetDashboard>["data"]>["items"] & {};
  goals: NonNullable<ReturnType<typeof useGoals>["data"]>;
};

function Feed({ month, totals, lines, goals }: FeedProps) {
  const current = totals.months?.at(-1);
  const overdueGoals = goals.filter((goal) => goal.status === "OVERDUE");
  const otherGoals = goals.filter((goal) => goal.status !== "OVERDUE");
  const calmLines = lines.filter((line) => !isAlert(line));

  return (
    <>
      <BalanceCard
        month={month}
        income={current?.income ?? 0}
        expense={current?.expense ?? 0}
        saving={current?.saving ?? 0}
      />
      <AttentionSection lines={lines} overdueGoals={overdueGoals} />
      <GoalsSection goals={otherGoals} />
      <BudgetSummary lines={calmLines} hasAnyBudget={lines.length > 0} />
    </>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Carregando">
      <div className="h-64 animate-pulse rounded-hero bg-surface" />
      <div className="h-28 animate-pulse rounded-card bg-surface" />
      <div className="h-28 animate-pulse rounded-card bg-surface" />
    </div>
  );
}