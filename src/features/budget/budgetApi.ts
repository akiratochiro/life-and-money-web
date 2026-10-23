import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import { expectNoContent, unwrap } from "../../shared/api/problem";
import type { components } from "../../shared/api/schema";

export type BudgetLine = components["schemas"]["BudgetLine"];
export type BudgetMode = BudgetLine["mode"];
export type BudgetStatus = BudgetLine["status"];

export function useBudgetDashboard(month: string) {
  return useQuery({
    queryKey: ["dashboard", "budget", month],
    queryFn: () => unwrap(api.GET("/dashboard/budget", { params: { query: { month } } })),
  });
}

function useInvalidateBudget() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["budgets"] }),
    ]);
}

export function useSetBudget() {
  const invalidate = useInvalidateBudget();
  return useMutation({
    mutationFn: ({ categoryId, mode, limitValue }: { categoryId: number; mode: BudgetMode; limitValue: number }) =>
      unwrap(api.PUT("/budgets/{categoryId}", { params: { path: { categoryId } }, body: { mode, limitValue } })),
    onSuccess: invalidate,
  });
}

export function useRemoveBudget() {
  const invalidate = useInvalidateBudget();
  return useMutation({
    mutationFn: (categoryId: number) =>
      expectNoContent(api.DELETE("/budgets/{categoryId}", { params: { path: { categoryId } } })),
    onSuccess: invalidate,
  });
}