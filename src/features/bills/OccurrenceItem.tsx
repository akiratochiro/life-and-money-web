import { useState, type FormEvent } from "react";
import type { BillOccurrence } from "./billsApi";
import { usePayBill, useUndoBillPayment } from "./billsApi";
import { Marker } from "./BillCalendar";
import { Badge, type BadgeTone } from "../../shared/ui/Badge";
import { Money } from "../../shared/ui/Money";
import { AmountInput } from "../../shared/ui/AmountInput";
import { toCents } from "../../shared/lib/money";
import { formatDate, todayIso } from "../../shared/lib/dates";

const STATUS: Record<BillOccurrence["status"], { label: string; tone: BadgeTone }> = {
  OVERDUE: { label: "Atrasada", tone: "danger" },
  PENDING: { label: "Pendente", tone: "warning" },
  PAID: { label: "Paga", tone: "income" },
};

type Props = { occurrence: BillOccurrence; onEdit: (billId: number) => void };

export function OccurrenceItem({ occurrence, onEdit }: Props) {
  const [paying, setPaying] = useState(false);
  const undo = useUndoBillPayment();
  const receivable = occurrence.type === "INCOME";
  const paid = occurrence.status === "PAID";
  const status = STATUS[occurrence.status];

  return (
    <li className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="mt-1.5 flex h-3 w-3 items-center justify-center" aria-hidden="true">
          <Marker status={occurrence.status} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-bold">{occurrence.name}</span>
            <Badge tone={status.tone}>{paid && receivable ? "Recebida" : status.label}</Badge>
          </div>
          <p className="text-sm text-text-soft">
            {receivable ? "A receber" : "A pagar"} · vence {formatDate(occurrence.dueDate)}
          </p>
          <p className="text-sm text-text-soft">
            {paid ? (
              <>
                {receivable ? "Recebido" : "Pago"} <Money value={occurrence.paidAmount ?? 0} className="font-bold text-text" />
                {occurrence.paidOn && <> em {formatDate(occurrence.paidOn)}</>}
                {occurrence.paidAmount !== occurrence.expectedAmount && (
                  <> · previsto <Money value={occurrence.expectedAmount} /></>
                )}
              </>
            ) : (
              <>
                Previsto <Money value={occurrence.expectedAmount} className="font-bold text-text" />
              </>
            )}
          </p>
        </div>
      </div>

      {paying ? (
        <PayPanel occurrence={occurrence} onDone={() => setPaying(false)} />
      ) : (
        <div className="flex flex-wrap gap-2">
          {paid ? (
            <button
              type="button"
              disabled={undo.isPending}
              onClick={() => undo.mutate({ billId: occurrence.billId, month: occurrence.month })}
              className="h-11 rounded-full bg-ink-800 px-4 text-sm font-bold text-text transition active:scale-95 disabled:opacity-60"
            >
              {undo.isPending ? "Desfazendo..." : "Desfazer"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setPaying(true)}
              className="h-11 rounded-full bg-signal px-4 text-sm font-bold text-ink-900 transition active:scale-95"
            >
              {receivable ? "Marcar como recebida" : "Marcar como paga"}
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(occurrence.billId)}
            className="h-11 rounded-full px-4 text-sm font-bold text-text-muted transition hover:text-text active:scale-95"
          >
            Editar conta
          </button>
        </div>
      )}
      {undo.error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {undo.error.message}
        </p>
      )}
    </li>
  );
}

/** O valor começa no previsto, em centavos: a conta de luz quase nunca bate, e é só ajustar. */
function PayPanel({ occurrence, onDone }: { occurrence: BillOccurrence; onDone: () => void }) {
  const pay = usePayBill();
  const [cents, setCents] = useState(toCents(occurrence.expectedAmount));
  const [paidOn, setPaidOn] = useState(todayIso());
  const receivable = occurrence.type === "INCOME";

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    pay.mutate(
      { billId: occurrence.billId, month: occurrence.month, body: { amount: cents / 100, paidOn } },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl bg-ink-800 p-4">
      <AmountInput label={receivable ? "Valor recebido" : "Valor pago"} cents={cents} onChange={setCents} />
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text-muted">{receivable ? "Recebido em" : "Pago em"}</span>
        <input
          type="date"
          required
          value={paidOn}
          onChange={(e) => setPaidOn(e.target.value)}
          className="h-12 rounded-2xl border border-line bg-ink-900 px-4 text-base text-text outline-none focus:border-signal [color-scheme:dark]"
        />
      </label>
      {pay.error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {pay.error.message}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={cents <= 0 || !paidOn || pay.isPending}
          className="h-12 flex-1 rounded-full bg-signal font-bold text-ink-900 transition active:scale-95 disabled:opacity-60"
        >
          {pay.isPending ? "Salvando..." : "Confirmar"}
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
