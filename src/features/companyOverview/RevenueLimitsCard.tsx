import { useState } from "react";
import { useRevenueLimits, type RevenueLimit, type RevenueLimits } from "./companyOverviewApi";
import { barGeometry, mainLimit, percent } from "./revenueLimits";
import { Badge, type BadgeTone } from "../../shared/ui/Badge";
import { Card } from "../../shared/ui/Card";
import { monthLabel } from "../../shared/lib/dates";
import { formatCents, toCents } from "../../shared/lib/money";

const money = (value: number) => formatCents(toCents(value));

const BADGE: Record<RevenueLimit["level"], { tone: BadgeTone; label: string } | null> = {
  NONE: null,
  WARNING: { tone: "warning", label: "Atenção" },
  NEAR: { tone: "warning", label: "Perto" },
  EXCEEDED: { tone: "danger", label: "Passou" },
  EXCEEDED_TOLERANCE: { tone: "danger", label: "Passou dos 20%" },
};

const ALERT_CLASS = {
  INFO: "bg-sunken text-text-soft",
  WARNING: "bg-warning-soft text-warning-strong",
  DANGER: "bg-danger-soft text-danger-strong",
} as const;

function badgeOf(limit: RevenueLimit) {
  // Virar EPP não muda imposto: o selo não pode ser vermelho.
  if (limit.kind === "SIMPLES_EPP" && limit.exceededIn != null) return { tone: "saving" as BadgeTone, label: "Virou EPP" };
  return BADGE[limit.level];
}

function Bar({ revenue, limit }: { revenue: number; limit: RevenueLimit }) {
  const { fill, limitAt } = barGeometry(revenue, limit);
  const color = limit.level === "NONE" ? "bg-income" : limit.level === "WARNING" || limit.level === "NEAR" ? "bg-warning" : "bg-danger";
  return (
    <div className="flex flex-col gap-1" aria-hidden="true">
      <div className="relative h-3 overflow-hidden rounded-full bg-sunken">
        {limit.toleranceAmount != null && (
          <div className="absolute inset-y-0 right-0 bg-warning-soft" style={{ left: `${limitAt}%` }} />
        )}
        <div className={`relative h-3 rounded-full ${color}`} style={{ width: `${fill}%` }} />
      </div>
      {limit.toleranceAmount != null && (
        <div className="flex justify-between text-xs text-text-muted">
          <span>0</span>
          <span>100% · +20%</span>
        </div>
      )}
    </div>
  );
}

function OtherLimits({ data, main }: { data: RevenueLimits; main: RevenueLimit }) {
  const others = data.limits.filter((limit) => limit.kind !== main.kind);
  if (others.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1 text-sm text-text-soft">
      {others.map((limit) => (
        <li key={limit.kind} className="flex items-baseline justify-between gap-3">
          <span>{limit.label} ({money(limit.amount)})</span>
          <span className="shrink-0 tabular-nums">
            {limit.exceededIn != null ? `passou em ${monthLabel(limit.exceededIn).toLowerCase()}` : percent(limit.ratio)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Os limites de faturamento do ano (decisão 33): a barra do limite que importa agora, o alerta do mais
 * urgente com a consequência em linguagem simples, "no ritmo atual" e um seletor de ano. Só no MEI e no
 * Simples; as frases vêm prontas da API.
 */
export function RevenueLimitsCard({ companyId }: { companyId: number }) {
  const [year, setYear] = useState<number | undefined>(undefined);
  const limits = useRevenueLimits(companyId, year);

  if (limits.isPending) {
    return <div className="h-40 motion-safe:animate-pulse rounded-card bg-sunken" aria-label="Carregando os limites de faturamento" />;
  }
  if (limits.isError) {
    return (
      <Card>
        <p role="alert" className="text-sm font-semibold text-danger-strong">{limits.error.message}</p>
      </Card>
    );
  }
  const data = limits.data;
  const current = data.year === data.years[0];
  if (!data.applies && current) return null;

  const main = mainLimit(data);
  const alert = data.limits.find((limit) => limit.kind === data.alert);
  const projection = data.limits.find((limit) => limit.projectionMessage != null)?.projectionMessage;
  const badge = main ? badgeOf(main) : null;

  return (
    <Card className="flex flex-col gap-3">
      <section aria-label="Limites de faturamento" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold">Limites de faturamento</h2>
          {data.years.length > 1 ? (
            <label className="flex items-center">
              <span className="sr-only">Ano</span>
              <select value={data.year} onChange={(e) => setYear(Number(e.target.value))}
                className="h-11 rounded-full bg-sunken px-4 text-base font-bold text-text">
                {data.years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
          ) : (
            <span className="text-sm font-semibold text-text-muted">{data.year}</span>
          )}
        </div>

        {!data.applies || !main ? (
          <p className="text-sm text-text-muted">Sem limites de faturamento para o Lucro Presumido ou Real em {data.year}.</p>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <span className="flex flex-col">
                  <span className="font-semibold">{main.label}</span>
                  {data.openingYear && (
                    <span className="text-xs text-text-muted">
                      Proporcional: {data.activityMonths} {data.activityMonths === 1 ? "mês" : "meses"} de atividade
                    </span>
                  )}
                </span>
                {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
              </div>
              <p className="text-sm">
                <span className="font-display text-xl font-bold tabular-nums">{money(data.revenue)}</span>
                <span className="text-text-muted"> de {money(main.amount)} · {percent(main.ratio)}</span>
              </p>
              <Bar revenue={data.revenue} limit={main} />
            </div>

            {alert?.message != null && (
              <p role="note" className={`rounded-2xl p-3 text-sm ${ALERT_CLASS[alert.severity ?? "WARNING"]}`}>{alert.message}</p>
            )}
            {projection != null && <p className="text-sm font-semibold text-text-soft">{projection}</p>}
            <OtherLimits data={data} main={main} />
          </>
        )}
      </section>
      {data.conditional != null && <p className="text-xs text-text-muted">{data.conditional}</p>}
      <p className="text-xs text-text-muted">{data.notice}</p>
    </Card>
  );
}

