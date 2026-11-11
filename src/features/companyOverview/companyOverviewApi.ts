import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import { unwrap } from "../../shared/api/problem";
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
