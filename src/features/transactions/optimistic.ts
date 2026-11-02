import type { Transaction, TransactionInput } from "./transactionsApi";
import type { Goal } from "../goals/goalsApi";

/** "2026-10-31" → "2026-10": a chave do extrato em que a transação aparece. */
export const monthOf = (isoDate: string): string => isoDate.slice(0, 7);

/**
 * Ids provisórios são negativos, para nunca colidir com os do servidor. Na ordenação, contam como
 * os mais novos: o servidor também põe o último lançamento do dia no topo.
 */
let provisional = 0;
export const provisionalId = (): number => --provisional;

const recency = (id: number): number => (id < 0 ? Number.MAX_SAFE_INTEGER + id : id);

/** Mesma ordem do servidor: data mais recente primeiro; no mesmo dia, o lançamento mais novo. */
function comesBefore(a: Transaction, b: Transaction): boolean {
  if (a.transactionDate !== b.transactionDate) return a.transactionDate > b.transactionDate;
  return recency(a.id) > recency(b.id);
}

export function insertTransaction(list: Transaction[], transaction: Transaction): Transaction[] {
  const index = list.findIndex((item) => comesBefore(transaction, item));
  const at = index === -1 ? list.length : index;
  return [...list.slice(0, at), transaction, ...list.slice(at)];
}

export function removeTransaction(list: Transaction[], id: number): Transaction[] {
  return list.filter((item) => item.id !== id);
}

/** A transação como o servidor a devolveria, para aparecer na tela antes da resposta. */
export function provisionalTransaction(input: TransactionInput, id = provisionalId(), now = new Date()): Transaction {
  const timestamp = now.toISOString();
  return {
    id,
    categoryId: input.categoryId,
    goalId: input.goalId,
    amount: input.amount,
    transactionDate: input.transactionDate,
    description: input.description?.trim() || undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/**
 * Soma (ou tira) um aporte do que a meta já guardou. O valor por mês e os meses restantes
 * continuam os de antes até o servidor responder: são cálculos dele, não do front.
 */
export function applyToGoal(goals: Goal[], goalId: number | undefined, delta: number): Goal[] {
  if (goalId === undefined || delta === 0) return goals;
  return goals.map((goal) => {
    if (goal.id !== goalId) return goal;
    const saved = Math.round((goal.saved + delta) * 100) / 100;
    const reached = saved >= goal.targetAmount;
    return {
      ...goal,
      saved,
      remaining: Math.max(Math.round((goal.targetAmount - saved) * 100) / 100, 0),
      status: reached ? "REACHED" : goal.status === "REACHED" ? "IN_PROGRESS" : goal.status,
    };
  });
}
