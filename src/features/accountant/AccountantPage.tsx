import { useState } from "react";
import { Link } from "react-router";
import { useDownloadAccountantPackage } from "./accountantApi";
import { useCompanyContext } from "../company/companyContext";
import { useInvoices } from "../invoices/invoicesApi";
import { useExpenseMonth } from "../companyExpenses/companyExpensesApi";
import { useWithdrawals } from "../withdrawals/withdrawalsApi";
import { ApiError } from "../../shared/api/problem";
import { formatWait, useRetryCountdown } from "../../shared/api/useRetryCountdown";
import { addMonths, currentMonth, monthLabel, monthName } from "../../shared/lib/dates";
import { Card } from "../../shared/ui/Card";
import { MonthSwitcher } from "../../shared/ui/MonthSwitcher";
import { PendingLabel } from "../../shared/ui/PendingLabel";

function Item({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span aria-hidden="true" className={`mt-0.5 font-bold ${ok ? "text-income-strong" : "text-warning-strong"}`}>{ok ? "✓" : "!"}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </li>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * A aba "Contador" (decisão 34): o pacote do mês em ZIP, com a prévia do que vai nele montada das
 * consultas que já existem, e o aviso das despesas pagas sem comprovante. Começa no mês anterior,
 * que é o que o contador fecha.
 */
export function AccountantPage() {
  const company = useCompanyContext();
  const opening = company.openingDate.slice(0, 7);
  const now = currentMonth();
  const [month, setMonth] = useState(() => {
    const previous = addMonths(now, -1);
    return previous < opening ? now : previous;
  });
  const year = Number(month.slice(0, 4));
  const invoices = useInvoices(company.id, year);
  const expenses = useExpenseMonth(company.id, month);
  const withdrawals = useWithdrawals(company.id, year);
  const download = useDownloadAccountantPackage(company.id);
  const wait = useRetryCountdown(download.error);
  const rateLimited = download.error instanceof ApiError && download.error.status === 429;

  const inRange = month >= opening && month <= now;
  const ofMonth = (invoices.data ?? []).filter((invoice) => invoice.competenceDate.startsWith(month));
  const cancelled = ofMonth.filter((invoice) => invoice.status === "CANCELADA").length;
  const paid = (expenses.data?.items ?? []).filter((item) => item.status === "PAID");
  const withReceipt = paid.filter((item) => item.hasReceipt).length;
  const missing = paid.filter((item) => !item.hasReceipt);
  const paidWithdrawals = (withdrawals.data ?? []).filter((w) => w.paymentDate.startsWith(month)).length;
  const loading = invoices.isPending || expenses.isPending || withdrawals.isPending;

  function changeMonth(next: string) {
    setMonth(next);
    download.reset();
  }

  return (
    <div className="flex flex-col gap-4">
      <MonthSwitcher month={month} onChange={changeMonth} />
      <Card className="flex flex-col gap-4">
        <section aria-label="Pacote do contador" className="flex flex-col gap-3">
          <h2 className="font-display text-base font-semibold">Pacote do contador</h2>
          {!inRange ? (
            <p className="text-sm text-text-muted">
              O pacote vai de {monthLabel(opening).toLowerCase()} (a abertura) até o mês corrente.
            </p>
          ) : loading ? (
            <div className="h-32 motion-safe:animate-pulse rounded-2xl bg-sunken" aria-label="Carregando a prévia" />
          ) : (
            <>
              <p className="text-sm text-text-soft">O que vai no pacote de {monthName(month)}:</p>
              <ul aria-label="O que vai no pacote" className="flex flex-col gap-2">
                <Item ok>
                  {ofMonth.length === 0
                    ? "Nenhuma nota fiscal com competência no mês"
                    : `${plural(ofMonth.length, "nota fiscal", "notas fiscais")}${cancelled > 0 ? ` (${plural(cancelled, "cancelada", "canceladas")}, numa pasta própria)` : ""}`}
                  , e o notas.csv
                </Item>
                <Item ok={missing.length === 0}>
                  {paid.length === 0
                    ? "Nenhuma despesa paga no mês"
                    : `${plural(paid.length, "despesa paga", "despesas pagas")} · ${withReceipt} com comprovante`}
                  , e o despesas.csv
                  {missing.length > 0 && (
                    <span className="mt-1 block text-warning-strong">
                      Sem comprovante: {missing.map((item) => item.name).join(", ")}.{" "}
                      <Link to="../expenses" relative="path" className="inline-flex min-h-11 items-center font-bold underline">
                        Anexar nas despesas
                      </Link>
                    </span>
                  )}
                </Item>
                <Item ok>Impostos da competência, previsto × pago (impostos.csv)</Item>
                <Item ok>{plural(paidWithdrawals, "retirada paga", "retiradas pagas")} no mês (retiradas.csv)</Item>
                <Item ok>Resumo em PDF com a receita, as despesas por categoria, os impostos e as retiradas</Item>
              </ul>
            </>
          )}

          {download.isError && (
            <p role="alert" className="text-sm font-semibold text-danger-strong">
              {rateLimited && wait > 0 ? `Muitos pacotes seguidos. Tente de novo em ${formatWait(wait)}.` : download.error.message}
            </p>
          )}
          <button type="button" disabled={!inRange || download.isPending || (rateLimited && wait > 0)}
            onClick={() => download.mutate(month)}
            className="h-12 w-full rounded-full bg-accent px-5 font-bold text-on-accent shadow-clay-accent transition active:scale-[0.98] disabled:opacity-60 md:w-auto md:self-start">
            <PendingLabel pending={download.isPending} pendingText="Gerando…">Baixar o pacote de {monthName(month)} (ZIP)</PendingLabel>
          </button>
          <p className="text-xs text-text-muted">
            Gerado na hora, com o que está no app. O arquivo vai para os downloads do navegador; nada é enviado a ninguém.
          </p>
        </section>
      </Card>
    </div>
  );
}
