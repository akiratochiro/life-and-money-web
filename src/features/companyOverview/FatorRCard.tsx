import { useState } from "react";
import { Link } from "react-router";
import { useFatorRMonitor, useRemoveExpectedRevenue, useSetExpectedRevenue, type FatorRMonitor } from "./companyOverviewApi";
import { Badge, type BadgeTone } from "../../shared/ui/Badge";
import { Card } from "../../shared/ui/Card";
import { MoneyField } from "../../shared/ui/MoneyField";
import { PendingLabel } from "../../shared/ui/PendingLabel";
import { monthName } from "../../shared/lib/dates";
import { formatCents, toCents } from "../../shared/lib/money";

const money = (value: number) => formatCents(toCents(value));
const percent = new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct = (value: number) => percent.format(value);

/** A barra vai até 40%: folga visível acima da meta, sem achatar a parte que importa. */
const SCALE = 0.4;
const position = (value: number) => `${Math.min(value / SCALE, 1) * 100}%`;

type Status = NonNullable<FatorRMonitor["status"]>;

const LOOK: Record<Status, { tone: BadgeTone; badge: string; bar: string }> = {
  OK: { tone: "income", badge: "Anexo III", bar: "bg-income" },
  BELOW_TARGET: { tone: "warning", badge: "Abaixo da meta", bar: "bg-warning" },
  BELOW_THRESHOLD: { tone: "danger", badge: "Anexo V", bar: "bg-danger" },
  NO_REVENUE: { tone: "warning", badge: "Sem receita", bar: "bg-warning" },
};

function headline(data: FatorRMonitor): string {
  switch (data.status) {
    case "OK":
      return `Na sua meta (${pct(data.target!)}): Anexo III.`;
    case "BELOW_TARGET":
      return `Ainda Anexo III, mas abaixo da sua meta de ${pct(data.target!)}.`;
    case "BELOW_THRESHOLD":
      return `Abaixo de ${pct(data.threshold!)}: ${monthName(data.competence!)} vai para o Anexo V.`;
    default:
      return "Sem receita na janela do Fator R: ainda não há o que corrigir.";
  }
}

function Bar({ data }: { data: FatorRMonitor }) {
  const look = LOOK[data.status!];
  return (
    <div className="flex flex-col gap-1" aria-hidden>
      <div className="relative h-3 rounded-full bg-sunken">
        <div className={`h-3 rounded-full ${look.bar}`} style={{ width: position(data.ratio!) }} />
        <span className="absolute -top-1 h-5 w-0.5 bg-text" style={{ left: position(data.threshold!) }} />
        {data.target! > data.threshold! && (
          <span className="absolute -top-1 h-5 w-0.5 bg-text-muted" style={{ left: position(data.target!) }} />
        )}
      </div>
      <div className="relative h-4 text-xs text-text-muted">
        <span className="absolute -translate-x-1/2" style={{ left: position(data.threshold!) }}>{pct(data.threshold!)}</span>
      </div>
    </div>
  );
}

function Suggestion({ data }: { data: FatorRMonitor }) {
  const s = data.suggestion!;
  const month = monthName(data.projectedMonth!);
  const danger = data.status === "BELOW_THRESHOLD";
  const action = s.registered
    ? `Edite o pró-labore de ${month} de ${money(s.currentProLabore)} para ${money(s.suggestedProLabore)}.`
    : s.currentProLabore > 0
      ? `Aumente o pró-labore planejado de ${month} de ${money(s.currentProLabore)} para ${money(s.suggestedProLabore)}.`
      : `Um pró-labore de ${money(s.suggestedProLabore)} em ${month} resolve.`;

  let outcome: string | null = null;
  if (danger && s.savings !== undefined) {
    outcome = s.savings > 0
      ? `Economia estimada em ${monthName(data.competence!)}: ${money(s.savings)} (DAS de ${money(s.dasAnnexV!)} no Anexo V contra ${money(s.dasAnnexIII!)} no III, menos ${money(s.extraProLaboreTaxes!)} de INSS e IRRF a mais).`
      : `Mas isso custaria ${money(-s.savings)} a mais do que economiza (INSS e IRRF de ${money(s.extraProLaboreTaxes!)} contra ${money(s.dasAnnexV! - s.dasAnnexIII!)} de DAS). Neste caso, o Anexo V sai mais barato.`;
  }

  return (
    <div role="note" className={`flex flex-col gap-2 rounded-2xl p-3 text-sm ${danger ? "bg-danger-soft text-danger-strong" : "bg-warning-soft text-warning-strong"}`}>
      <p>
        Com a receita prevista de {month} ({money(data.projection!.revenue)}), faltam {money(s.missingPayroll)} de folha
        para chegar a {pct(data.target!)}.
      </p>
      <p className="font-semibold">{action}</p>
      {outcome && <p>{outcome}</p>}
      <Link to="withdrawals" className="flex min-h-11 items-center self-start font-bold underline">
        Ajustar o pró-labore
      </Link>
    </div>
  );
}

function ExpectedRevenue({ companyId, data }: { companyId: number; data: FatorRMonitor }) {
  const current = data.projection?.expectedRevenue;
  const set = useSetExpectedRevenue(companyId);
  const remove = useRemoveExpectedRevenue(companyId);
  const [editing, setEditing] = useState(false);
  const [cents, setCents] = useState(current !== undefined ? toCents(current) : 0);
  const error = set.error ?? remove.error;

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm">
          <span className="text-text-muted">Faturamento esperado: </span>
          <span className="font-semibold tabular-nums">{current !== undefined ? `${money(current)}/mês` : "não informado"}</span>
        </span>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="flex min-h-11 items-center px-2 text-sm font-bold text-link"
            aria-label={current !== undefined ? "Mudar o faturamento esperado" : "Informar o faturamento esperado"}>
            {current !== undefined ? "Mudar" : "Informar"}
          </button>
        )}
      </div>
      {editing && (
        <div className="flex flex-col gap-3 rounded-2xl bg-sunken p-3">
          <MoneyField label="Faturamento esperado do mês" cents={cents} onChange={setCents}
            hint="Vale a partir deste mês. Útil para contrato fixo: a projeção usa o maior entre ele e as notas do mês." />
          {error && <p role="alert" className="text-sm font-semibold text-danger-strong">{error.message}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={cents <= 0 || set.isPending}
              onClick={() => set.mutate(cents / 100, { onSuccess: () => setEditing(false) })}
              className="h-11 rounded-full bg-accent px-5 font-bold text-on-accent shadow-clay-accent disabled:opacity-60">
              <PendingLabel pending={set.isPending} pendingText="Salvando…">Salvar</PendingLabel>
            </button>
            <button type="button" onClick={() => setEditing(false)} className="h-11 rounded-full bg-surface px-5 font-bold">Cancelar</button>
            {current !== undefined && (
              <button type="button" disabled={remove.isPending}
                onClick={() => remove.mutate(undefined, { onSuccess: () => { setEditing(false); setCents(0); } })}
                className="flex min-h-11 items-center px-2 text-sm font-bold text-danger-strong disabled:opacity-60">
                Não tenho valor fixo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * O monitor do Fator R (decisão 31): o da próxima competência, com o mês corrente projetado. Só no
 * Simples com Fator R; nos outros enquadramentos, nada aparece. O alerta mora só aqui, nunca no Início.
 */
export function FatorRCard({ companyId }: { companyId: number }) {
  const monitor = useFatorRMonitor(companyId);

  if (monitor.isPending) {
    return <div className="h-40 motion-safe:animate-pulse rounded-card bg-sunken" aria-label="Carregando o Fator R" />;
  }
  if (monitor.isError) {
    return (
      <Card>
        <p role="alert" className="text-sm font-semibold text-danger-strong">{monitor.error.message}</p>
      </Card>
    );
  }
  const data = monitor.data;
  if (!data.applies) return null;

  return (
    <Card className="flex flex-col gap-3">
      <section aria-label="Fator R" className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-base font-semibold">Fator R de {monthName(data.competence!)}</h2>
          {data.status && <Badge tone={LOOK[data.status].tone}>{LOOK[data.status].badge}</Badge>}
        </div>
        {data.unavailable ? (
          <p className="text-sm text-text-muted">{data.unavailable}</p>
        ) : (
          <>
            <p className="text-sm">
              <span className="font-display text-2xl font-bold tabular-nums">{pct(data.ratio!)}</span>
              <span className="sr-only">. </span>
              <span className="block text-text-soft">{headline(data)}</span>
            </p>
            {data.status !== "NO_REVENUE" && <Bar data={data} />}
            {data.suggestion && <Suggestion data={data} />}
          </>
        )}
      </section>
      <ExpectedRevenue companyId={companyId} data={data} />
      <p className="text-xs text-text-muted">{data.notice}</p>
    </Card>
  );
}
