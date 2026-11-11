import { useState, type FormEvent } from "react";
import {
  useCreateObligation,
  useDeleteObligation,
  useObligations,
  useUpdateObligation,
  type Obligation,
  type ObligationInput,
} from "./taxesApi";
import { appliesTo, monthName, RECURRENCES, RULES, scheduleOf } from "./obligationText";
import { ApiError } from "../../shared/api/problem";
import { BottomSheet } from "../../shared/ui/BottomSheet";
import { MoneyField } from "../../shared/ui/MoneyField";
import { MonthSwitcher } from "../../shared/ui/MonthSwitcher";
import { PendingLabel } from "../../shared/ui/PendingLabel";
import { TextField } from "../../shared/ui/TextField";
import { LockIcon } from "../../shared/ui/icons";
import { currentMonth } from "../../shared/lib/dates";
import { toCents } from "../../shared/lib/money";

type Props = {
  companyId: number;
  taxRegime?: "SIMEI" | "SIMPLES_NACIONAL" | "LUCRO_PRESUMIDO" | "LUCRO_REAL";
  readOnly: boolean;
  onClose: () => void;
};

const select = "h-14 rounded-2xl border border-line bg-surface px-4 text-base text-text outline-none focus:border-accent [color-scheme:light]";

/**
 * As obrigações da empresa. As do sistema têm cadeado: só ativam e desativam. As personalizadas
 * (uma taxa municipal, um imposto do Lucro Presumido) são criadas, editadas e excluídas aqui.
 */
export function ObligationsSheet({ companyId, taxRegime, readOnly, onClose }: Props) {
  const obligations = useObligations(companyId);
  const toggle = useUpdateObligation(companyId);
  const [editing, setEditing] = useState<number | "new" | null>(null);

  return (
    <BottomSheet title="Obrigações" open onClose={onClose}>
      <div className="flex flex-col gap-2 pt-2">
        {(obligations.data ?? []).map((obligation) =>
          editing === obligation.id ? (
            <ObligationForm key={obligation.id} companyId={companyId} obligation={obligation} onDone={() => setEditing(null)} />
          ) : (
            <div key={obligation.id} className="flex min-h-14 items-center gap-3 border-b border-line py-1 last:border-b-0">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={`font-semibold ${obligation.active ? "" : "text-text-muted line-through"}`}>{obligation.name}</span>
                <span className="text-xs text-text-muted">
                  {scheduleOf(obligation)}
                  {obligation.system && !appliesTo(obligation, taxRegime) && " · não se aplica ao regime atual"}
                </span>
              </span>
              {obligation.system && <LockIcon aria-label="Obrigação do sistema" className="shrink-0 text-text-muted" />}
              {!readOnly && !obligation.system && (
                <button type="button" onClick={() => setEditing(obligation.id)} aria-label={`Editar ${obligation.name}`}
                  className="flex min-h-11 items-center px-2 text-sm font-bold text-link">
                  Editar
                </button>
              )}
              <label className="flex min-h-11 shrink-0 items-center gap-2 text-sm font-semibold text-text-soft">
                <input type="checkbox" checked={obligation.active} disabled={readOnly || toggle.isPending}
                  aria-label={`${obligation.name} ativa`}
                  onChange={(e) => toggle.mutate({ obligationId: obligation.id, active: e.target.checked })}
                  className="h-5 w-5 accent-accent" />
                Ativa
              </label>
            </div>
          ),
        )}
        {toggle.error && <p role="alert" className="text-sm font-semibold text-danger-strong">{toggle.error.message}</p>}
        {!readOnly && (editing === "new" ? (
          <ObligationForm companyId={companyId} onDone={() => setEditing(null)} />
        ) : (
          <button type="button" onClick={() => setEditing("new")} className="flex min-h-11 items-center self-start text-sm font-bold text-link">
            Nova obrigação
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}

function ObligationForm({ companyId, obligation, onDone }: { companyId: number; obligation?: Obligation; onDone: () => void }) {
  const create = useCreateObligation(companyId);
  const update = useUpdateObligation(companyId);
  const remove = useDeleteObligation(companyId);
  const [name, setName] = useState(obligation?.name ?? "");
  const [recurrence, setRecurrence] = useState<ObligationInput["recurrence"]>(obligation?.recurrence ?? "MONTHLY");
  const [dueDay, setDueDay] = useState(obligation?.dueDay ?? 10);
  const [dueMonth, setDueMonth] = useState(obligation?.dueMonth ?? 1);
  const [dueRule, setDueRule] = useState<ObligationInput["dueRule"]>(obligation?.dueRule ?? "POSTPONE");
  const [cents, setCents] = useState(obligation?.fixedAmount !== undefined ? toCents(obligation.fixedAmount) : 0);
  const [startMonth, setStartMonth] = useState(obligation?.startMonth ?? currentMonth());
  const [hasEnd, setHasEnd] = useState(Boolean(obligation?.endMonth) && obligation?.recurrence !== "ONCE");
  const [endMonth, setEndMonth] = useState(obligation?.endMonth ?? currentMonth());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const mutation = obligation ? update : create;
  const fieldErrors = mutation.error instanceof ApiError ? mutation.error.fieldErrors : {};
  const error = mutation.error ?? remove.error;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const body: ObligationInput = {
      name: name.trim(),
      recurrence,
      dueDay,
      dueMonth: recurrence === "YEARLY" ? dueMonth : undefined,
      dueRule,
      fixedAmount: cents > 0 ? cents / 100 : undefined,
      startMonth,
      endMonth: recurrence !== "ONCE" && hasEnd ? endMonth : undefined,
    };
    if (obligation) update.mutate({ obligationId: obligation.id, changes: body }, { onSuccess: onDone });
    else create.mutate(body, { onSuccess: onDone });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl bg-sunken p-4">
      <TextField label="Nome da obrigação" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)}
        placeholder="Ex.: Taxa de licença de funcionamento" error={fieldErrors.name} />
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text-muted">Recorrência</span>
        <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as ObligationInput["recurrence"])} className={select}>
          {Object.entries(RECURRENCES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-text-muted">Dia do vencimento</span>
          <select value={dueDay} onChange={(e) => setDueDay(Number(e.target.value))} className={select}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => <option key={day} value={day}>Dia {day}</option>)}
          </select>
        </label>
        {recurrence === "YEARLY" && (
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-text-muted">Mês</span>
            <select value={dueMonth} onChange={(e) => setDueMonth(Number(e.target.value))} className={select}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
            </select>
          </label>
        )}
      </div>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text-muted">Em dia sem expediente bancário</span>
        <select value={dueRule} onChange={(e) => setDueRule(e.target.value as ObligationInput["dueRule"])} className={select}>
          {Object.entries(RULES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <MoneyField label="Valor fixo (opcional)" cents={cents} onChange={setCents}
        hint="Sem valor fixo, você informa o valor na hora de pagar." />
      <div role="group" aria-label={recurrence === "ONCE" ? "Mês do vencimento" : "Primeiro mês"} className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text-muted">{recurrence === "ONCE" ? "Mês do vencimento" : "A partir de"}</span>
        <MonthSwitcher month={startMonth} onChange={setStartMonth} />
      </div>
      {recurrence !== "ONCE" && (
        <div className="flex flex-col gap-3">
          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-text-soft">
            <input type="checkbox" checked={hasEnd} onChange={(e) => setHasEnd(e.target.checked)} className="h-5 w-5 accent-accent" />
            Tem um último mês
          </label>
          {hasEnd && <div role="group" aria-label="Último mês"><MonthSwitcher month={endMonth} onChange={setEndMonth} /></div>}
        </div>
      )}
      {error && Object.keys(fieldErrors).length === 0 && (
        <p role="alert" className="text-sm font-semibold text-danger-strong">{error.message}</p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={!name.trim() || mutation.isPending}
          className="h-12 flex-1 rounded-full bg-accent font-bold text-on-accent shadow-clay-accent disabled:opacity-60">
          <PendingLabel pending={mutation.isPending} pendingText="Salvando…">{obligation ? "Salvar" : "Criar obrigação"}</PendingLabel>
        </button>
        <button type="button" onClick={onDone} className="h-12 flex-1 rounded-full bg-surface font-bold">Cancelar</button>
      </div>
      {obligation && (confirmingDelete ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-text-soft">Excluir a obrigação?</span>
          <button type="button" disabled={remove.isPending} onClick={() => remove.mutate(obligation.id, { onSuccess: onDone })}
            className="flex min-h-11 items-center px-2 text-sm font-bold text-danger-strong disabled:opacity-60">
            <PendingLabel pending={remove.isPending} pendingText="Excluindo…">Excluir</PendingLabel>
          </button>
          <button type="button" onClick={() => setConfirmingDelete(false)} className="flex min-h-11 items-center px-2 text-sm font-bold text-text-muted">
            Cancelar
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirmingDelete(true)}
          className="flex min-h-11 items-center self-start text-sm font-bold text-danger-strong">
          Excluir obrigação
        </button>
      ))}
    </form>
  );
}
