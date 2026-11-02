import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import { expectNoContent, unwrap } from "../../shared/api/problem";
import { invalidate } from "../../shared/api/invalidation";
import type { components } from "../../shared/api/schema";
import { useToast } from "../../shared/toast/toastContext";
import type { Goal } from "../goals/goalsApi";
import { applyToGoal, insertTransaction, monthOf, provisionalTransaction, removeTransaction } from "./optimistic";

export type Transaction = components["schemas"]["TransactionResponse"];
export type TransactionInput = components["schemas"]["TransactionRequest"];

export function transactionsQuery(month: string) {
  return queryOptions({
    queryKey: ["transactions", month],
    queryFn: () => unwrap(api.GET("/transactions", { params: { query: { month } } })),
  });
}

export function useTransactions(month: string) {
  return useQuery(transactionsQuery(month));
}

/**
 * Atualização otimista: a tela muda antes da resposta do servidor. Antes de mexer no cache, as
 * buscas em andamento são canceladas (uma resposta antiga chegando depois apagaria a mudança) e
 * uma foto do extrato e das metas é guardada, para desfazer tudo se o servidor recusar.
 */
type Snapshot = Array<[QueryKey, unknown]>;

async function takeSnapshot(queryClient: QueryClient): Promise<Snapshot> {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: ["transactions"] }),
    queryClient.cancelQueries({ queryKey: ["goals"] }),
  ]);
  return [
    ...queryClient.getQueriesData({ queryKey: ["transactions"] }),
    ...queryClient.getQueriesData({ queryKey: ["goals"] }),
  ];
}

function restore(queryClient: QueryClient, snapshot: Snapshot | undefined) {
  snapshot?.forEach(([key, data]) => queryClient.setQueryData(key, data));
}

/** Só mexe num mês que já está no cache: um mês nunca aberto vai ser buscado do servidor mesmo. */
function updateMonth(queryClient: QueryClient, month: string, change: (list: Transaction[]) => Transaction[]) {
  queryClient.setQueryData<Transaction[]>(["transactions", month], (list) => (list ? change(list) : list));
}

function updateGoal(queryClient: QueryClient, goalId: number | undefined, delta: number) {
  queryClient.setQueryData<Goal[]>(["goals"], (goals) => (goals ? applyToGoal(goals, goalId, delta) : goals));
}

function findCached(queryClient: QueryClient, id: number): Transaction | undefined {
  for (const [, list] of queryClient.getQueriesData<Transaction[]>({ queryKey: ["transactions"] })) {
    const found = list?.find((item) => item.id === id);
    if (found) return found;
  }
  return undefined;
}

/** O que dá errado depois que a tela já mudou vira um toast, com o motivo que a API deu. */
function useOptimisticHandlers(failure: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return {
    queryClient,
    onError: (error: Error, _variables: unknown, snapshot: Snapshot | undefined) => {
      restore(queryClient, snapshot);
      toast.show(`${failure} ${error.message}`, "error");
    },
    onSettled: () => invalidate(queryClient, "transaction"),
  };
}

/** Também é o aporte numa meta: uma transação de poupança com goalId. */
export function useCreateTransaction() {
  const { queryClient, ...handlers } = useOptimisticHandlers("Não foi possível salvar a transação.");
  return useMutation({
    mutationFn: (body: TransactionInput) => unwrap(api.POST("/transactions", { body })),
    onMutate: async (body) => {
      const snapshot = await takeSnapshot(queryClient);
      updateMonth(queryClient, monthOf(body.transactionDate), (list) =>
        insertTransaction(list, provisionalTransaction(body)),
      );
      updateGoal(queryClient, body.goalId, body.amount);
      return snapshot;
    },
    ...handlers,
  });
}

export function useUpdateTransaction() {
  const { queryClient, ...handlers } = useOptimisticHandlers("Não foi possível salvar a alteração.");
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: TransactionInput }) =>
      unwrap(api.PUT("/transactions/{id}", { params: { path: { id } }, body })),
    onMutate: async ({ id, body }) => {
      const snapshot = await takeSnapshot(queryClient);
      const before = findCached(queryClient, id);
      if (before) {
        updateMonth(queryClient, monthOf(before.transactionDate), (list) => removeTransaction(list, id));
        updateGoal(queryClient, before.goalId, -before.amount);
      }
      const after = { ...provisionalTransaction(body, id), createdAt: before?.createdAt ?? new Date().toISOString() };
      updateMonth(queryClient, monthOf(body.transactionDate), (list) => insertTransaction(list, after));
      updateGoal(queryClient, body.goalId, body.amount);
      return snapshot;
    },
    ...handlers,
  });
}

export function useDeleteTransaction() {
  const { queryClient, ...handlers } = useOptimisticHandlers("Não foi possível apagar a transação.");
  return useMutation({
    mutationFn: (id: number) => expectNoContent(api.DELETE("/transactions/{id}", { params: { path: { id } } })),
    onMutate: async (id) => {
      const snapshot = await takeSnapshot(queryClient);
      const before = findCached(queryClient, id);
      if (before) {
        updateMonth(queryClient, monthOf(before.transactionDate), (list) => removeTransaction(list, id));
        updateGoal(queryClient, before.goalId, -before.amount);
      }
      return snapshot;
    },
    ...handlers,
  });
}
