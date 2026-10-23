import { useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import { unwrap } from "../../shared/api/problem";
import type { components } from "../../shared/api/schema";

export type ExpensesByCategory = components["schemas"]["ExpensesByCategoryResponse"];
export type MonthlyTotal = components["schemas"]["MonthlyTotal"];
export type Averages = components["schemas"]["Averages"];

export function useExpensesByCategory(month: string) {
  return useQuery({
    queryKey: ["dashboard", "expenses-by-category", month],
    queryFn: () => unwrap(api.GET("/dashboard/expenses-by-category", { params: { query: { month } } })),
  });
}

export function useMonthlyTotals(months: number) {
  return useQuery({
    queryKey: ["dashboard", "monthly-totals", months],
    queryFn: () => unwrap(api.GET("/dashboard/monthly-totals", { params: { query: { months } } })),
  });
}