import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router";
import { useCategories } from "../categories/categoriesApi";
import type { Bill, BillInput, BillRecurrence, BillUpdate } from "./billsApi";
import { ApiError } from "../../shared/api/problem";
import { AmountInput } from "../../shared/ui/AmountInput";
import { TextField } from "../../shared/ui/TextField";
import { MonthSwitcher } from "../../shared/ui/MonthSwitcher";
import { toCents } from "../../shared/lib/money";
import { currentMonth, todayIso } from "../../shared/lib/dates";

type Kind = "EXPENSE" | "INCOME";

const KINDS: { value: Kind; label: string; dot: string }[] = [
  { value: "EXPENSE", label: "A pagar", dot: "bg-expense" },
  { value: "INCOME", label: "A receber", dot: "bg-income" },
];

const RECURRENCES: { value: BillRecurrence; label: string }[] = [
  { value: "MONTHLY", label: "Todo mês" },
  { value: "ONCE", label: "Uma vez" },
  { value: "YEARLY", label: "Todo ano" },
];

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

function chipClass(selected: boolean) {
  return `flex h-11 items-center gap-2 rounded-full px-4 text-sm font-bold transition active:scale-95 ${
    selected ? "bg-text text-ink-900" : "bg-surface text-text-soft hover:text-text"
  }`;
}

const selectClass =
  "h-14 rounded-2xl border border-line bg-ink-800 px-4 text-base text-text outline-none focus:border-signal [color-scheme:dark]";

type CreateProps = {
  mode: "create";
  pending: boolean;
  error: Error | null;
  onSubmit: (input: BillInput) => void;
  onCancel: () => void;
};

type EditProps = {
  mode: "edit";
  bill: Bill;
  kind: Kind;
  pending: boolean;
  error: Error | null;
  onSubmit: (input: BillUpdate) => void;
  onCancel: () => void;
  footer?: ReactNode;
};

/**
 * Criar e editar dividem o formulário, mas não os campos: a recorrência e o primeiro mês são a
 * identidade da conta e não mudam depois (a API nem os aceita na edição).
 */
export function BillForm(props: CreateProps | EditProps) {
  const editing = props.mode === "edit";
  const bill = editing ? props.bill : undefined;
  const categories = useCategories(true);

  const [kind, setKind] = useState<Kind>(editing ? props.kind : "EXPENSE");
  const [name, setName] = useState(bill?.name ?? "");
  const [categoryId, setCategoryId] = useState<number | null>(bill?.categoryId ?? null);
  const [cents, setCents] = useState(bill ? toCents(bill.amount) : 0);
  const [recurrence, setRecurrence] = useState<BillRecurrence>(bill?.recurrence ?? "MONTHLY");
  const [dueDay, setDueDay] = useState(bill?.dueDay ?? 10);
  const [startMonth, setStartMonth] = useState(bill?.startMonth ?? currentMonth());
  const [dueDate, setDueDate] = useState(todayIso());
  const [hasEnd, setHasEnd] = useState(bill?.endMonth != null);
  const [endMonth, setEndMonth] = useState(bill?.endMonth ?? currentMonth());

  const options = (categories.data ?? []).filter(
    (category) => category.type === kind && (!category.archived || category.id === bill?.categoryId),
  );
  // Única e anual escolhem uma data: o mês e o dia saem dela. Na edição, só o dia muda.
  const pickByDate = !editing && recurrence !== "MONTHLY";
  const canEnd = recurrence !== "ONCE";

  function changeKind(next: Kind) {
    setKind(next);
    setCategoryId(null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (categoryId === null) return;
    const common = { name: name.trim(), categoryId, amount: cents / 100 };
    const end = canEnd && hasEnd ? endMonth : undefined;

    if (props.mode === "edit") {
      props.onSubmit({ ...common, dueDay, endMonth: end });
      return;
    }
    props.onSubmit(
      pickByDate
        ? { ...common, recurrence, startMonth: dueDate.slice(0, 7), dueDay: Number(dueDate.slice(8)), endMonth: end }
        : { ...common, recurrence, startMonth, dueDay, endMonth: end },
    );
  }

  const fieldErrors = props.error instanceof ApiError ? props.error.fieldErrors : {};
  const canSubmit = name.trim() !== "" && categoryId !== null && cents > 0 && (!pickByDate || dueDate !== "") && !props.pending;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 rounded-2xl bg-ink-800 p-4">
      <h2 className="font-display text-base font-semibold">{editing ? "Editar conta" : "Nova conta"}</h2>

      {!editing && (
        <div role="group" aria-label="Tipo de conta" className="grid grid-cols-2 gap-1 rounded-full bg-surface p-1">
          {KINDS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={kind === option.value}
              onClick={() => changeKind(option.value)}
              className={`flex h-11 items-center justify-center gap-2 rounded-full text-sm font-bold transition active:scale-95 ${
                kind === option.value ? "bg-signal text-ink-900" : "text-text-muted"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${option.dot}`} />
              {option.label}
            </button>
          ))}
        </div>
      )}

      <TextField
        label="Nome"
        required
        maxLength={100}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={kind === "EXPENSE" ? "Ex.: Aluguel" : "Ex.: Cliente X"}
        error={fieldErrors.name}
      />

      <AmountInput label="Valor previsto" cents={cents} onChange={setCents} />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-semibold text-text-muted">Categoria</legend>
        {categories.isPending ? (
          <div className="h-11 w-2/3 animate-pulse rounded-full bg-surface" />
        ) : options.length === 0 ? (
          <p className="text-sm text-text-soft">
            Você não tem categorias desse tipo.{" "}
            <Link to="/categories" className="font-bold text-signal">Criar categoria</Link>
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {options.map((category) => (
              <button
                key={category.id}
                type="button"
                aria-pressed={categoryId === category.id}
                onClick={() => setCategoryId(category.id)}
                className={chipClass(categoryId === category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
      </fieldset>

      {!editing && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-sm font-semibold text-text-muted">Repete</legend>
          <div className="flex flex-wrap gap-2">
            {RECURRENCES.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={recurrence === option.value}
                onClick={() => setRecurrence(option.value)}
                className={chipClass(recurrence === option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {pickByDate ? (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-text-muted">
            {recurrence === "YEARLY" ? "Primeiro vencimento" : "Vencimento"}
          </span>
          <input
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={selectClass}
          />
          {recurrence === "YEARLY" && (
            <span className="text-xs text-text-muted">Repete todo ano no mesmo dia e mês.</span>
          )}
        </label>
      ) : (
        <>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-text-muted">Dia do vencimento</span>
            <select value={dueDay} onChange={(e) => setDueDay(Number(e.target.value))} className={selectClass}>
              {DAYS.map((day) => (
                <option key={day} value={day}>
                  Dia {day}
                </option>
              ))}
            </select>
            {dueDay > 28 && (
              <span className="text-xs text-text-muted">Nos meses sem esse dia, vence no último dia do mês.</span>
            )}
            {fieldErrors.dueDay && <span className="text-sm font-semibold text-danger">{fieldErrors.dueDay}</span>}
          </label>
          {!editing && (
            <div role="group" aria-label="Primeiro mês" className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-text-muted">A partir de</span>
              <MonthSwitcher month={startMonth} onChange={setStartMonth} />
            </div>
          )}
        </>
      )}

      {canEnd && (
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 text-sm font-semibold text-text-soft">
            <input
              type="checkbox"
              checked={hasEnd}
              onChange={(e) => setHasEnd(e.target.checked)}
              className="h-5 w-5 accent-signal"
            />
            Tem um último mês
          </label>
          {hasEnd && (
            <div role="group" aria-label="Último mês">
              <MonthSwitcher month={endMonth} onChange={setEndMonth} />
            </div>
          )}
          {fieldErrors.periodValid && (
            <span className="text-sm font-semibold text-danger">{fieldErrors.periodValid}</span>
          )}
        </div>
      )}

      {editing && (
        <p className="text-xs leading-snug text-text-muted">
          As mudanças valem a partir deste mês. Os meses anteriores continuam com o valor da época.
        </p>
      )}

      {props.error && Object.keys(fieldErrors).length === 0 && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {props.error.message}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="h-12 flex-1 rounded-full bg-signal font-bold text-ink-900 transition active:scale-95 disabled:opacity-60"
        >
          {props.pending ? "Salvando..." : editing ? "Salvar" : "Criar conta"}
        </button>
        <button
          type="button"
          onClick={props.onCancel}
          className="h-12 flex-1 rounded-full bg-surface font-bold text-text transition active:scale-95"
        >
          Cancelar
        </button>
      </div>

      {editing && props.footer}
    </form>
  );
}
