import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import { expectNoContent, unwrap } from "../../shared/api/problem";
import type { components } from "../../shared/api/schema";
import { useInvalidate } from "../../shared/api/invalidation";

export type TaxMonth = components["schemas"]["TaxMonthResponse"];
export type TaxOccurrence = components["schemas"]["TaxOccurrenceResponse"];
export type TaxCalculation = components["schemas"]["TaxCalculation"];
export type Obligation = components["schemas"]["ObligationResponse"];
export type ObligationInput = components["schemas"]["ObligationRequest"];
export type PayTaxInput = components["schemas"]["PayTaxRequest"];
export type ProLaboreComparison = components["schemas"]["ProLaboreCalculatorResponse"];

/** Debaixo da chave da empresa, como as notas e as despesas. */
export function useTaxMonth(companyId: number, month: string) {
  return useQuery({
    queryKey: ["companies", companyId, "taxes", month],
    queryFn: () => unwrap(api.GET("/companies/{companyId}/taxes", { params: { path: { companyId }, query: { month } } })),
  });
}

export function useObligations(companyId: number) {
  return useQuery({
    queryKey: ["companies", companyId, "obligations"],
    queryFn: () => unwrap(api.GET("/companies/{companyId}/obligations", { params: { path: { companyId } } })),
  });
}

/** Só busca com um faturamento válido; o resultado de cada valor fica no cache. */
export function useProLaboreCalculator(companyId: number, monthlyRevenue: number | null, otherPayroll: number) {
  return useQuery({
    queryKey: ["companies", companyId, "pro-labore-calculator", monthlyRevenue, otherPayroll],
    queryFn: () =>
      unwrap(
        api.GET("/companies/{companyId}/pro-labore-calculator", {
          params: { path: { companyId }, query: { monthlyRevenue: monthlyRevenue ?? 0, otherPayroll } },
        }),
      ),
    enabled: monthlyRevenue !== null && monthlyRevenue > 0,
  });
}

function useTaxMutation<TInput, TResult>(fn: (input: TInput) => Promise<TResult>) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate("tax") });
}

type OccurrenceRef = { obligationId: number; competence: string };

export function usePayTax(companyId: number) {
  return useTaxMutation(({ obligationId, competence, body }: OccurrenceRef & { body: PayTaxInput }) =>
    unwrap(
      api.POST("/companies/{companyId}/taxes/{obligationId}/occurrences/{competence}/payment", {
        params: { path: { companyId, obligationId, competence } },
        body,
      }),
    ),
  );
}

export function useUnpayTax(companyId: number) {
  return useTaxMutation(({ obligationId, competence }: OccurrenceRef) =>
    expectNoContent(
      api.DELETE("/companies/{companyId}/taxes/{obligationId}/occurrences/{competence}/payment", {
        params: { path: { companyId, obligationId, competence } },
      }),
    ),
  );
}

export function useCreateObligation(companyId: number) {
  return useTaxMutation((body: ObligationInput) =>
    unwrap(api.POST("/companies/{companyId}/obligations", { params: { path: { companyId } }, body })),
  );
}

export function useUpdateObligation(companyId: number) {
  return useTaxMutation(
    ({ obligationId, active, changes }: { obligationId: number; active?: boolean; changes?: ObligationInput }) =>
      unwrap(
        api.PATCH("/companies/{companyId}/obligations/{obligationId}", {
          params: { path: { companyId, obligationId } },
          body: { active, changes },
        }),
      ),
  );
}

export function useDeleteObligation(companyId: number) {
  return useTaxMutation((obligationId: number) =>
    expectNoContent(
      api.DELETE("/companies/{companyId}/obligations/{obligationId}", { params: { path: { companyId, obligationId } } }),
    ),
  );
}
