import { useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import { unwrap } from "../../shared/api/problem";
import type { components } from "../../shared/api/schema";

export type Revenue = components["schemas"]["RevenueResponse"];
export type Granularity = Revenue["granularity"];

/** Debaixo da chave da empresa: salvar ou cancelar uma nota (mudança "invoice") recarrega a receita. */
export function useRevenue(companyId: number, granularity: Granularity, from: string, to: string) {
  return useQuery({
    queryKey: ["companies", companyId, "revenue", granularity, from, to],
    queryFn: () =>
      unwrap(api.GET("/companies/{companyId}/revenue", { params: { path: { companyId }, query: { from, to, granularity } } })),
  });
}
