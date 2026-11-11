import { useState } from "react";
import { expenseMonthQuery, useExpenseCategories, useExpenseMonth, type ExpenseItem } from "./companyExpensesApi";
import { NewExpenseSheet } from "./NewExpenseSheet";
import { ExpenseDetailSheet } from "./ExpenseDetailSheet";
import { useCompanyContext } from "../company/companyContext";
import { CategoryTile } from "../categories/CategoryGlyph";
import { usePrefetchAdjacentMonths } from "../../shared/api/usePrefetchAdjacentMonths";
import { Badge } from "../../shared/ui/Badge";
import { EmptyState } from "../../shared/ui/EmptyState";
import { MonthSwitcher } from "../../shared/ui/MonthSwitcher";
import { currentMonth, formatDate } from "../../shared/lib/dates";
import { formatCents, toCents } from "../../shared/lib/money";

/** O status por texto além da cor: quem não distingue o verde do vermelho lê "Atrasada". */
const STATUS = {
  PAID: { tone: "income", label: "Paga" },
  PENDING: { tone: "warning", label: "Pendente" },
  OVERDUE: { tone: "danger", label: "Atrasada" },
} as const;

/** A aba Despesas: o mês com as avulsas e as fixas, os totais, e o que lançar ou pagar. */
export function ExpensesPage() {
  const company = useCompanyContext();
  const [month, setMonth] = useState(currentMonth());
  const expenses = useExpenseMonth(company.id, month);
  const categories = useExpenseCategories(company.id, true);
  usePrefetchAdjacentMonths(month, (neighbor) => expenseMonthQuery(company.id, neighbor));
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<ExpenseItem>();

  const allCategories = categories.data ?? [];
  const items = expenses.data?.items ?? [];
  const keyOf = (item: ExpenseItem) => `${item.kind}-${item.expenseId ?? ""}-${item.recurringExpenseId ?? ""}`;

  return (
    <div className="flex flex-col gap-5">
      <MonthSwitcher month={month} onChange={setMonth} />

      {expenses.data && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col rounded-card bg-surface p-4 shadow-card">
            <span className="text-sm text-text-muted">Pago</span>
            <span className="font-display text-xl font-bold tabular-nums">{formatCents(toCents(expenses.data.paidTotal))}</span>
          </div>
          <div className="flex flex-col rounded-card bg-surface p-4 shadow-card">
            <span className="text-sm text-text-muted">A pagar</span>
            <span className="font-display text-xl font-bold tabular-nums">{formatCents(toCents(expenses.data.pendingTotal))}</span>
          </div>
        </div>
      )}

      {!company.archived && (
        <button type="button" onClick={() => setCreating(true)}
          className="h-12 self-start rounded-full bg-accent px-6 font-bold text-on-accent shadow-clay-accent transition active:scale-95">
          Nova despesa
        </button>
      )}

      {expenses.isPending ? (
        <div className="h-24 motion-safe:animate-pulse rounded-card bg-sunken" />
      ) : items.length === 0 ? (
        <EmptyState>Nenhuma despesa neste mês.</EmptyState>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-card bg-surface shadow-card">
          {items.map((item) => {
            const category = allCategories.find((c) => c.id === item.categoryId);
            return (
              <li key={keyOf(item)} className="border-b border-line last:border-b-0">
                <button type="button" onClick={() => setOpen(item)}
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition active:bg-sunken">
                  {category && <CategoryTile color={category.color} icon={category.icon} />}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">{item.name}</span>
                    <span className="text-xs text-text-muted">
                      {item.status === "PAID" ? `Pago em ${formatDate(item.date)}` : `Vence em ${formatDate(item.date)}`}
                      {item.kind === "RECURRING" && " · fixa"}
                      {item.hasReceipt && " · com comprovante"}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <span className="font-semibold tabular-nums">{formatCents(toCents(item.amount))}</span>
                    <Badge tone={STATUS[item.status].tone}>{STATUS[item.status].label}</Badge>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {creating && <NewExpenseSheet companyId={company.id} categories={allCategories} onClose={() => setCreating(false)} />}
      {open && (
        <ExpenseDetailSheet key={keyOf(open)} companyId={company.id} month={month}
          item={items.find((item) => keyOf(item) === keyOf(open)) ?? open}
          categories={allCategories} readOnly={company.archived} onClose={() => setOpen(undefined)} />
      )}
    </div>
  );
}
