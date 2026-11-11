import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { overviewQuery, useCompanyOverview } from "./companyOverviewApi";
import { usePrefetchAdjacentMonths } from "../../shared/api/usePrefetchAdjacentMonths";
import { MonthSwitcher } from "../../shared/ui/MonthSwitcher";
import { currentMonth } from "../../shared/lib/dates";
import { formatCents, signedCents, toCents } from "../../shared/lib/money";

const money = (value: number) => formatCents(toCents(value));

function MonthCard({ to, label, value, detail }: { to: string; label: string; value: number; detail?: string }) {
  return (
    <Link to={to} className="flex min-h-24 flex-col gap-1 rounded-card bg-surface p-4 shadow-card transition active:scale-[0.985]">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="font-display text-xl font-bold tabular-nums">{money(value)}</span>
      {detail && <span className="text-xs text-text-muted">{detail}</span>}
    </Link>
  );
}

/**
 * Os cards do mês (decisão 28): receita, despesas, impostos da competência e retiradas, e o resultado
 * na largura toda. Cada card leva à aba dele. No mês corrente, tudo é previsão. Retiradas aparece
 * também no MEI (distribuição de lucros, Fase 6).
 */
export function MonthCards({ companyId }: { companyId: number }) {
  const [month, setMonth] = useState(currentMonth());
  const overview = useCompanyOverview(companyId, month);
  usePrefetchAdjacentMonths(month, (neighbor) => overviewQuery(companyId, neighbor));
  const data = overview.data;

  let body: ReactNode;
  if (overview.isPending) {
    body = <div className="h-56 motion-safe:animate-pulse rounded-card bg-sunken" />;
  } else if (overview.isError) {
    body = <p role="alert" className="text-sm font-semibold text-danger-strong">{overview.error.message}</p>;
  } else {
    const positive = toCents(data!.result) >= 0;
    const taxDetail = [
      data!.taxes.expected > 0 ? `${money(data!.taxes.expected)} previsto` : null,
      data!.taxes.withoutExpected > 0
        ? `${data!.taxes.withoutExpected} sem valor previsto`
        : null,
    ].filter(Boolean).join(" · ");
    body = (
      <>
        <div className="grid grid-cols-2 gap-3">
          <MonthCard to="invoices" label="Receita" value={data!.revenue} />
          <MonthCard to="expenses" label="Despesas" value={data!.expenses.total}
            detail={data!.expenses.pending > 0 ? `${money(data!.expenses.pending)} a pagar` : undefined} />
          <MonthCard to="taxes" label="Impostos" value={data!.taxes.total} detail={taxDetail || undefined} />
          <MonthCard to="withdrawals" label="Retiradas" value={data!.withdrawals.total}
            detail={data!.withdrawals.count > 0 ? "Não entram no resultado" : undefined} />
        </div>
        <section aria-label="Resultado"
          className={`flex flex-col gap-1 rounded-card p-5 shadow-card ${positive ? "bg-income-soft" : "bg-danger-soft"}`}>
          <span className="text-sm font-semibold text-text-soft">{data!.open ? "Resultado previsto" : "Resultado"}</span>
          <span className={`font-display text-3xl font-bold tabular-nums ${positive ? "text-income-strong" : "text-danger-strong"}`}>
            {signedCents(toCents(data!.result))}
          </span>
          <span className="text-xs text-text-soft">Receita − despesas − impostos da competência.</span>
        </section>
        <p className="text-xs text-text-muted">
          {data!.open && "O mês ainda não acabou: os valores são previsão. "}
          {data!.notice}
        </p>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <MonthSwitcher month={month} onChange={setMonth} />
      {body}
    </div>
  );
}
