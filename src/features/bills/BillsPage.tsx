import { useState } from "react";
import { useCategories } from "../categories/categoriesApi";
import { BillCalendar } from "./BillCalendar";
import { BillForm } from "./BillForm";
import { OccurrenceItem } from "./OccurrenceItem";
import { holidaysByDate, holidaysQuery, useHolidays } from "./holidaysApi";
import {
  billOccurrencesQuery,
  useBillOccurrences,
  useBills,
  useCreateBill,
  useRemoveBill,
  useUpdateBill,
  type Bill,
  type BillOccurrence,
} from "./billsApi";
import { MonthSwitcher } from "../../shared/ui/MonthSwitcher";
import { Money } from "../../shared/ui/Money";
import { PlusIcon } from "../../shared/ui/icons";
import { currentMonth, formatDate, todayIso } from "../../shared/lib/dates";
import { PendingLabel } from "../../shared/ui/PendingLabel";
import { BillsSkeleton } from "./BillsSkeleton";
import { usePrefetchAdjacentMonths } from "../../shared/api/usePrefetchAdjacentMonths";
import { AnimatePresence } from "motion/react";
import { EmptyState } from "../../shared/ui/EmptyState";

type Editing = { mode: "create" } | { mode: "edit"; billId: number } | null;

export function BillsPage() {
  const [month, setMonth] = useState(currentMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const occurrences = useBillOccurrences(month);
  usePrefetchAdjacentMonths(month, billOccurrencesQuery);
  usePrefetchAdjacentMonths(month, (neighbor) => holidaysQuery(Number(neighbor.slice(0, 4))));
  const holidaysOfYear = useHolidays(Number(month.slice(0, 4)));
  const holidays = holidaysByDate(holidaysOfYear.data?.holidays ?? []);
  const today = todayIso();

  function changeMonth(next: string) {
    setMonth(next);
    setSelectedDay(null);
  }

  const all = occurrences.data ?? [];
  const visible = selectedDay ? all.filter((occurrence) => occurrence.dueDate === selectedDay) : all;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">Contas</h1>
        {editing === null && (
          <button
            type="button"
            onClick={() => setEditing({ mode: "create" })}
            className="flex h-11 items-center gap-2 rounded-full bg-surface px-4 text-sm font-bold text-text transition active:scale-95"
          >
            <PlusIcon width={18} height={18} />
            Nova conta
          </button>
        )}
      </header>

      {editing?.mode === "create" && <CreateBill onClose={() => setEditing(null)} />}
      {editing?.mode === "edit" && <EditBill billId={editing.billId} onClose={() => setEditing(null)} />}

      <MonthSwitcher month={month} onChange={changeMonth} />

      {occurrences.isPending ? (
        <BillsSkeleton />
      ) : occurrences.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-card bg-surface p-5">
          <p className="text-sm text-text-soft">Não foi possível carregar suas contas agora.</p>
          <button type="button" onClick={() => occurrences.refetch()} className="text-sm font-bold text-link">
            Tentar de novo
          </button>
        </div>
      ) : (
        <>
          <BillCalendar
            month={month}
            occurrences={all}
            holidays={holidays}
            today={today}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />
          <HolidayNotice unavailable={holidaysOfYear.isError || holidaysOfYear.data?.available === false} />
          <MonthTotals occurrences={all} />
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold">
                {selectedDay ? `Vence em ${formatDate(selectedDay)}` : "Vencimentos do mês"}
              </h2>
              {selectedDay && (
                <button type="button" onClick={() => setSelectedDay(null)} className="py-3 text-sm font-bold text-link">
                  Ver o mês todo
                </button>
              )}
            </div>
            {selectedDay && holidays.has(selectedDay) && (
              <p className="rounded-2xl bg-saving-soft px-4 py-3 text-sm font-semibold text-saving-strong">
                Feriado nacional: {holidays.get(selectedDay)}
              </p>
            )}
            {visible.length === 0 ? (
              <BillsEmpty filtered={selectedDay !== null} onCreate={() => setEditing({ mode: "create" })} />
            ) : (
              <ul className="flex flex-col gap-3">
                <AnimatePresence initial={false}>
                  {visible.map((occurrence) => (
                    <OccurrenceItem
                      key={`${occurrence.billId}@${occurrence.month}`}
                      occurrence={occurrence}
                      onEdit={(billId) => setEditing({ mode: "edit", billId })}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/**
 * A BrasilAPI só cobre feriados nacionais: quem tem feriado estadual ou municipal precisa saber
 * que ele não aparece aqui, nem adia o prazo.
 */
function HolidayNotice({ unavailable }: { unavailable: boolean }) {
  return (
    <p role={unavailable ? "status" : undefined} className="-mt-3 px-1 text-xs leading-snug text-text-muted">
      {unavailable
        ? "Não foi possível carregar os feriados agora. Os prazos consideram só os fins de semana."
        : "Só feriados nacionais, segundo a BrasilAPI. Feriados estaduais e municipais não aparecem nem adiam o prazo."}
    </p>
  );
}

/** O que falta sair e entrar no mês: só o que ainda não foi pago. */
function MonthTotals({ occurrences }: { occurrences: BillOccurrence[] }) {
  const open = occurrences.filter((occurrence) => occurrence.status !== "PAID");
  const toPay = open.filter((o) => o.type === "EXPENSE").reduce((sum, o) => sum + o.expectedAmount, 0);
  const toReceive = open.filter((o) => o.type === "INCOME").reduce((sum, o) => sum + o.expectedAmount, 0);
  if (occurrences.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-1 rounded-card bg-surface p-4">
        <span className="text-xs font-semibold text-text-muted">Falta pagar</span>
        <Money value={toPay} className="font-display text-lg font-semibold text-expense-strong" />
      </div>
      <div className="flex flex-col gap-1 rounded-card bg-surface p-4">
        <span className="text-xs font-semibold text-text-muted">Falta receber</span>
        <Money value={toReceive} className="font-display text-lg font-semibold text-income-strong" />
      </div>
    </div>
  );
}

function BillsEmpty({ filtered, onCreate }: { filtered: boolean; onCreate: () => void }) {
  if (filtered) {
    return <EmptyState>Nada vence neste dia.</EmptyState>;
  }
  return (
    <EmptyState
      action={
        <button type="button" onClick={onCreate} className="text-sm font-bold text-link">
          Cadastrar minha primeira conta
        </button>
      }
    >
      Cadastre o aluguel, a luz ou um cliente que paga todo mês, e veja aqui o que vence e o que já foi pago.
    </EmptyState>
  );
}

function CreateBill({ onClose }: { onClose: () => void }) {
  const create = useCreateBill();
  return (
    <BillForm
      mode="create"
      pending={create.isPending}
      error={create.error}
      onSubmit={(body) => create.mutate(body, { onSuccess: onClose })}
      onCancel={onClose}
    />
  );
}

function EditBill({ billId, onClose }: { billId: number; onClose: () => void }) {
  const bills = useBills();
  const categories = useCategories(true);
  const bill = bills.data?.find((candidate: Bill) => candidate.id === billId);
  const kind = categories.data?.find((category) => category.id === bill?.categoryId)?.type;

  if (!bill || !kind) {
    return <div className="h-64 motion-safe:animate-pulse rounded-2xl bg-sunken" aria-busy="true" aria-label="Carregando conta" />;
  }
  return <EditBillForm key={bill.id} bill={bill} kind={kind === "INCOME" ? "INCOME" : "EXPENSE"} onClose={onClose} />;
}

function EditBillForm({ bill, kind, onClose }: { bill: Bill; kind: "EXPENSE" | "INCOME"; onClose: () => void }) {
  const update = useUpdateBill();
  const remove = useRemoveBill();
  const [confirming, setConfirming] = useState(false);

  return (
    <BillForm
      mode="edit"
      bill={bill}
      kind={kind}
      pending={update.isPending}
      error={update.error ?? remove.error}
      onSubmit={(body) => update.mutate({ id: bill.id, body }, { onSuccess: onClose })}
      onCancel={onClose}
      footer={
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          {confirming ? (
            <>
              <p className="text-sm leading-snug text-text-soft">
                Se a conta já teve algum mês pago, ela é encerrada e o histórico fica. Senão, ela é apagada.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(bill.id, { onSuccess: onClose })}
                  className="h-11 flex-1 rounded-full bg-danger-strong text-sm font-bold text-on-accent transition active:scale-95 disabled:opacity-60"
                >
                  <PendingLabel pending={remove.isPending} pendingText="Excluindo…">Confirmar exclusão</PendingLabel>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="h-11 flex-1 rounded-full bg-surface text-sm font-bold text-text transition active:scale-95"
                >
                  Manter
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="h-11 self-start rounded-full px-1 text-sm font-bold text-danger-strong"
            >
              Excluir conta
            </button>
          )}
        </div>
      }
    />
  );
}
