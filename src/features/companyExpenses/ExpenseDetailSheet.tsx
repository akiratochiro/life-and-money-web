import { useState } from "react";
import {
  downloadReceipt,
  useAttachReceipt,
  useDeleteExpense,
  useDeleteRecurring,
  usePayRecurring,
  useRecurringExpenses,
  useRemoveReceipt,
  useUnpayRecurring,
  useUpdateExpense,
  useUpdateRecurring,
  type ExpenseCategory,
  type ExpenseItem,
} from "./companyExpensesApi";
import { OneOffForm } from "./OneOffForm";
import { RecurringForm } from "./RecurringForm";
import { BottomSheet } from "../../shared/ui/BottomSheet";
import { MoneyField } from "../../shared/ui/MoneyField";
import { PendingLabel } from "../../shared/ui/PendingLabel";
import { formatDate, todayIso } from "../../shared/lib/dates";
import { formatCents, toCents } from "../../shared/lib/money";

type Props = {
  companyId: number;
  month: string;
  item: ExpenseItem;
  categories: ExpenseCategory[];
  readOnly: boolean;
  onClose: () => void;
};

const link = "flex min-h-11 items-center self-start text-sm font-bold";

/** O detalhe de uma despesa do mês: pagar ou desfazer (fixa), editar, comprovante e excluir. */
export function ExpenseDetailSheet({ companyId, month, item, categories, readOnly, onClose }: Props) {
  const [editing, setEditing] = useState(false);
  const paid = item.status === "PAID";
  const recurring = item.kind === "RECURRING";

  return (
    <BottomSheet title={item.name} open onClose={onClose}>
      {editing ? (
        <EditForm companyId={companyId} item={item} categories={categories} onDone={() => setEditing(false)} />
      ) : (
        <div className="flex flex-col gap-4 pt-2">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-text-muted">{paid ? "Pago" : "Previsto"}</dt>
            <dd className="font-semibold tabular-nums">{formatCents(toCents(item.amount))}</dd>
            {recurring && paid && item.expectedAmount !== undefined && toCents(item.expectedAmount) !== toCents(item.amount) && (
              <>
                <dt className="text-text-muted">Previsto</dt>
                <dd className="font-semibold tabular-nums">{formatCents(toCents(item.expectedAmount))}</dd>
              </>
            )}
            {recurring && item.dueDate && (
              <>
                <dt className="text-text-muted">Vencimento</dt>
                <dd className="font-semibold">{formatDate(item.dueDate)}</dd>
              </>
            )}
            {paid && (
              <>
                <dt className="text-text-muted">Pago em</dt>
                <dd className="font-semibold">{formatDate(item.date)}</dd>
              </>
            )}
            <dt className="text-text-muted">Categoria</dt>
            <dd className="font-semibold">{categories.find((c) => c.id === item.categoryId)?.name ?? "—"}</dd>
          </dl>

          {!readOnly && recurring && !paid && <PayForm companyId={companyId} month={month} item={item} onPaid={onClose} />}
          {item.expenseId !== undefined && (
            <ReceiptActions companyId={companyId} expenseId={item.expenseId} hasReceipt={item.hasReceipt} readOnly={readOnly} />
          )}
          {!readOnly && (
            <div className="flex flex-col gap-1">
              <button type="button" onClick={() => setEditing(true)} className={`${link} text-link`}>
                {recurring ? (paid ? "Corrigir valor ou data do pagamento" : "Editar despesa fixa") : "Editar despesa"}
              </button>
              <DangerActions companyId={companyId} month={month} item={item} onDone={onClose} />
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  );
}

function PayForm({ companyId, month, item, onPaid }: { companyId: number; month: string; item: ExpenseItem; onPaid: () => void }) {
  const pay = usePayRecurring(companyId);
  const today = todayIso();
  const [cents, setCents] = useState(toCents(item.amount));
  const [date, setDate] = useState(item.dueDate && item.dueDate <= today ? item.dueDate : today);
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-sunken p-3">
      <MoneyField label="Valor pago" cents={cents} onChange={setCents} />
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text-muted">Pago em</span>
        <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)}
          className="h-14 rounded-2xl border border-line bg-surface px-4 text-base text-text outline-none focus:border-accent [color-scheme:light]" />
      </label>
      {pay.error && <p role="alert" className="text-sm font-semibold text-danger-strong">{pay.error.message}</p>}
      <button type="button" disabled={cents <= 0 || !date || pay.isPending}
        onClick={() => pay.mutate({ recurringId: item.recurringExpenseId!, month, amount: cents / 100, date }, { onSuccess: onPaid })}
        className="h-12 rounded-full bg-accent font-bold text-on-accent shadow-clay-accent disabled:opacity-60">
        <PendingLabel pending={pay.isPending} pendingText="Salvando…">Marcar como paga</PendingLabel>
      </button>
    </div>
  );
}

function ReceiptActions({ companyId, expenseId, hasReceipt, readOnly }: {
  companyId: number; expenseId: number; hasReceipt: boolean; readOnly: boolean;
}) {
  const attach = useAttachReceipt(companyId);
  const remove = useRemoveReceipt(companyId);
  const [error, setError] = useState<string>();
  return (
    <div className="flex flex-col gap-1">
      {hasReceipt ? (
        <>
          <button type="button" className={`${link} text-link`}
            onClick={() => downloadReceipt(companyId, expenseId).catch((e: Error) => setError(e.message))}>
            Baixar comprovante
          </button>
          {!readOnly && (
            <button type="button" disabled={remove.isPending} onClick={() => remove.mutate(expenseId)} className={`${link} text-text-soft`}>
              Remover comprovante
            </button>
          )}
        </>
      ) : (
        !readOnly && (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-text-muted">Anexar comprovante (PDF, JPEG ou PNG)</span>
            <input type="file" accept="application/pdf,image/jpeg,image/png" disabled={attach.isPending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) attach.mutate({ expenseId, file });
              }}
              className="min-h-11 text-sm text-text-soft file:mr-3 file:h-11 file:rounded-full file:border-0 file:bg-sunken file:px-4 file:font-bold file:text-text" />
          </label>
        )
      )}
      {(error || attach.error || remove.error) && (
        <p role="alert" className="text-sm font-semibold text-danger-strong">{error ?? (attach.error ?? remove.error)!.message}</p>
      )}
    </div>
  );
}

function DangerActions({ companyId, month, item, onDone }: { companyId: number; month: string; item: ExpenseItem; onDone: () => void }) {
  const unpay = useUnpayRecurring(companyId);
  const deleteExpense = useDeleteExpense(companyId);
  const deleteRecurring = useDeleteRecurring(companyId);
  const [confirming, setConfirming] = useState<"unpay" | "delete" | "deleteRecurring" | null>(null);
  const recurring = item.kind === "RECURRING";
  const paid = item.status === "PAID";
  const pending = unpay.isPending || deleteExpense.isPending || deleteRecurring.isPending;
  const error = unpay.error ?? deleteExpense.error ?? deleteRecurring.error;

  const confirmations = {
    unpay: { text: "Desfazer o pagamento? O mês volta a pendente, e o comprovante, se houver, é apagado.", action: "Desfazer",
      run: () => unpay.mutate({ recurringId: item.recurringExpenseId!, month }, { onSuccess: onDone }) },
    delete: { text: "Excluir a despesa e o comprovante dela? Não dá para desfazer.", action: "Excluir",
      run: () => deleteExpense.mutate(item.expenseId!, { onSuccess: onDone }) },
    deleteRecurring: { text: "Excluir a despesa fixa? Se ela nunca foi paga, some de vez; se já tem meses pagos, é encerrada no mês passado e o histórico fica.", action: "Excluir",
      run: () => deleteRecurring.mutate(item.recurringExpenseId!, { onSuccess: onDone }) },
  };

  if (confirming) {
    const confirmation = confirmations[confirming];
    return (
      <div className="flex flex-col gap-2 rounded-2xl bg-sunken p-3">
        <p className="text-sm text-text-soft">{confirmation.text}</p>
        <div className="flex gap-2">
          <button type="button" disabled={pending} onClick={confirmation.run}
            className="flex min-h-11 items-center rounded-full px-4 text-sm font-bold text-danger-strong disabled:opacity-60">
            <PendingLabel pending={pending} pendingText="Salvando…">{confirmation.action}</PendingLabel>
          </button>
          <button type="button" onClick={() => setConfirming(null)} className="flex min-h-11 items-center rounded-full px-4 text-sm font-bold text-text-muted">
            Cancelar
          </button>
        </div>
        {error && <p role="alert" className="text-sm font-semibold text-danger-strong">{error.message}</p>}
      </div>
    );
  }
  return (
    <>
      {recurring && paid && (
        <button type="button" onClick={() => setConfirming("unpay")} className={`${link} text-text-soft`}>Desfazer pagamento</button>
      )}
      {recurring ? (
        <button type="button" onClick={() => setConfirming("deleteRecurring")} className={`${link} text-danger-strong`}>Excluir despesa fixa</button>
      ) : (
        <button type="button" onClick={() => setConfirming("delete")} className={`${link} text-danger-strong`}>Excluir despesa</button>
      )}
    </>
  );
}

/** Avulsa: tudo muda. Pagamento de fixa: só valor e data. Fixa pendente: os termos, a partir deste mês. */
function EditForm({ companyId, item, categories, onDone }: {
  companyId: number; item: ExpenseItem; categories: ExpenseCategory[]; onDone: () => void;
}) {
  const updateExpense = useUpdateExpense(companyId);
  const updateRecurring = useUpdateRecurring(companyId);
  const recurringList = useRecurringExpenses(companyId);

  if (item.kind === "RECURRING" && item.status !== "PAID") {
    const recurring = recurringList.data?.find((r) => r.id === item.recurringExpenseId);
    if (!recurring) return <div className="h-24 motion-safe:animate-pulse rounded-2xl bg-sunken" />;
    return (
      <RecurringForm categories={categories} initial={recurring} pending={updateRecurring.isPending} error={updateRecurring.error}
        submitLabel="Salvar mudanças"
        onSubmit={(body) => updateRecurring.mutate({ recurringId: recurring.id, body }, { onSuccess: onDone })} />
    );
  }
  if (item.kind === "RECURRING") {
    return <PaymentEditForm item={item} pending={updateExpense.isPending} error={updateExpense.error}
      onSubmit={(amount, date) => updateExpense.mutate(
        { expenseId: item.expenseId!, body: { name: item.name, amount, categoryId: item.categoryId, date } },
        { onSuccess: onDone })} />;
  }
  return (
    <OneOffForm categories={categories}
      initial={{ name: item.name, amount: item.amount, categoryId: item.categoryId, date: item.date }}
      withReceipt={false} pending={updateExpense.isPending} error={updateExpense.error} submitLabel="Salvar mudanças"
      onSubmit={(body) => updateExpense.mutate({ expenseId: item.expenseId!, body }, { onSuccess: onDone })} />
  );
}

/** No pagamento de uma fixa, só o valor e a data mudam: o nome e a categoria vêm da fixa. */
function PaymentEditForm({ item, pending, error, onSubmit }: {
  item: ExpenseItem; pending: boolean; error: Error | null; onSubmit: (amount: number, date: string) => void;
}) {
  const [cents, setCents] = useState(toCents(item.amount));
  const [date, setDate] = useState(item.date);
  return (
    <div className="flex flex-col gap-4 pt-2">
      <MoneyField label="Valor pago" cents={cents} onChange={setCents} />
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text-muted">Pago em</span>
        <input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)}
          className="h-14 rounded-2xl border border-line bg-sunken px-4 text-base text-text outline-none focus:border-accent [color-scheme:light]" />
      </label>
      {error && <p role="alert" className="text-sm font-semibold text-danger-strong">{error.message}</p>}
      <button type="button" disabled={cents <= 0 || !date || pending} onClick={() => onSubmit(cents / 100, date)}
        className="h-12 rounded-full bg-accent font-bold text-on-accent shadow-clay-accent disabled:opacity-60">
        <PendingLabel pending={pending} pendingText="Salvando…">Salvar correção</PendingLabel>
      </button>
    </div>
  );
}
