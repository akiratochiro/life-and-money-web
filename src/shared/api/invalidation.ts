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
  | "invoice"
  | "companyExpense"
  | "tax"
  | "withdrawal"
  | "expectedRevenue";

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
 * - imposto (pagar, desfazer, obrigações): as empresas. O pagamento cria ou apaga uma despesa de
 *   Impostos, e as despesas também moram debaixo da chave da empresa.
 * - retirada (pró-labore, distribuição, planejado, lançar): as empresas (muda o DARF e o Fator R) e, desde
 *   a Fase 6, as finanças pessoais: lançar cria uma receita (e talvez a categoria "Pró-labore"), e editar
 *   ou excluir a retirada lançada muda ou apaga essa receita.
 * - calendário (Fase 9): toda mudança que mexe num vencimento ou no status dele recarrega o calendário e o
 *   número de lembretes do menu: transação (pode ser o pagamento de uma conta), categoria (arquivar encerra
 *   contas), conta e pagamento, empresa (arquivar tira os eventos dela), nota (muda o DAS), despesa, imposto
 *   e retirada (muda o DARF). Meta, orçamento e faturamento esperado não mexem em vencimento.
 * - faturamento esperado (Fase 8): só as empresas (o monitor do Fator R). Nunca o Início pessoal: o alerta
 *   do Fator R mora só na visão da empresa.
 */
export const AFFECTS: Record<Change, readonly string[]> = {
  transaction: ["transactions", "dashboard", "goals", "bills", "calendar"],
  goal: ["goals", "transactions"],
  category: ["categories", "dashboard", "bills", "calendar"],
  budget: ["dashboard"],
  bill: ["bills", "calendar"],
  billPayment: ["bills", "transactions", "dashboard", "calendar"],
  company: ["companies", "calendar"],
  invoice: ["companies", "attachments", "calendar"],
  companyExpense: ["companies", "attachments", "calendar"],
  tax: ["companies", "calendar"],
  withdrawal: ["companies", "transactions", "dashboard", "categories", "calendar"],
  expectedRevenue: ["companies"],
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
