import { useState, type FormEvent } from "react";
import type { ExpenseCategory, RecurringExpense, RecurringExpenseInput } from "./companyExpensesApi";
import { CategoryChips } from "./CategoryChips";
import { ApiError } from "../../shared/api/problem";
import { AmountInput } from "../../shared/ui/AmountInput";
import { MonthSwitcher } from "../../shared/ui/MonthSwitcher";
import { TextField } from "../../shared/ui/TextField";
import { PendingLabel } from "../../shared/ui/PendingLabel";
import { currentMonth } from "../../shared/lib/dates";
import { toCents } from "../../shared/lib/money";

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

type Props = {
  categories: ExpenseCategory[];
  /** Na edição, o primeiro mês não muda: ele é a identidade da despesa fixa. */
  initial?: RecurringExpense;
  pending: boolean;
  error: Error | null;
  submitLabel: string;
  onSubmit: (expense: RecurringExpenseInput) => void;
};

/** Uma despesa fixa: o valor previsto, o dia do vencimento e de que mês até que mês. */
export function RecurringForm({ categories, initial, pending, error, submitLabel, onSubmit }: Props) {
  const editing = initial !== undefined;
  const [name, setName] = useState(initial?.name ?? "");
  const [cents, setCents] = useState(initial ? toCents(initial.amount) : 0);
  const [categoryId, setCategoryId] = useState<number | null>(initial?.categoryId ?? null);
  const [dueDay, setDueDay] = useState(initial?.dueDay ?? 5);
  const [startMonth, setStartMonth] = useState(initial?.startMonth ?? currentMonth());
  const [hasEnd, setHasEnd] = useState(Boolean(initial?.endMonth));
  const [endMonth, setEndMonth] = useState(initial?.endMonth ?? currentMonth());
  const fieldErrors = error instanceof ApiError ? error.fieldErrors : {};

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit({
      name: name.trim(),
      amount: cents / 100,
      categoryId: categoryId!,
      dueDay,
      startMonth: editing ? undefined : startMonth,
      endMonth: hasEnd ? endMonth : undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-2">
      <AmountInput label="Valor previsto" cents={cents} onChange={setCents} />
      <TextField label="Nome" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)}
        placeholder="Ex.: Aluguel da sala" error={fieldErrors.name} />
      <CategoryChips categories={categories} value={categoryId} onChange={setCategoryId} error={fieldErrors.categoryId} />
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text-muted">Dia do vencimento</span>
        <select value={dueDay} onChange={(e) => setDueDay(Number(e.target.value))}
          className="h-14 rounded-2xl border border-line bg-sunken px-4 text-base text-text outline-none focus:border-accent [color-scheme:light]">
          {DAYS.map((day) => <option key={day} value={day}>Dia {day}</option>)}
        </select>
        {dueDay > 28 && <span className="text-xs text-text-muted">Nos meses sem esse dia, vence no último dia do mês.</span>}
      </label>
      {!editing && (
        <div role="group" aria-label="Primeiro mês" className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-text-muted">A partir de</span>
          <MonthSwitcher month={startMonth} onChange={setStartMonth} />
        </div>
      )}
      <div className="flex flex-col gap-3">
        <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-text-soft">
          <input type="checkbox" checked={hasEnd} onChange={(e) => setHasEnd(e.target.checked)} className="h-5 w-5 accent-accent" />
          Tem um último mês
        </label>
        {hasEnd && (
          <div role="group" aria-label="Último mês"><MonthSwitcher month={endMonth} onChange={setEndMonth} /></div>
        )}
      </div>
      {editing && (
        <p className="text-xs leading-snug text-text-muted">
          As mudanças valem a partir deste mês. Os meses anteriores continuam com o valor da época.
        </p>
      )}
      {error && Object.keys(fieldErrors).length === 0 && (
        <p role="alert" className="text-sm font-semibold text-danger-strong">{error.message}</p>
      )}
      <button type="submit" disabled={!name.trim() || cents <= 0 || categoryId === null || pending}
        className="h-14 rounded-full bg-accent font-bold text-on-accent shadow-clay-accent transition active:scale-95 disabled:opacity-60">
        <PendingLabel pending={pending} pendingText="Salvando…">{submitLabel}</PendingLabel>
      </button>
    </form>
  );
}
