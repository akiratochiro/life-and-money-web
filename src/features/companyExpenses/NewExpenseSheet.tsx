import { useState } from "react";
import { useAttachReceipt, useCreateOneOff, useCreateRecurring, type ExpenseCategory } from "./companyExpensesApi";
import { OneOffForm } from "./OneOffForm";
import { RecurringForm } from "./RecurringForm";
import { BottomSheet } from "../../shared/ui/BottomSheet";
import { useToast } from "../../shared/toast/toastContext";

type Props = { companyId: number; categories: ExpenseCategory[]; onClose: () => void };

/**
 * Nova despesa, avulsa ou fixa. O comprovante sobe depois de a despesa ser salva (dois pedidos): se
 * o arquivo falhar, a despesa fica salva e o aviso diz que o comprovante não subiu.
 */
export function NewExpenseSheet({ companyId, categories, onClose }: Props) {
  const [mode, setMode] = useState<"ONE_OFF" | "RECURRING">("ONE_OFF");
  const createOneOff = useCreateOneOff(companyId);
  const createRecurring = useCreateRecurring(companyId);
  const attachReceipt = useAttachReceipt(companyId);
  const toast = useToast();

  return (
    <BottomSheet title="Nova despesa" open onClose={onClose}>
      <div role="group" aria-label="Tipo de despesa" className="mt-2 grid grid-cols-2 gap-1 rounded-full bg-sunken p-1">
        {([["ONE_OFF", "Avulsa"], ["RECURRING", "Fixa"]] as const).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)}
            className={`flex h-11 items-center justify-center rounded-full text-sm font-bold transition ${
              mode === value ? "bg-surface text-text shadow-clay-sm" : "text-text-muted"
            }`}>
            {label}
          </button>
        ))}
      </div>
      {mode === "ONE_OFF" ? (
        <OneOffForm
          categories={categories}
          withReceipt
          pending={createOneOff.isPending || attachReceipt.isPending}
          error={createOneOff.error}
          submitLabel="Salvar despesa"
          onSubmit={async (expense, receipt) => {
            const created = await createOneOff.mutateAsync(expense).catch(() => undefined);
            if (!created) return;
            if (receipt) {
              await attachReceipt.mutateAsync({ expenseId: created.id, file: receipt }).catch((error: Error) =>
                toast.show(`A despesa foi salva, mas o comprovante não subiu. ${error.message}`, "error"),
              );
            }
            onClose();
          }}
        />
      ) : (
        <RecurringForm
          categories={categories}
          pending={createRecurring.isPending}
          error={createRecurring.error}
          submitLabel="Salvar despesa fixa"
          onSubmit={(expense) => createRecurring.mutate(expense, { onSuccess: onClose })}
        />
      )}
    </BottomSheet>
  );
}
