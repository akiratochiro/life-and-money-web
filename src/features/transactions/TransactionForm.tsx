import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router";
import { useCategories, type CategoryType } from "../categories/categoriesApi";
import { useGoals } from "../goals/goalsApi";
import type { TransactionInput } from "./transactionsApi";
import { ApiError } from "../../shared/api/problem";
import { AmountInput } from "../../shared/ui/AmountInput";
import { TextField } from "../../shared/ui/TextField";
import { Button } from "../../shared/ui/Button";
import { todayIso, yesterdayIso } from "../../shared/lib/dates";

export type TransactionFormValues = {
  type: CategoryType;
  cents: number;
  categoryId: number | null;
  date: string;
  description: string;
  goalId: number | null;
};

const TYPES: { value: CategoryType; label: string; dot: string }[] = [
  { value: "EXPENSE", label: "Saiu", dot: "bg-expense" },
  { value: "INCOME", label: "Entrou", dot: "bg-income" },
  { value: "SAVING", label: "Guardou", dot: "bg-saving" },
];

function chipClass(selected: boolean) {
  return `flex h-11 items-center gap-2 rounded-full px-4 text-sm font-bold transition active:scale-95 ${
    selected ? "bg-text text-ink-900" : "bg-surface text-text-soft hover:text-text"
  }`;
}

function errorMessageOf(error: Error | null): string | undefined {
  if (error instanceof ApiError && error.status === 409) return "Essa categoria foi arquivada. Escolha outra.";
  if (error instanceof ApiError && error.status === 422) return "Só lançamentos de poupança podem ir para uma meta.";
  return error?.message;
}

type Props = {
  initial?: Partial<TransactionFormValues>;
  submitLabel: string;
  pending: boolean;
  error: Error | null;
  onSubmit: (input: TransactionInput) => void;
  footer?: ReactNode;
};

export function TransactionForm({ initial, submitLabel, pending, error, onSubmit, footer }: Props) {
  const categories = useCategories(true);
  const goals = useGoals();

  const [type, setType] = useState<CategoryType>(initial?.type ?? "EXPENSE");
  const [cents, setCents] = useState(initial?.cents ?? 0);
  const [categoryId, setCategoryId] = useState<number | null>(initial?.categoryId ?? null);
  const [date, setDate] = useState(initial?.date ?? todayIso());
  const [description, setDescription] = useState(initial?.description ?? "");
  const [goalId, setGoalId] = useState<number | null>(initial?.goalId ?? null);

  const categoryOptions = (categories.data ?? []).filter(
    (category) => category.type === type && (!category.archived || category.id === initial?.categoryId),
  );
  const goalOptions = (goals.data ?? []).filter(
    (goal) => goal.status !== "REACHED" || goal.id === initial?.goalId,
  );
  const today = todayIso();
  const yesterday = yesterdayIso();

  function changeType(next: CategoryType) {
    setType(next);
    setCategoryId(null);
    setGoalId(null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (categoryId === null) {
      return;
    }
    onSubmit({
      categoryId,
      amount: cents / 100,
      transactionDate: date,
      description: description.trim() || undefined,
      goalId: type === "SAVING" ? (goalId ?? undefined) : undefined,
    });
  }

  const errorMessage = errorMessageOf(error);
  const canSubmit = cents > 0 && categoryId !== null && !pending;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-7">
      <div role="group" aria-label="Tipo de transação" className="grid grid-cols-3 gap-1 rounded-full bg-surface p-1">
        {TYPES.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={type === option.value}
            onClick={() => changeType(option.value)}
            className={`flex h-11 items-center justify-center gap-2 rounded-full text-sm font-bold transition active:scale-95 ${
              type === option.value ? "bg-signal text-ink-900" : "text-text-muted"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${option.dot}`} />
            {option.label}
          </button>
        ))}
      </div>

      <AmountInput label="Valor" cents={cents} onChange={setCents} />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-semibold text-text-muted">Categoria</legend>
        {categories.isPending ? (
          <div className="h-11 w-2/3 animate-pulse rounded-full bg-surface" />
        ) : categoryOptions.length === 0 ? (
          <p className="text-sm text-text-soft">
            Você não tem categorias desse tipo.{" "}
            <Link to="/categories" className="font-bold text-signal">Criar categoria</Link>
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((category) => (
              <button
                key={category.id}
                type="button"
                aria-pressed={categoryId === category.id}
                onClick={() => setCategoryId(category.id ?? null)}
                className={chipClass(categoryId === category.id)}
              >
                {category.name}
                {category.archived && <span className="text-xs font-semibold opacity-70">(arquivada)</span>}
              </button>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-semibold text-text-muted">Data</legend>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" aria-pressed={date === today} onClick={() => setDate(today)} className={chipClass(date === today)}>
            Hoje
          </button>
          <button type="button" aria-pressed={date === yesterday} onClick={() => setDate(yesterday)} className={chipClass(date === yesterday)}>
            Ontem
          </button>
          <label className="flex items-center">
            <span className="sr-only">Outra data</span>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 rounded-full border border-line bg-ink-800 px-4 text-sm font-bold text-text outline-none focus:border-signal [color-scheme:dark]"
            />
          </label>
        </div>
      </fieldset>

      <TextField
        label="Descrição (opcional)"
        maxLength={255}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Ex.: compras da semana"
      />

      {type === "SAVING" && goalOptions.length > 0 && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-sm font-semibold text-text-muted">Vai para uma meta?</legend>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={goalId === null} onClick={() => setGoalId(null)} className={chipClass(goalId === null)}>
              Nenhuma
            </button>
            {goalOptions.map((goal) => (
              <button
                key={goal.id}
                type="button"
                aria-pressed={goalId === goal.id}
                onClick={() => setGoalId(goal.id ?? null)}
                className={chipClass(goalId === goal.id)}
              >
                {goal.name}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {errorMessage && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {errorMessage}
        </p>
      )}

      <Button type="submit" disabled={!canSubmit}>
        {pending ? "Salvando..." : submitLabel}
      </Button>

      {footer}
    </form>
  );
}