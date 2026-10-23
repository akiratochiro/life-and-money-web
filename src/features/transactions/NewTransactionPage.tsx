import { Link, useNavigate } from "react-router";
import { TransactionForm } from "./TransactionForm";
import { useCreateTransaction } from "./transactionsApi";

export function NewTransactionPage() {
  const navigate = useNavigate();
  const createTransaction = useCreateTransaction();

  return (
    <div className="flex flex-col gap-7">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold">Nova transação</h1>
        <Link to="/" className="flex h-11 items-center px-2 text-sm font-bold text-text-muted hover:text-text">
          Cancelar
        </Link>
      </header>
      <TransactionForm
        submitLabel="Salvar"
        pending={createTransaction.isPending}
        error={createTransaction.error}
        onSubmit={(input) =>
          createTransaction.mutate(input, { onSuccess: () => navigate("/", { replace: true }) })
        }
      />
    </div>
  );
}