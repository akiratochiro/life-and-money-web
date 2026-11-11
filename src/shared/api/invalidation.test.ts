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
    expect(await staleAfter("company")).toEqual(["companies", "company", "companyRegimes"]);
  });

  it("nenhuma mudança das finanças pessoais recarrega as empresas", async () => {
    for (const change of ["transaction", "goal", "category", "budget", "bill", "billPayment"] as const) {
      expect(await staleAfter(change)).not.toContain("companies");
    }
  });

  it("feriados e perfil nunca são recarregados por uma mutação", async () => {
    for (const change of ["transaction", "goal", "category", "budget", "bill", "billPayment", "company"] as const) {
      const stale = await staleAfter(change);
      expect(stale).not.toContain("holidays");
      expect(stale).not.toContain("me");
    }
  });
});
