import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import { expectNoContent, unwrap } from "../../shared/api/problem";
import { useInvalidate } from "../../shared/api/invalidation";
import type { components } from "../../shared/api/schema";

export type CompanyOverview = components["schemas"]["CompanyOverviewResponse"];
export type UpcomingItem = components["schemas"]["UpcomingItem"];

/**
 * Debaixo da chave da empresa: nota, despesa, imposto e retirada já invalidam "companies", então os
 * cards se atualizam sem entrada nova no mapa de invalidação.
 */
export function overviewQuery(companyId: number, month: string) {
  return queryOptions({
    queryKey: ["companies", companyId, "overview", month],
    queryFn: () => unwrap(api.GET("/companies/{companyId}/overview", { params: { path: { companyId }, query: { month } } })),
  });
}

export function useCompanyOverview(companyId: number, month: string) {
  return useQuery(overviewQuery(companyId, month));
}

export function useUpcoming(companyId: number) {
  return useQuery({
    queryKey: ["companies", companyId, "upcoming"],
    queryFn: () => unwrap(api.GET("/companies/{companyId}/upcoming", { params: { path: { companyId } } })),
  });
}

export type CompanyCash = components["schemas"]["CompanyCashResponse"];

/** O caixa de hoje (decisão 30): não depende do mês escolhido nos cards, por isso tem chave própria. */
export function useCompanyCash(companyId: number) {
  return useQuery({
    queryKey: ["companies", companyId, "cash"],
    queryFn: () => unwrap(api.GET("/companies/{companyId}/cash", { params: { path: { companyId } } })),
  });
}

export type FatorRMonitor = components["schemas"]["FatorRMonitorResponse"];

/** O monitor do Fator R (decisão 31): sempre o mês corrente e a próxima competência, chave própria. */
export function useFatorRMonitor(companyId: number) {
  return useQuery({
    queryKey: ["companies", companyId, "fator-r"],
    queryFn: () => unwrap(api.GET("/companies/{companyId}/fator-r", { params: { path: { companyId } } })),
  });
}

export function useSetExpectedRevenue(companyId: number) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (amount: number) =>
      unwrap(api.PUT("/companies/{companyId}/expected-revenue", { params: { path: { companyId } }, body: { amount } })),
    onSuccess: () => invalidate("expectedRevenue"),
  });
}

export function useRemoveExpectedRevenue(companyId: number) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: () => expectNoContent(api.DELETE("/companies/{companyId}/expected-revenue", { params: { path: { companyId } } })),
    onSuccess: () => invalidate("expectedRevenue"),
  });
}
