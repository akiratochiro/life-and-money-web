import { useState } from "react";
import { Link } from "react-router";
import { useCategories, type Category, type CategoryType } from "../categories/categoriesApi";
import { useTransactions, type Transaction } from "./transactionsApi";
import { EditTransactionDialog } from "./EditTransactionDialog";
import { MonthSwitcher } from "../../shared/ui/MonthSwitcher";
import { Money } from "../../shared/ui/Money";
import { currentMonth, dayLabel, monthLabel } from "../../shared/lib/dates";
import { toCents } from "../../shared/lib/money";

const TYPE_STYLE: Record<CategoryType, { tile: string; amount: string; sign: string }> = {
  INCOME: { tile: "bg-income/15 text-income", amount: "text-income", sign: "+ " },
  EXPENSE: { tile: "bg-expense/15 text-expense", amount: "text-text", sign: "− " },
  SAVING: { tile: "bg-saving/15 text-saving-soft", amount: "text-saving-soft", sign: "" },
};

function groupByDate(transactions: Transaction[]) {
  const groups: { date: string; items: Transaction[] }[] = [];
  for (const transaction of transactions) {
    const date = transaction.transactionDate ?? "";
    const last = groups.at(-1);
    if (last && last.date === date) {
      last.items.push(transaction);
    } else {
      groups.push({ date, items: [transaction] });
    }
  }
  return groups;
}

export function TransactionsPage() {
  const [month, setMonth] = useState(currentMonth());
  const [editing, setEditing] = useState<Transaction | null>(null);
  const transactions = useTransactions(month);
  const categories = useCategories(true);

  const categoryById = new Map<number | undefined, Category>(
    (categories.data ?? []).map((category) => [category.id, category]),
  );
  const list = transactions.data ?? [];

  const totals: Record<CategoryType, number> = { INCOME: 0, EXPENSE: 0, SAVING: 0 };
  for (const transaction of list) {
    const type = categoryById.get(transaction.categoryId)?.type;
    if (type) {
      totals[type] += toCents(transaction.amount ?? 0);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Extrato</h1>

      <MonthSwitcher month={month} onChange={setMonth} />

      <dl className="grid grid-cols-3 gap-2 rounded-card bg-surface p-5">
        <Total label="Entrou" cents={totals.INCOME} className="text-income" />
        <Total label="Saiu" cents={totals.EXPENSE} className="text-expense" />
        <Total label="Guardou" cents={totals.SAVING} className="text-saving-soft" />
      </dl>

      {transactions.isPending || categories.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Carregando">
          <div className="h-16 animate-pulse rounded-2xl bg-surface" />
          <div className="h-16 animate-pulse rounded-2xl bg-surface" />
          <div className="h-16 animate-pulse rounded-2xl bg-surface" />
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-line p-5">
          <p className="text-sm text-text-soft">Nenhuma transação em {monthLabel(month).toLowerCase()}.</p>
          <Link to="/transactions/new" className="text-sm font-bold text-signal">
            Lançar uma transação
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {groupByDate(list).map((group) => (
            <section key={group.date} className="flex flex-col gap-1">
              <h2 className="px-3 pb-1 text-xs font-bold uppercase tracking-wide text-text-muted">
                {dayLabel(group.date)}
              </h2>
              {group.items.map((transaction) => {
                const category = categoryById.get(transaction.categoryId);
                const style = TYPE_STYLE[category?.type ?? "EXPENSE"];
                return (
                  <button
                    key={transaction.id}
                    type="button"
                    onClick={() => setEditing(transaction)}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-surface active:scale-[0.99]"
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-display text-sm font-semibold ${style.tile}`}>
                      {category?.name?.charAt(0) ?? "?"}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-bold">{category?.name ?? "Categoria"}</span>
                      {transaction.description && (
                        <span className="truncate text-sm text-text-muted">{transaction.description}</span>
                      )}
                    </span>
                    <span className={`shrink-0 font-bold ${style.amount}`}>
                      {style.sign}
                      <Money value={transaction.amount ?? 0} />
                    </span>
                  </button>
                );
              })}
            </section>
          ))}
        </div>
      )}

      {editing && (
        <EditTransactionDialog
          key={editing.id}
          transaction={editing}
          category={categoryById.get(editing.categoryId)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Total({ label, cents, className }: { label: string; cents: number; className: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-semibold text-text-muted">{label}</dt>
      <dd className={`m-0 text-[15px] font-bold ${className}`}>
        <Money value={cents / 100} />
      </dd>
    </div>
  );
}