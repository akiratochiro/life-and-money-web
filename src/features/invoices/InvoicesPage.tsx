import { useState } from "react";
import { useAttachmentUsage, useInvoiceYears, useInvoices, type Invoice } from "./invoicesApi";
import { InvoiceUpload } from "./InvoiceUpload";
import { InvoiceDetailSheet } from "./InvoiceDetailSheet";
import { formatBytes, groupByMonth, revenueCents } from "./invoiceList";
import { useCompanyContext } from "../company/companyContext";
import { Badge } from "../../shared/ui/Badge";
import { EmptyState } from "../../shared/ui/EmptyState";
import { formatDate, monthLabel } from "../../shared/lib/dates";
import { formatCents } from "../../shared/lib/money";

/** A aba Notas fiscais: enviar, filtrar por ano e ver por mês de competência. */
export function InvoicesPage() {
  const company = useCompanyContext();
  const years = useInvoiceYears(company.id);
  const currentYear = new Date().getFullYear();
  const [chosenYear, setChosenYear] = useState<number>();
  const available = [...new Set([currentYear, ...(years.data ?? [])])].sort((a, b) => b - a);
  const year = chosenYear ?? years.data?.[0] ?? currentYear;
  const invoices = useInvoices(company.id, year);
  const usage = useAttachmentUsage();
  const [open, setOpen] = useState<Invoice>();

  const months = groupByMonth(invoices.data ?? []);

  return (
    <div className="flex flex-col gap-6">
      {!company.archived && <InvoiceUpload companyId={company.id} />}

      <div role="group" aria-label="Ano" className="flex flex-wrap gap-2">
        {available.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === year}
            onClick={() => setChosenYear(option)}
            className={`flex h-11 items-center rounded-full px-4 text-sm font-bold transition active:scale-95 ${
              option === year ? "bg-surface text-text shadow-clay-sm" : "text-text-muted"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {invoices.isPending ? (
        <div className="h-24 motion-safe:animate-pulse rounded-card bg-sunken" />
      ) : months.length === 0 ? (
        <EmptyState>Nenhuma nota com competência em {year}.</EmptyState>
      ) : (
        months.map((month) => (
          <section key={month.month} aria-label={monthLabel(month.month)} className="flex flex-col gap-2">
            <header className="flex items-baseline justify-between px-1">
              <h2 className="font-display text-base font-semibold">{monthLabel(month.month)}</h2>
              <span className="text-sm text-text-soft tabular-nums">{formatCents(month.activeRevenueCents)}</span>
            </header>
            <ul className="flex flex-col overflow-hidden rounded-card bg-surface shadow-card">
              {month.invoices.map((invoice) => (
                <li key={invoice.id} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setOpen(invoice)}
                    className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition active:bg-sunken"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={`truncate font-semibold ${invoice.status === "CANCELADA" ? "text-text-muted line-through" : ""}`}>
                        Nº {invoice.number}
                        {invoice.takerName && ` · ${invoice.takerName}`}
                      </span>
                      <span className="text-xs text-text-muted">Competência {formatDate(invoice.competenceDate)}</span>
                    </span>
                    {invoice.status === "CANCELADA" && <Badge tone="warning">Cancelada</Badge>}
                    <span className={`tabular-nums font-semibold ${invoice.status === "CANCELADA" ? "text-text-muted line-through" : ""}`}>
                      {formatCents(revenueCents(invoice))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {usage.data && (
        <p className="px-1 text-xs text-text-muted">
          {formatBytes(usage.data.usedBytes)} de {formatBytes(usage.data.limitBytes)} usados com arquivos.
        </p>
      )}

      {open && (
        <InvoiceDetailSheet
          key={open.id}
          companyId={company.id}
          invoice={(invoices.data ?? []).find((invoice) => invoice.id === open.id) ?? open}
          readOnly={company.archived}
          onClose={() => setOpen(undefined)}
        />
      )}
    </div>
  );
}
