import { useState, type FormEvent } from "react";
import { useCreateWithdrawal, useDeleteWithdrawal, useUpdateWithdrawal, type Withdrawal, type WithdrawalInput } from "./withdrawalsApi";
import type { components } from "../../shared/api/schema";
import { ApiError } from "../../shared/api/problem";
import { BottomSheet } from "../../shared/ui/BottomSheet";
import { MoneyField } from "../../shared/ui/MoneyField";
import { MonthSwitcher } from "../../shared/ui/MonthSwitcher";
import { PendingLabel } from "../../shared/ui/PendingLabel";
import { currentMonth, todayIso } from "../../shared/lib/dates";
import { formatCents, toCents } from "../../shared/lib/money";

type Partner = components["schemas"]["PartnerResponse"];

/** O app calcula INSS e IRRF de 01/2026 em diante; antes, os valores vêm do holerite. */
export const FIRST_CALCULATED = "2026-01";

const money = (value: number) => formatCents(toCents(value));
const field = "h-14 rounded-2xl border border-line bg-sunken px-4 text-base text-text outline-none focus:border-accent [color-scheme:light]";

type Props = { companyId: number; partners: Partner[]; withdrawal?: Withdrawal; readOnly: boolean; onClose: () => void };

/** Registrar, corrigir ou excluir um pró-labore pago. O INSS e o IRRF saem do motor; os avisos, da API. */
export function WithdrawalSheet({ companyId, partners, withdrawal, readOnly, onClose }: Props) {
  const [saved, setSaved] = useState<Withdrawal>();
  const shown = saved ?? withdrawal;
  const title = withdrawal ? "Pró-labore" : "Registrar pró-labore";

  return (
    <BottomSheet title={title} open onClose={onClose}>
      {saved ? (
        <SavedSummary withdrawal={saved} onClose={onClose} />
      ) : (
        <>
          {shown && <Summary withdrawal={shown} />}
          {readOnly ? null : (
            <WithdrawalForm companyId={companyId} partners={partners} withdrawal={withdrawal}
              onSaved={(result) => (result.warnings.length > 0 ? setSaved(result) : onClose())} onDeleted={onClose} />
          )}
        </>
      )}
    </BottomSheet>
  );
}

function Summary({ withdrawal }: { withdrawal: Withdrawal }) {
  return (
    <div className="flex flex-col gap-3 pt-2">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-text-muted">Bruto</dt><dd className="font-semibold tabular-nums">{money(withdrawal.grossAmount)}</dd>
        <dt className="text-text-muted">INSS</dt><dd className="font-semibold tabular-nums">{money(withdrawal.inssAmount)}</dd>
        <dt className="text-text-muted">IRRF</dt><dd className="font-semibold tabular-nums">{money(withdrawal.irrfAmount)}</dd>
        <dt className="text-text-muted">Líquido</dt><dd className="font-semibold tabular-nums">{money(withdrawal.netAmount)}</dd>
      </dl>
      {!withdrawal.calculated && <p className="text-xs text-text-muted">INSS e IRRF informados, como no holerite.</p>}
      {withdrawal.warnings.map((warning) => (
        <p key={warning} role="note" className="rounded-2xl bg-warning-soft p-3 text-sm font-semibold text-warning-strong">{warning}</p>
      ))}
    </div>
  );
}

function SavedSummary({ withdrawal, onClose }: { withdrawal: Withdrawal; onClose: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="pt-2 font-semibold">Pró-labore salvo. Confira os avisos:</p>
      <Summary withdrawal={withdrawal} />
      <button type="button" onClick={onClose} className="h-12 rounded-full bg-accent font-bold text-on-accent shadow-clay-accent">
        Entendi
      </button>
    </div>
  );
}

function WithdrawalForm({ companyId, partners, withdrawal, onSaved, onDeleted }: {
  companyId: number; partners: Partner[]; withdrawal?: Withdrawal; onSaved: (w: Withdrawal) => void; onDeleted: () => void;
}) {
  const create = useCreateWithdrawal(companyId);
  const update = useUpdateWithdrawal(companyId);
  const remove = useDeleteWithdrawal(companyId);
  const me = partners.find((partner) => partner.me) ?? partners[0];
  const [partnerId, setPartnerId] = useState(withdrawal?.partnerId ?? me?.id);
  const [competence, setCompetence] = useState(withdrawal?.competenceMonth ?? currentMonth());
  const [paymentDate, setPaymentDate] = useState(withdrawal?.paymentDate ?? todayIso());
  const [gross, setGross] = useState(withdrawal ? toCents(withdrawal.grossAmount) : 0);
  const [inss, setInss] = useState(withdrawal && !withdrawal.calculated ? toCents(withdrawal.inssAmount) : 0);
  const [irrf, setIrrf] = useState(withdrawal && !withdrawal.calculated ? toCents(withdrawal.irrfAmount) : 0);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const informed = competence < FIRST_CALCULATED;
  const mutation = withdrawal ? update : create;
  const fieldErrors = mutation.error instanceof ApiError ? mutation.error.fieldErrors : {};
  const error = mutation.error ?? remove.error;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const body: WithdrawalInput = {
      partnerId: partnerId!, kind: "PRO_LABORE", competenceMonth: competence, paymentDate, grossAmount: gross / 100,
      inssAmount: informed ? inss / 100 : undefined, irrfAmount: informed ? irrf / 100 : undefined,
    };
    if (withdrawal) update.mutate({ withdrawalId: withdrawal.id, body }, { onSuccess: onSaved });
    else create.mutate(body, { onSuccess: onSaved });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-4">
      {partners.length > 1 && (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-text-muted">Sócio</span>
          <select value={partnerId} onChange={(e) => setPartnerId(Number(e.target.value))} className={field}>
            {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
          </select>
        </label>
      )}
      <div role="group" aria-label="Mês da folha" className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text-muted">Mês da folha</span>
        <MonthSwitcher month={competence} onChange={setCompetence} />
      </div>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text-muted">Pago em</span>
        <input type="date" value={paymentDate} max={todayIso()} onChange={(e) => setPaymentDate(e.target.value)} className={field} />
      </label>
      <MoneyField label="Pró-labore bruto" cents={gross} onChange={setGross} error={fieldErrors.grossAmount}
        hint={informed ? undefined : "O INSS (11%) e o IRRF são calculados pelo app."} />
      {informed && (
        <>
          <p className="text-sm text-text-soft">O app calcula impostos de 01/2026 em diante. Informe o INSS e o IRRF retidos, como estão no holerite.</p>
          <div className="grid grid-cols-2 gap-3">
            <MoneyField label="INSS retido" cents={inss} onChange={setInss} />
            <MoneyField label="IRRF retido" cents={irrf} onChange={setIrrf} />
          </div>
        </>
      )}
      {error && Object.keys(fieldErrors).length === 0 && (
        <p role="alert" className="text-sm font-semibold text-danger-strong">{error.message}</p>
      )}
      <button type="submit" disabled={gross <= 0 || !paymentDate || partnerId === undefined || mutation.isPending}
        className="h-14 rounded-full bg-accent font-bold text-on-accent shadow-clay-accent transition active:scale-95 disabled:opacity-60">
        <PendingLabel pending={mutation.isPending} pendingText="Salvando…">{withdrawal ? "Salvar" : "Registrar pró-labore"}</PendingLabel>
      </button>
      {withdrawal && (confirmingDelete ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-text-soft">Excluir este pró-labore?</span>
          <button type="button" disabled={remove.isPending} onClick={() => remove.mutate(withdrawal.id, { onSuccess: onDeleted })}
            className="flex min-h-11 items-center px-2 text-sm font-bold text-danger-strong disabled:opacity-60">
            <PendingLabel pending={remove.isPending} pendingText="Excluindo…">Excluir</PendingLabel>
          </button>
          <button type="button" onClick={() => setConfirmingDelete(false)} className="flex min-h-11 items-center px-2 text-sm font-bold text-text-muted">
            Cancelar
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirmingDelete(true)} className="flex min-h-11 items-center self-start text-sm font-bold text-danger-strong">
          Excluir pró-labore
        </button>
      ))}
    </form>
  );
}
