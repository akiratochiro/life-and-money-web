import { useId, useState, type FormEvent } from "react";
import type { ExpenseCategory, OneOffExpense } from "./companyExpensesApi";
import { CategoryChips } from "./CategoryChips";
import { ApiError } from "../../shared/api/problem";
import { AmountInput } from "../../shared/ui/AmountInput";
import { TextField } from "../../shared/ui/TextField";
import { PendingLabel } from "../../shared/ui/PendingLabel";
import { todayIso } from "../../shared/lib/dates";
import { toCents } from "../../shared/lib/money";

type Props = {
  categories: ExpenseCategory[];
  initial?: OneOffExpense;
  /** O comprovante só é pedido ao criar: depois, ele é trocado no detalhe. */
  withReceipt: boolean;
  pending: boolean;
  error: Error | null;
  submitLabel: string;
  onSubmit: (expense: OneOffExpense, receipt: File | null) => void;
};

/** Uma despesa avulsa: algo que já foi pago, então a data não passa de hoje. */
export function OneOffForm({ categories, initial, withReceipt, pending, error, submitLabel, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [cents, setCents] = useState(initial ? toCents(initial.amount) : 0);
  const [categoryId, setCategoryId] = useState<number | null>(initial?.categoryId ?? null);
  const [date, setDate] = useState(initial?.date ?? todayIso());
  const [receipt, setReceipt] = useState<File | null>(null);
  const fieldErrors = error instanceof ApiError ? error.fieldErrors : {};
  const receiptHintId = useId();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit({ name: name.trim(), amount: cents / 100, categoryId: categoryId!, date }, receipt);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-2">
      <AmountInput label="Valor" cents={cents} onChange={setCents} />
      <TextField label="Nome" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)}
        placeholder="Ex.: Notebook" error={fieldErrors.name} />
      <CategoryChips categories={categories} value={categoryId} onChange={setCategoryId} error={fieldErrors.categoryId} />
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text-muted">Pago em</span>
        <input type="date" required value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)}
          className="h-14 rounded-2xl border border-line bg-sunken px-4 text-base text-text outline-none focus:border-accent [color-scheme:light]" />
      </label>
      {withReceipt && (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-text-muted">Comprovante (opcional)</span>
            <input type="file" accept="application/pdf,image/jpeg,image/png" aria-describedby={receiptHintId}
              onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
              className="min-h-11 text-sm text-text-soft file:mr-3 file:h-11 file:rounded-full file:border-0 file:bg-sunken file:px-4 file:font-bold file:text-text" />
          </label>
          <span id={receiptHintId} className="text-sm text-text-muted">PDF, JPEG ou PNG, até 2 MB.</span>
        </div>
      )}
      {error && Object.keys(fieldErrors).length === 0 && (
        <p role="alert" className="text-sm font-semibold text-danger-strong">{error.message}</p>
      )}
      <button type="submit" disabled={!name.trim() || cents <= 0 || categoryId === null || !date || pending}
        className="h-14 rounded-full bg-accent font-bold text-on-accent shadow-clay-accent transition active:scale-95 disabled:opacity-60">
        <PendingLabel pending={pending} pendingText="Salvando…">{submitLabel}</PendingLabel>
      </button>
    </form>
  );
}
