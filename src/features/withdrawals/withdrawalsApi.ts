import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import { expectNoContent, unwrap } from "../../shared/api/problem";
import type { components } from "../../shared/api/schema";
import { useInvalidate } from "../../shared/api/invalidation";

export type Withdrawal = components["schemas"]["WithdrawalResponse"];
export type WithdrawalInput = components["schemas"]["WithdrawalRequest"];
export type ProLaborePlan = components["schemas"]["ProLaborePlanResponse"];

export function useWithdrawals(companyId: number, year: number) {
  return useQuery({
    queryKey: ["companies", companyId, "withdrawals", year],
    queryFn: () => unwrap(api.GET("/companies/{companyId}/withdrawals", { params: { path: { companyId }, query: { year } } })),
  });
}

export function useProLaborePlans(companyId: number) {
  return useQuery({
    queryKey: ["companies", companyId, "pro-labore-plans"],
    queryFn: () => unwrap(api.GET("/companies/{companyId}/pro-labore-plans", { params: { path: { companyId } } })),
  });
}

function useWithdrawalMutation<TInput, TResult>(fn: (input: TInput) => Promise<TResult>) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate("withdrawal") });
}

export function useCreateWithdrawal(companyId: number) {
  return useWithdrawalMutation((body: WithdrawalInput) =>
    unwrap(api.POST("/companies/{companyId}/withdrawals", { params: { path: { companyId } }, body })),
  );
}

export function useUpdateWithdrawal(companyId: number) {
  return useWithdrawalMutation(({ withdrawalId, body }: { withdrawalId: number; body: WithdrawalInput }) =>
    unwrap(api.PUT("/companies/{companyId}/withdrawals/{withdrawalId}", { params: { path: { companyId, withdrawalId } }, body })),
  );
}

/** Com deletePersonal, o lançamento nas finanças pessoais vai junto; sem, ele fica, só perde a ligação. */
export function useDeleteWithdrawal(companyId: number) {
  return useWithdrawalMutation(({ withdrawalId, deletePersonal }: { withdrawalId: number; deletePersonal: boolean }) =>
    expectNoContent(
      api.DELETE("/companies/{companyId}/withdrawals/{withdrawalId}", {
        params: { path: { companyId, withdrawalId }, query: { deletePersonal } },
      }),
    ),
  );
}

/** Lança o líquido como receita nas finanças pessoais; sem categoria, a padrão ("Pró-labore" ou "Lucros distribuídos"). */
export function useLaunchWithdrawal(companyId: number) {
  return useWithdrawalMutation(({ withdrawalId, categoryId }: { withdrawalId: number; categoryId?: number }) =>
    unwrap(
      api.POST("/companies/{companyId}/withdrawals/{withdrawalId}/personal-transaction", {
        params: { path: { companyId, withdrawalId } },
        body: categoryId === undefined ? undefined : { categoryId },
      }),
    ),
  );
}

export function useSetProLaborePlan(companyId: number) {
  return useWithdrawalMutation(({ partnerId, grossAmount }: { partnerId: number; grossAmount: number }) =>
    unwrap(
      api.PUT("/companies/{companyId}/partners/{partnerId}/pro-labore-plan", {
        params: { path: { companyId, partnerId } },
        body: { grossAmount },
      }),
    ),
  );
}

export function useRemoveProLaborePlan(companyId: number) {
  return useWithdrawalMutation((partnerId: number) =>
    expectNoContent(
      api.DELETE("/companies/{companyId}/partners/{partnerId}/pro-labore-plan", { params: { path: { companyId, partnerId } } }),
    ),
  );
}
