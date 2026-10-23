import { useState, type FormEvent } from "react";
import type { GoalInput } from "./goalsApi";
import { ApiError } from "../../shared/api/problem";
import { AmountInput } from "../../shared/ui/AmountInput";
import { TextField } from "../../shared/ui/TextField";
import { firstDayOfNextMonth } from "../../shared/lib/dates";

type Props = {
  initial?: { name: string; cents: number; deadline: string };
  submitLabel: string;
  pending: boolean;
  error: Error | null;
  onSubmit: (input: GoalInput) => void;
  onCancel: () => void;
};

export function GoalForm({ initial, submitLabel, pending, error, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [cents, setCents] = useState(initial?.cents ?? 0);
  const [deadline, setDeadline] = useState(initial?.deadline ?? "");
  const minDeadline = firstDayOfNextMonth();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit({ name: name.trim(), targetAmount: cents / 100, deadline });
  }

  const errorMessage =
    error instanceof ApiError && error.status === 422
      ? "O prazo precisa ser a partir do mês que vem."
      : error?.message;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-2xl bg-ink-800 p-4">
      <TextField
        label="Nome da meta"
        required
        maxLength={100}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ex.: Viagem ao Japão"
      />
      <AmountInput label="Quanto você quer juntar" cents={cents} onChange={setCents} />
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text-muted">Até quando</span>
        <input
          type="date"
          required
          min={minDeadline}
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="h-14 rounded-2xl border border-line bg-ink-900 px-4 text-base text-text outline-none focus:border-signal [color-scheme:dark]"
        />
      </label>

      {errorMessage && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {errorMessage}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!name.trim() || cents <= 0 || !deadline || pending}
          className="h-12 flex-1 rounded-full bg-signal font-bold text-ink-900 transition active:scale-95 disabled:opacity-60"
        >
          {pending ? "Salvando..." : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-12 flex-1 rounded-full bg-surface font-bold text-text transition active:scale-95"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}