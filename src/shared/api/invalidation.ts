import { useQueryClient, type QueryClient } from "@tanstack/react-query";

/** O que uma mutação mudou no servidor. */
export type Change =
  | "transaction"
  | "goal"
  | "category"
  | "budget"
  | "bill"
  | "billPayment"
  | "company"
  | "invoice";

/**
 * Quais famílias de queries cada mudança deixa desatualizadas. É o contrato que o compilador não
 * verifica: esquecer uma chave aqui deixa uma tela mostrando dado velho. Por isso ele mora num
 * lugar só, com um teste para cada linha.
 *
 * - transação: o extrato, todos os dashboards (saldo, gastos por categoria, orçamento), o que já
 *   foi guardado nas metas e as contas (ela pode ser o pagamento de uma);
 * - meta: as metas e as transações, porque apagar uma meta solta o goalId dos aportes dela;
 * - categoria: a lista, os dashboards (que mostram o nome) e as contas (arquivar encerra as dela);
 * - orçamento: só o dashboard de orçamento;
 * - conta (criar, editar, excluir): só as contas;
 * - pagamento de conta: cria ou apaga uma transação, então as contas, o extrato e os dashboards.
 *   As metas ficam de fora porque contas não aceitam categoria de poupança.
 * - empresa (dados, enquadramento, sócios, arquivar): só as empresas. Nada das finanças pessoais
 *   depende dela por enquanto; a ponte com as transações chega com as retiradas.
 * - nota fiscal (salvar, corrigir, cancelar, excluir): as empresas (as notas moram debaixo da chave
 *   da empresa, e a primeira nota trava a data de abertura) e o uso da cota de arquivos.
 */
export const AFFECTS: Record<Change, readonly string[]> = {
  transaction: ["transactions", "dashboard", "goals", "bills"],
  goal: ["goals", "transactions"],
  category: ["categories", "dashboard", "bills"],
  budget: ["dashboard"],
  bill: ["bills"],
  billPayment: ["bills", "transactions", "dashboard"],
  company: ["companies"],
  invoice: ["companies", "attachments"],
};

export function invalidate(queryClient: QueryClient, change: Change): Promise<void> {
  return Promise.all(
    AFFECTS[change].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
  ).then(() => undefined);
}

export function useInvalidate() {
  const queryClient = useQueryClient();
  return (change: Change) => invalidate(queryClient, change);
}
