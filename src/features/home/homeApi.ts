import { useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import { unwrap } from "../../shared/api/problem";
import type { components } from "../../shared/api/schema";

export type BudgetLine = components["schemas"]["BudgetLine"];
export type Goal = components["schemas"]["SavingsGoalResponse"];

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(api.GET("/users/me")),
  });
}

export function useMonthTotals() {
  return useQuery({
    queryKey: ["dashboard", "monthly-totals", 1],
    queryFn: () => unwrap(api.GET("/dashboard/monthly-totals", { params: { query: { months: 1 } } })),
  });
}

export function useBudgetDashboard(month: string) {
  return useQuery({
    queryKey: ["dashboard", "budget", month],
    queryFn: () => unwrap(api.GET("/dashboard/budget", { params: { query: { month } } })),
  });
}

export function useGoals() {
  return useQuery({
    queryKey: ["goals"],
    queryFn: () => unwrap(api.GET("/goals")),
  });
}