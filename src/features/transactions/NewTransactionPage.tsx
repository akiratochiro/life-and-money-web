import { Link, useNavigate, useSearchParams } from "react-router";
import { TransactionForm } from "./TransactionForm";
import { useCreateTransaction } from "./transactionsApi";

function safeReturnPath(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function NewTransactionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const createTransaction = useCreateTransaction();

  const returnTo = safeReturnPath(searchParams.get("returnTo"));
  const presetGoalId = Number(searchParams.get("goalId")) || null;
  const initial =
    searchParams.get("type") === "SAVING" ? { type: "SAVING" as const, goalId: presetGoalId } : undefined;

  return (
    <div className="flex flex-col gap-7">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold">Nova transação</h1>
        <Link to={returnTo} className="flex h-11 items-center px-2 text-sm font-bold text-text-muted hover:text-text">
          Cancelar
        </Link>
      </header>
      <TransactionForm
        initial={initial}
        submitLabel="Salvar"
        pending={createTransaction.isPending}
        error={createTransaction.error}
        onSubmit={(input) =>
          createTransaction.mutate(input, { onSuccess: () => navigate(returnTo, { replace: true }) })
        }
      />
    </div>
  );
}