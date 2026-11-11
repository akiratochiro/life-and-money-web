import { useState } from "react";
import { useTaxMonth, type TaxOccurrence } from "./taxesApi";
import { TaxDetailSheet } from "./TaxDetailSheet";
import { competenceLabel } from "./taxFormat";
import { useCompanyContext } from "../company/companyContext";
import { Badge } from "../../shared/ui/Badge";
import { EmptyState } from "../../shared/ui/EmptyState";
import { MonthSwitcher } from "../../shared/ui/MonthSwitcher";
import { currentMonth, formatDate } from "../../shared/lib/dates";
import { formatCents, toCents } from "../../shared/lib/money";

/** O status por texto além da cor; a declaração é "Entregue", não "Pago". */
function status(occurrence: TaxOccurrence) {
  if (occurrence.status === "PAID") return { tone: "income", label: occurrence.declaration ? "Entregue" : "Pago" } as const;
  if (occurrence.status === "OVERDUE") return { tone: "danger", label: "Atrasado" } as const;
  return { tone: "warning", label: "Pendente" } as const;
}

function amountOf(occurrence: TaxOccurrence): string {
  const value = occurrence.payment?.paidAmount ?? occurrence.expectedAmount;
  if (value !== undefined) return formatCents(toCents(value));
  return occurrence.declaration ? "Declaração" : "—";
}

/** A aba Impostos: o que vence no mês, com o previsto, e o que já foi pago. */
export function TaxesPage() {
  const company = useCompanyContext();
  const [month, setMonth] = useState(currentMonth());
  const taxes = useTaxMonth(company.id, month);
  const [open, setOpen] = useState<{ obligationId: number; competence: string }>();
  const items = taxes.data?.items ?? [];
  const keyOf = (item: { obligationId: number; competence: string }) => `${item.obligationId}-${item.competence}`;
  const opened = open && items.find((item) => keyOf(item) === keyOf(open));

  return (
    <div className="flex flex-col gap-5">
      <MonthSwitcher month={month} onChange={setMonth} />

      {taxes.data && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col rounded-card bg-surface p-4 shadow-card">
              <span className="text-sm text-text-muted">A pagar</span>
              <span className="font-display text-xl font-bold tabular-nums">{formatCents(toCents(taxes.data.expectedPending))}</span>
            </div>
            <div className="flex flex-col rounded-card bg-surface p-4 shadow-card">
              <span className="text-sm text-text-muted">Pago</span>
              <span className="font-display text-xl font-bold tabular-nums">{formatCents(toCents(taxes.data.paidTotal))}</span>
            </div>
          </div>
          <p className="text-sm text-text-muted">{taxes.data.notice}</p>
        </>
      )}

      {taxes.isPending ? (
        <div className="h-24 motion-safe:animate-pulse rounded-card bg-sunken" />
      ) : taxes.isError ? (
        <EmptyState>{taxes.error.message}</EmptyState>
      ) : items.length === 0 ? (
        <EmptyState>Nenhum imposto vence neste mês.</EmptyState>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-card bg-surface shadow-card">
          {items.map((item) => {
            const badge = status(item);
            return (
              <li key={keyOf(item)} className="border-b border-line last:border-b-0">
                <button type="button" onClick={() => setOpen(item)}
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition active:bg-sunken">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">{item.name}</span>
                    <span className="text-xs text-text-muted">
                      Competência {competenceLabel(item)} · vence em {formatDate(item.dueDate)}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <span className="font-semibold tabular-nums">{amountOf(item)}</span>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {opened && (
        <TaxDetailSheet key={keyOf(opened)} companyId={company.id} occurrence={opened} readOnly={company.archived}
          onClose={() => setOpen(undefined)} />
      )}
    </div>
  );
}
