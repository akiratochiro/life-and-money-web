import { useState } from "react";
import { usePayTax, useUnpayTax, type TaxOccurrence } from "./taxesApi";
import { CalculationMemory } from "./CalculationMemory";
import { competenceLabel } from "./taxFormat";
import { BottomSheet } from "../../shared/ui/BottomSheet";
import { MoneyField } from "../../shared/ui/MoneyField";
import { PendingLabel } from "../../shared/ui/PendingLabel";
import { formatDate, todayIso } from "../../shared/lib/dates";
import { formatCents, toCents } from "../../shared/lib/money";

type Props = { companyId: number; occurrence: TaxOccurrence; readOnly: boolean; onClose: () => void };

const money = (value: number) => formatCents(toCents(value));

/** Um vencimento: o previsto com a memória de cálculo, e pagar (ou marcar a entrega) ou desfazer. */
export function TaxDetailSheet({ companyId, occurrence, readOnly, onClose }: Props) {
  const payment = occurrence.payment;
  return (
    <BottomSheet title={occurrence.name} open onClose={onClose}>
      <div className="flex flex-col gap-4 pt-2">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-text-muted">Competência</dt>
          <dd className="font-semibold">{competenceLabel(occurrence)}</dd>
          <dt className="text-text-muted">Vencimento</dt>
          <dd className="font-semibold">{formatDate(occurrence.dueDate)}</dd>
          {!occurrence.declaration && (
            <>
              <dt className="text-text-muted">Previsto</dt>
              <dd className="font-semibold tabular-nums">
                {occurrence.expectedAmount !== undefined ? money(occurrence.expectedAmount) : "—"}
              </dd>
            </>
          )}
          {payment?.paidAmount !== undefined && (
            <>
              <dt className="text-text-muted">Pago</dt>
              <dd className="font-semibold tabular-nums">{money(payment.paidAmount)} em {formatDate(payment.paidDate!)}</dd>
            </>
          )}
          {payment?.expectedAtPayment !== undefined && payment.difference !== undefined && payment.difference !== 0 && (
            <>
              <dt className="text-text-muted">Diferença</dt>
              <dd className="font-semibold tabular-nums">
                {payment.difference > 0 ? "+" : "−"}
                {money(Math.abs(payment.difference))}{" "}
                <span className="font-normal text-text-muted">sobre o previsto de {money(payment.expectedAtPayment)} no dia do pagamento</span>
              </dd>
            </>
          )}
          {payment?.deliveredOn && (
            <>
              <dt className="text-text-muted">Entregue em</dt>
              <dd className="font-semibold">{formatDate(payment.deliveredOn)}</dd>
            </>
          )}
        </dl>

        {occurrence.note && <p className="text-sm text-text-soft">{occurrence.note}</p>}
        {occurrence.calculation && <CalculationMemory calculation={occurrence.calculation} />}

        {!readOnly && (payment
          ? <UndoPayment companyId={companyId} occurrence={occurrence} onDone={onClose} />
          : <PayForm companyId={companyId} occurrence={occurrence} onDone={onClose} />)}
      </div>
    </BottomSheet>
  );
}

function PayForm({ companyId, occurrence, onDone }: { companyId: number; occurrence: TaxOccurrence; onDone: () => void }) {
  const pay = usePayTax(companyId);
  const today = todayIso();
  // O caso comum é pagar o previsto: o valor já vem preenchido (decisão da 4C).
  const [cents, setCents] = useState(occurrence.expectedAmount !== undefined ? toCents(occurrence.expectedAmount) : 0);
  const [date, setDate] = useState(occurrence.dueDate <= today ? occurrence.dueDate : today);
  const declaration = occurrence.declaration;
  const ref = { obligationId: occurrence.obligationId, competence: occurrence.competence };

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-sunken p-3">
      {!declaration && (
        <MoneyField label="Valor pago" cents={cents} onChange={setCents}
          hint="Vira uma despesa na categoria Impostos." />
      )}
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text-muted">{declaration ? "Entregue em" : "Pago em"}</span>
        <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)}
          className="h-14 rounded-2xl border border-line bg-surface px-4 text-base text-text outline-none focus:border-accent [color-scheme:light]" />
      </label>
      {pay.error && <p role="alert" className="text-sm font-semibold text-danger-strong">{pay.error.message}</p>}
      <button type="button" disabled={(!declaration && cents <= 0) || !date || pay.isPending}
        onClick={() => pay.mutate({ ...ref, body: declaration ? { date } : { amount: cents / 100, date } }, { onSuccess: onDone })}
        className="h-12 rounded-full bg-accent font-bold text-on-accent shadow-clay-accent disabled:opacity-60">
        <PendingLabel pending={pay.isPending} pendingText="Salvando…">
          {declaration ? "Marcar como entregue" : "Marcar como pago"}
        </PendingLabel>
      </button>
    </div>
  );
}

function UndoPayment({ companyId, occurrence, onDone }: { companyId: number; occurrence: TaxOccurrence; onDone: () => void }) {
  const unpay = useUnpayTax(companyId);
  const [confirming, setConfirming] = useState(false);
  const label = occurrence.declaration ? "Desfazer entrega" : "Desfazer pagamento";
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="flex min-h-11 items-center self-start text-sm font-bold text-text-soft">
        {label}
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-sunken p-3">
      <p className="text-sm text-text-soft">
        {occurrence.declaration
          ? "Desfazer a entrega? A declaração volta a pendente."
          : "Desfazer o pagamento? O vencimento volta a pendente, e a despesa de Impostos é apagada junto."}
      </p>
      <div className="flex gap-2">
        <button type="button" disabled={unpay.isPending}
          onClick={() => unpay.mutate({ obligationId: occurrence.obligationId, competence: occurrence.competence }, { onSuccess: onDone })}
          className="flex min-h-11 items-center rounded-full px-4 text-sm font-bold text-danger-strong disabled:opacity-60">
          <PendingLabel pending={unpay.isPending} pendingText="Salvando…">Desfazer</PendingLabel>
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="flex min-h-11 items-center rounded-full px-4 text-sm font-bold text-text-muted">
          Cancelar
        </button>
      </div>
      {unpay.error && <p role="alert" className="text-sm font-semibold text-danger-strong">{unpay.error.message}</p>}
    </div>
  );
}
