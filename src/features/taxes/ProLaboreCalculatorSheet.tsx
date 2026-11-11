import { useState } from "react";
import { useProLaboreCalculator, type ProLaboreComparison } from "./taxesApi";
import { formatRate } from "./taxFormat";
import { useRevenue } from "../invoices/revenueApi";
import { BottomSheet } from "../../shared/ui/BottomSheet";
import { Badge } from "../../shared/ui/Badge";
import { MoneyField } from "../../shared/ui/MoneyField";
import { addMonths, currentMonth } from "../../shared/lib/dates";
import { formatCents, toCents } from "../../shared/lib/money";

const money = (value: number) => formatCents(toCents(value));

function lastMonthRange() {
  const month = addMonths(currentMonth(), -1);
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return { month, from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, "0")}` };
}

/**
 * A calculadora de pró-labore: com o faturamento do mês, quanto de pró-labore leva o Fator R à
 * meta, e quanto custa o Anexo III (com esse pró-labore) contra o V (com o mínimo). Começa com a
 * receita do mês passado (decisão da 4C) e só calcula ao tocar em Calcular, não a cada dígito.
 */
export function ProLaboreCalculatorSheet({ companyId, onClose }: { companyId: number; onClose: () => void }) {
  const range = lastMonthRange();
  const revenue = useRevenue(companyId, "MONTH", range.from, range.to);
  const [edited, setEdited] = useState<number | null>(null);
  const [otherCents, setOtherCents] = useState(0);
  const prefilled = revenue.data ? toCents(revenue.data.total) : 0;
  const revenueCents = edited ?? prefilled;
  // O primeiro cálculo sai sozinho com a receita do mês passado; depois, só pelo botão.
  const [asked, setAsked] = useState<{ revenue: number; other: number } | null>(null);
  const query = asked ?? (edited === null && prefilled > 0 ? { revenue: prefilled, other: 0 } : null);
  const result = useProLaboreCalculator(companyId, query ? query.revenue / 100 : null, query ? query.other / 100 : 0);
  const [, monthNumber] = range.month.split("-");

  return (
    <BottomSheet title="Calculadora de pró-labore" open onClose={onClose}>
      <form className="flex flex-col gap-4 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          setAsked({ revenue: revenueCents, other: otherCents });
        }}>
        <MoneyField label="Faturamento do mês" cents={revenueCents} onChange={setEdited}
          hint={edited === null && revenue.data ? `A receita de ${monthNumber}/${range.month.slice(0, 4)}, pelas notas.` : undefined} />
        <MoneyField label="Outros salários do mês" cents={otherCents} onChange={setOtherCents}
          hint="Salários e encargos de funcionários, que também contam no Fator R." />
        <button type="submit" disabled={revenueCents <= 0}
          className="h-12 rounded-full bg-accent font-bold text-on-accent shadow-clay-accent disabled:opacity-60">
          Calcular
        </button>
      </form>

      {result.isFetching && !result.data && <div className="mt-4 h-40 motion-safe:animate-pulse rounded-card bg-sunken" />}
      {result.error && <p role="alert" className="mt-4 text-sm font-semibold text-danger-strong">{result.error.message}</p>}
      {result.data && !result.error && <Comparison data={result.data} />}
    </BottomSheet>
  );
}

function Comparison({ data }: { data: ProLaboreComparison }) {
  return (
    <section aria-label="Comparação" className="mt-5 flex flex-col gap-3">
      <p className="text-sm text-text-soft">
        {data.cheaper === "III"
          ? <>Com pró-labore de <strong>{money(data.annexIII.proLabore)}</strong>, o Fator R chega a {formatRate(data.target)} e a
            empresa fica no Anexo III: <strong>{money(data.savings)}</strong> a menos por mês do que no Anexo V.</>
          : <>Aqui o Anexo V com o pró-labore mínimo sai <strong>{money(-data.savings)}</strong> mais barato por mês: o pró-labore
            que o Fator R pede custa mais do que economiza.</>}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Scenario title="Anexo III" subtitle={`Fator R de ${formatRate(data.target)}`} scenario={data.annexIII} cheaper={data.cheaper === "III"} />
        <Scenario title="Anexo V" subtitle="Pró-labore mínimo" scenario={data.annexV} cheaper={data.cheaper === "V"} />
      </div>
      <p className="text-xs text-text-muted">{data.notice}</p>
    </section>
  );
}

function Scenario({ title, subtitle, scenario, cheaper }: {
  title: string; subtitle: string; scenario: ProLaboreComparison["annexIII"]; cheaper: boolean;
}) {
  const rows: [string, string][] = [
    ["Pró-labore", money(scenario.proLabore)],
    [`DAS (${formatRate(scenario.effectiveRate)})`, money(scenario.das)],
    ["INSS", money(scenario.inss)],
    ["IRRF", money(scenario.irrf)],
    ["Líquido do pró-labore", money(scenario.netProLabore)],
  ];
  return (
    <div className={`flex min-w-0 flex-col gap-2 rounded-card p-3 ${cheaper ? "bg-surface shadow-card ring-2 ring-accent" : "bg-sunken"}`}>
      <div className="flex flex-col gap-1">
        <h3 className="font-display font-bold">{title}</h3>
        <span className="text-xs text-text-muted">{subtitle}</span>
        {cheaper && <span><Badge tone="income">Mais barato</Badge></span>}
      </div>
      <dl className="flex flex-col gap-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-col">
            <dt className="text-xs text-text-muted">{label}</dt>
            <dd className="font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
        <div className="mt-1 flex flex-col border-t border-line pt-2">
          <dt className="text-xs text-text-muted">Custo do mês (DAS + INSS + IRRF)</dt>
          <dd className="font-display text-lg font-bold tabular-nums">{money(scenario.totalCost)}</dd>
        </div>
      </dl>
    </div>
  );
}
