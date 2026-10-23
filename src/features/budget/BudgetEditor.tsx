import { useState, type FormEvent } from "react";
import { useSetBudget, type BudgetMode } from "./budgetApi";
import { ApiError } from "../../shared/api/problem";
import { AmountInput } from "../../shared/ui/AmountInput";
import { PercentInput } from "../../shared/ui/PercentInput";
import { toCents } from "../../shared/lib/money";

type Props = {
  categoryId: number;
  initialMode?: BudgetMode;
  initialLimit?: number;
  onDone: () => void;
};

const MODES: { value: BudgetMode; label: string; hint: string }[] = [
  { value: "AMOUNT", label: "Valor fixo", hint: "Ideal para gastos que não mudam, como aluguel." },
  { value: "PERCENTAGE", label: "% da receita", hint: "Acompanha o que entrar no mês. Bom para gastos variáveis." },
];

export function BudgetEditor({ categoryId, initialMode, initialLimit, onDone }: Props) {
  const setBudget = useSetBudget();
  const [mode, setMode] = useState<BudgetMode>(initialMode ?? "AMOUNT");
  const [cents, setCents] = useState(initialMode === "AMOUNT" ? toCents(initialLimit ?? 0) : 0);
  const [basisPoints, setBasisPoints] = useState(initialMode === "PERCENTAGE" ? toCents(initialLimit ?? 0) : 0);

  const value = mode === "AMOUNT" ? cents : basisPoints;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBudget.mutate({ categoryId, mode, limitValue: value / 100 }, { onSuccess: onDone });
  }

  const error = setBudget.error;
  const errorMessage =
    error instanceof ApiError && error.status === 409 ? "Essa categoria foi arquivada." : error?.message;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-2xl bg-ink-800 p-4">
      <div role="group" aria-label="Tipo de limite" className="grid grid-cols-2 gap-1 rounded-full bg-ink-900 p-1">
        {MODES.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={mode === option.value}
            onClick={() => setMode(option.value)}
            className={`h-11 rounded-full text-sm font-bold transition active:scale-95 ${
              mode === option.value ? "bg-signal text-ink-900" : "text-text-muted"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {mode === "AMOUNT" ? (
        <AmountInput label="Limite do mês" cents={cents} onChange={setCents} />
      ) : (
        <PercentInput label="Porcentagem da receita" basisPoints={basisPoints} onChange={setBasisPoints} />
      )}

      <p className="text-center text-sm text-text-soft">{MODES.find((option) => option.value === mode)?.hint}</p>
      <p className="text-center text-xs text-text-muted">Vale a partir deste mês. Os meses anteriores não mudam.</p>

      {errorMessage && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {errorMessage}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={value <= 0 || setBudget.isPending}
          className="h-12 flex-1 rounded-full bg-signal font-bold text-ink-900 transition active:scale-95 disabled:opacity-60"
        >
          {setBudget.isPending ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="h-12 flex-1 rounded-full bg-surface font-bold text-text transition active:scale-95"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}