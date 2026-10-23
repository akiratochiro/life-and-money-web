import { useEffect, useRef, useState } from "react";
import type { Category } from "../categories/categoriesApi";
import { TransactionForm } from "./TransactionForm";
import { useDeleteTransaction, useUpdateTransaction, type Transaction } from "./transactionsApi";
import { toCents } from "../../shared/lib/money";
import { CloseIcon } from "../../shared/ui/icons";

type Props = {
  transaction: Transaction;
  category: Category | undefined;
  onClose: () => void;
};

export function EditTransactionDialog({ transaction, category, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const close = () => dialogRef.current?.close();
  const id = transaction.id!;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="edit-transaction-title"
      className="m-auto max-h-[90dvh] w-[min(100%-1.5rem,32rem)] overflow-y-auto rounded-hero bg-ink-900 p-6 text-text shadow-card backdrop:bg-ink-950/80 backdrop:backdrop-blur-sm"
    >
      <header className="mb-6 flex items-center justify-between">
        <h2 id="edit-transaction-title" className="font-display text-lg font-semibold">
          Editar transação
        </h2>
        <button
          type="button"
          onClick={close}
          aria-label="Fechar"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface transition active:scale-95"
        >
          <CloseIcon />
        </button>
      </header>

      <TransactionForm
        initial={{
          type: category?.type ?? "EXPENSE",
          cents: toCents(transaction.amount ?? 0),
          categoryId: transaction.categoryId ?? null,
          date: transaction.transactionDate,
          description: transaction.description ?? "",
          goalId: transaction.goalId ?? null,
        }}
        submitLabel="Salvar alterações"
        pending={updateTransaction.isPending}
        error={updateTransaction.error ?? deleteTransaction.error}
        onSubmit={(input) => updateTransaction.mutate({ id, body: input }, { onSuccess: close })}
        footer={
          confirmingDelete ? (
            <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
              <p className="text-sm text-text-soft">Apagar esta transação? Isso não pode ser desfeito.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={deleteTransaction.isPending}
                  onClick={() => deleteTransaction.mutate(id, { onSuccess: close })}
                  className="h-11 flex-1 rounded-full bg-danger font-bold text-[#1a0710] transition active:scale-95 disabled:opacity-60"
                >
                  {deleteTransaction.isPending ? "Apagando..." : "Apagar"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="h-11 flex-1 rounded-full bg-ink-800 font-bold text-text transition active:scale-95"
                >
                  Voltar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="h-11 self-center px-4 text-sm font-bold text-danger"
            >
              Apagar transação
            </button>
          )
        }
      />
    </dialog>
  );
}