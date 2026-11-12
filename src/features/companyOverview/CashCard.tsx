import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { useCompanyCash, type CompanyCash } from "./companyOverviewApi";
import { Card } from "../../shared/ui/Card";
import { formatDate, monthName } from "../../shared/lib/dates";
import { formatCents, signedCents, toCents } from "../../shared/lib/money";

const money = (value: number) => formatCents(toCents(value));
const rate = new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });

function Row({ label, value, strong }: { label: ReactNode; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${strong ? "font-semibold" : "text-sm text-text-soft"}`}>
      <dt className="min-w-0">{label}</dt>
      <dd className="shrink-0 whitespace-nowrap tabular-nums">{value}</dd>
    </div>
  );
}

/** Um bloco que abre com um toque, com o detalhe de onde o número vem. */
function Expandable({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 items-center justify-between gap-3 text-left font-semibold"
      >
        <span className="flex items-center gap-2">
          {label}
          <span aria-hidden className={`text-text-muted transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
        </span>
        <span className="shrink-0 whitespace-nowrap tabular-nums">{value}</span>
      </button>
      {open && <dl className="flex flex-col gap-1 rounded-2xl bg-sunken p-3">{children}</dl>}
    </div>
  );
}

function governmentSentence(cash: CompanyCash): ReactNode {
  const share = cash.governmentShare;
  if (!share) return null;
  const month = monthName(share.month);
  if (share.revenue === 0) {
    return <>Ainda não há notas em {month}.</>;
  }
  const detail = share.kind === "DAS_MEI"
    ? "DAS-MEI, valor fixo"
    : share.effectiveRate != null ? `DAS, ${rate.format(share.effectiveRate)}` : "DAS";
  return (
    <>
      Das notas de {month} ({money(share.revenue)}), <strong className="text-text">{money(share.amount)} já é do governo</strong> ({detail}).
    </>
  );
}

/**
 * O caixa da empresa hoje (decisão 30): o disponível em destaque, o saldo e a provisão abrindo em
 * detalhe, e quanto da receita do mês já é do governo. Não segue o mês dos cards: é sempre hoje.
 */
export function CashCard({ companyId }: { companyId: number }) {
  const cash = useCompanyCash(companyId);

  if (cash.isPending) {
    return <div className="h-48 motion-safe:animate-pulse rounded-card bg-sunken" aria-label="Carregando o caixa" />;
  }
  if (cash.isError) {
    return (
      <Card>
        <p role="alert" className="text-sm font-semibold text-danger-strong">{cash.error.message}</p>
      </Card>
    );
  }

  const data = cash.data;
  const { balance, provision } = data;
  const negative = toCents(data.available) < 0;
  const sentence = governmentSentence(data);

  return (
    <Card className="flex flex-col gap-4">
      <section aria-label="Caixa da empresa" className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-base font-semibold">Caixa da empresa</h2>
          <span className="text-xs text-text-muted">hoje, {formatDate(data.asOf)}</span>
        </div>
        <span className="text-sm text-text-muted">Disponível</span>
        <span className={`font-display text-3xl font-bold tabular-nums ${negative ? "text-danger-strong" : "text-text"}`}>
          {negative ? signedCents(toCents(data.available)) : money(data.available)}
        </span>
        {negative && (
          <span className="text-sm font-semibold text-danger-strong">
            Faltam {money(-data.available)} para cobrir os impostos.
          </span>
        )}
      </section>

      <div className="flex flex-col gap-1 border-t border-line pt-2">
        <Expandable label="Saldo na conta" value={money(balance.total)}>
          <Row label={`Saldo inicial em ${formatDate(data.openingBalanceDate)}`} value={money(data.openingBalance)} />
          <Row label="+ Notas emitidas (líquido)" value={money(balance.revenue)} />
          <Row label="− Despesas pagas, com impostos" value={money(balance.expenses)} />
          <Row label="− Retiradas (líquido)" value={money(balance.withdrawals)} />
          <p className="pt-1 text-xs text-text-muted">Para corrigir o saldo inicial, use Editar no topo da empresa.</p>
        </Expandable>
        <Expandable label="Reserva de impostos" value={`−\u00a0${money(provision.total)}`}>
          {provision.total === 0 && <p className="text-sm text-text-soft">Nenhum imposto a reservar agora.</p>}
          {provision.currentMonth > 0 && <Row label="Do mês corrente (até agora)" value={money(provision.currentMonth)} />}
          {provision.dueSoon > 0 && <Row label="A vencer, de meses passados" value={money(provision.dueSoon)} />}
          {provision.overdue > 0 && (
            <Row
              label={<Link to="taxes" className="inline-flex min-h-11 items-center font-bold text-danger-strong underline">Vencidos</Link>}
              value={money(provision.overdue)}
            />
          )}
          {provision.withoutExpected > 0 && (
            <p className="pt-1 text-xs text-text-muted">
              {provision.withoutExpected === 1
                ? "1 imposto sem valor previsto ficou fora."
                : `${provision.withoutExpected} impostos sem valor previsto ficaram fora.`}
            </p>
          )}
        </Expandable>
      </div>

      {sentence && <p className="rounded-2xl bg-sunken p-3 text-sm text-text-soft">{sentence}</p>}
      <p className="text-xs text-text-muted">{data.notice}</p>
    </Card>
  );
}
