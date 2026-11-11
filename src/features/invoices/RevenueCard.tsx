import { useState } from "react";
import { Link } from "react-router";
import { useRevenue, type Granularity } from "./revenueApi";
import { barLabel, defaultRange, periodLabel } from "./revenueRange";
import { Card } from "../../shared/ui/Card";
import { formatCents, toCents } from "../../shared/lib/money";

const OPTIONS: { value: Granularity; label: string; period: string }[] = [
  { value: "DAY", label: "Dia", period: "últimos 30 dias" },
  { value: "WEEK", label: "Semana", period: "últimas 12 semanas" },
  { value: "MONTH", label: "Mês", period: "últimos 12 meses" },
];

/** Por dia, um rótulo a cada 5 barras; nas outras, todas: 30 rótulos não cabem no celular. */
const LABEL_EVERY: Record<Granularity, number> = { DAY: 5, WEEK: 2, MONTH: 1 };

/**
 * A receita da empresa por competência (decisão 26). As barras são só desenho: com 12 ou 30 barras
 * no celular, cada uma teria menos de 44 px, pequena demais para tocar. Os valores ficam numa
 * tabela para o leitor de tela, e o card destaca o total, o período atual e o maior.
 */
export function RevenueCard({ companyId }: { companyId: number }) {
  const [granularity, setGranularity] = useState<Granularity>("MONTH");
  const range = defaultRange(granularity);
  const revenue = useRevenue(companyId, granularity, range.from, range.to);
  const option = OPTIONS.find((o) => o.value === granularity)!;

  const points = revenue.data?.points ?? [];
  const cents = points.map((point) => toCents(point.amount));
  const max = Math.max(1, ...cents);
  const best = points.length ? points[cents.indexOf(Math.max(...cents))] : undefined;
  const current = points.at(-1);
  const empty = revenue.data && points.every((point) => point.invoices === 0);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-base font-semibold">Receita</h2>
        <div role="group" aria-label="Agrupar por" className="flex gap-1 rounded-full bg-sunken p-1">
          {OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={granularity === value}
              onClick={() => setGranularity(value)}
              className={`flex h-11 items-center rounded-full px-4 text-sm font-bold transition ${
                granularity === value ? "bg-surface text-text shadow-clay-sm" : "text-text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {revenue.isPending ? (
        <div className="h-48 motion-safe:animate-pulse rounded-2xl bg-sunken" />
      ) : revenue.isError ? (
        <p role="alert" className="text-sm font-semibold text-danger-strong">{revenue.error.message}</p>
      ) : empty ? (
        <p className="text-sm leading-relaxed text-text-soft">
          Nenhuma nota ativa nos {option.period}. A receita aparece aqui pela competência das{" "}
          <Link to="invoices" className="font-bold text-link">notas fiscais</Link>.
        </p>
      ) : (
        <>
          <p className="flex flex-col">
            <span className="font-display text-3xl font-bold tabular-nums">{formatCents(toCents(revenue.data.total))}</span>
            <span className="text-sm text-text-muted">nos {option.period}</span>
          </p>

          <div aria-hidden="true" className="flex h-40 items-end gap-0.5">
            {points.map((point, index) => (
              <div key={point.start} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div
                  className={`w-full rounded-t-md ${index === points.length - 1 ? "bg-income-strong" : "bg-income"}`}
                  style={{ height: `${(cents[index] / max) * 100}%`, minHeight: cents[index] > 0 ? 2 : 0 }}
                />
                <span className="h-4 text-[10px] leading-4 text-text-muted">
                  {index % LABEL_EVERY[granularity] === 0 ? barLabel(point.start, granularity) : ""}
                </span>
              </div>
            ))}
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            {current && (
              <div className="flex flex-col rounded-2xl bg-sunken p-3">
                <dt className="text-text-muted">{periodLabel(current.start, current.end, granularity)}</dt>
                <dd className="font-semibold tabular-nums">{formatCents(toCents(current.amount))}</dd>
              </div>
            )}
            {/* Se o maior é o próprio período atual, o segundo destaque só repetiria o número. */}
            {best && toCents(best.amount) > 0 && best.start !== current?.start && (
              <div className="flex flex-col rounded-2xl bg-sunken p-3">
                <dt className="text-text-muted">Maior: {periodLabel(best.start, best.end, granularity)}</dt>
                <dd className="font-semibold tabular-nums">{formatCents(toCents(best.amount))}</dd>
              </div>
            )}
          </dl>

          <table className="sr-only">
            <caption>Receita por período</caption>
            <thead>
              <tr><th scope="col">Período</th><th scope="col">Receita</th><th scope="col">Notas</th></tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.start}>
                  <th scope="row">{periodLabel(point.start, point.end, granularity)}</th>
                  <td>{formatCents(toCents(point.amount))}</td>
                  <td>{point.invoices}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Card>
  );
}
