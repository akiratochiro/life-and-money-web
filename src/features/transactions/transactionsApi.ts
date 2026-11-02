import { useMutation, useQuery } from "@tanstack/react-query";
import { useInvalidate } from "../../shared/api/invalidation";
import { api } from "../../shared/api/client";
import { expectNoContent, unwrap } from "../../shared/api/problem";
import type { components } from "../../shared/api/schema";

export type Transaction = components["schemas"]["TransactionResponse"];
export type TransactionInput = components["schemas"]["TransactionRequest"];

export function useTransactions(month: string) {
  return useQuery({
    queryKey: ["transactions", month],
    queryFn: () => unwrap(api.GET("/transactions", { params: { query: { month } } })),
  });
}

// O que uma transação deixa desatualizado está em shared/api/invalidation.ts ("transaction").
function useInvalidateMoneyData() {
  const invalidate = useInvalidate();
  return () => invalidate("transaction");
}

export function useCreateTransaction() {
  const invalidate = useInvalidateMoneyData();
  return useMutation({
    mutationFn: (body: TransactionInput) => unwrap(api.POST("/transactions", { body })),
    onSuccess: invalidate,
  });
}

export function useUpdateTransaction() {
  const invalidate = useInvalidateMoneyData();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: TransactionInput }) =>
      unwrap(api.PUT("/transactions/{id}", { params: { path: { id } }, body })),
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateMoneyData();
  return useMutation({
    mutationFn: (id: number) => expectNoContent(api.DELETE("/transactions/{id}", { params: { path: { id } } })),
    onSuccess: invalidate,
  });
}