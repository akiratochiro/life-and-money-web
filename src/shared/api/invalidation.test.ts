import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { invalidate, type Change } from "./invalidation";

/** Uma query de cada família que o app usa hoje. */
const QUERIES = {
  transactions: ["transactions", "2026-10"],
  expensesByCategory: ["dashboard", "expenses-by-category", "2026-10"],
  monthlyTotals: ["dashboard", "monthly-totals", 6],
  budget: ["dashboard", "budget", "2026-10"],
  goals: ["goals"],
  categories: ["categories", { includeArchived: true }],
  billOccurrences: ["bills", "occurrences", "2026-10"],
  billsUpcoming: ["bills", "upcoming"],
  holidays: ["holidays", 2026],
  companies: ["companies", "list", { includeArchived: false }],
  company: ["companies", 7],
  companyRegimes: ["companies", 7, "regimes"],
  invoices: ["companies", 7, "invoices", 2026],
  attachmentUsage: ["attachments", "usage"],
  me: ["me"],
} as const;

type Query = keyof typeof QUERIES;

async function staleAfter(change: Change): Promise<Query[]> {
  const queryClient = new QueryClient();
  for (const key of Object.values(QUERIES)) queryClient.setQueryData(key, {});
  await invalidate(queryClient, change);
  return (Object.keys(QUERIES) as Query[]).filter(
    (name) => queryClient.getQueryState(QUERIES[name])?.isInvalidated,
  );
}

describe("o que cada mudança recarrega", () => {
  it("uma transação: extrato, dashboards, metas e contas", async () => {
    expect(await staleAfter("transaction")).toEqual([
      "transactions", "expensesByCategory", "monthlyTotals", "budget", "goals", "billOccurrences", "billsUpcoming",
    ]);
  });

  it("uma meta: metas e transações (apagar a meta solta os aportes)", async () => {
    expect(await staleAfter("goal")).toEqual(["transactions", "goals"]);
  });

  it("uma categoria: categorias, dashboards e contas", async () => {
    expect(await staleAfter("category")).toEqual([
      "expensesByCategory", "monthlyTotals", "budget", "categories", "billOccurrences", "billsUpcoming",
    ]);
  });

  it("o orçamento: só os dashboards", async () => {
    expect(await staleAfter("budget")).toEqual(["expensesByCategory", "monthlyTotals", "budget"]);
  });

  it("uma conta: só as contas", async () => {
    expect(await staleAfter("bill")).toEqual(["billOccurrences", "billsUpcoming"]);
  });

  it("um pagamento de conta: contas, extrato e dashboards, sem as metas", async () => {
    expect(await staleAfter("billPayment")).toEqual([
      "transactions", "expensesByCategory", "monthlyTotals", "budget", "billOccurrences", "billsUpcoming",
    ]);
  });

  it("uma empresa: só as empresas (a lista do menu, a empresa e o histórico)", async () => {
    expect(await staleAfter("company")).toEqual(["companies", "company", "companyRegimes", "invoices"]);
  });

  it("uma despesa da empresa: as empresas (despesas e receita debaixo delas) e o uso da cota", async () => {
    expect(await staleAfter("companyExpense")).toEqual(["companies", "company", "companyRegimes", "invoices", "attachmentUsage"]);
  });

  it("uma nota: as empresas (notas e data de abertura) e o uso da cota", async () => {
    expect(await staleAfter("invoice")).toEqual(["companies", "company", "companyRegimes", "invoices", "attachmentUsage"]);
  });

  it("um imposto: as empresas (impostos e a despesa de Impostos debaixo delas)", async () => {
    expect(await staleAfter("tax")).toEqual(["companies", "company", "companyRegimes", "invoices"]);
  });

  it("uma retirada: as empresas (DARF e Fator R) e as finanças pessoais (o lançamento e a categoria dele)", async () => {
    expect(await staleAfter("withdrawal")).toEqual([
      "transactions", "expensesByCategory", "monthlyTotals", "budget", "categories", "companies", "company", "companyRegimes", "invoices",
    ]);
  });

  it("o faturamento esperado: só as empresas, nunca o Início pessoal", async () => {
    expect(await staleAfter("expectedRevenue")).toEqual(["companies", "company", "companyRegimes", "invoices"]);
  });

  it("nenhuma mudança das finanças pessoais recarrega as empresas", async () => {
    for (const change of ["transaction", "goal", "category", "budget", "bill", "billPayment"] as const) {
      expect(await staleAfter(change)).not.toContain("companies");
      expect(await staleAfter(change)).not.toContain("invoices");
    }
  });

  it("feriados e perfil nunca são recarregados por uma mutação", async () => {
    for (const change of ["transaction", "goal", "category", "budget", "bill", "billPayment", "company", "invoice", "companyExpense"] as const) {
      const stale = await staleAfter(change);
      expect(stale).not.toContain("holidays");
      expect(stale).not.toContain("me");
    }
  });
});
