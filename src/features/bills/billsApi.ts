import { useMutation, useQuery } from "@tanstack/react-query";
import { useInvalidate } from "../../shared/api/invalidation";
import { api } from "../../shared/api/client";
import { expectNoContent, unwrap } from "../../shared/api/problem";
import type { components } from "../../shared/api/schema";

export type Bill = components["schemas"]["ScheduledBillResponse"];
export type BillInput = components["schemas"]["CreateBillRequest"];
export type BillUpdate = components["schemas"]["UpdateBillRequest"];
export type BillOccurrence = components["schemas"]["BillOccurrenceResponse"];
export type BillStatus = BillOccurrence["status"];
export type BillRecurrence = Bill["recurrence"];
export type PayBillInput = components["schemas"]["PayBillRequest"];

export function useBills() {
  return useQuery({
    queryKey: ["bills", "list"],
    queryFn: () => unwrap(api.GET("/bills")),
  });
}

export function useBillOccurrences(month: string) {
  return useQuery({
    queryKey: ["bills", "occurrences", month],
    queryFn: () => unwrap(api.GET("/bills/occurrences", { params: { query: { month } } })),
  });
}

/** Atrasadas e o que vence nos próximos 7 dias, sem as pagas: o card da Início. */
export function useUpcomingBills() {
  return useQuery({
    queryKey: ["bills", "upcoming"],
    queryFn: () => unwrap(api.GET("/bills/upcoming")),
  });
}

// O que cada mudança deixa desatualizado está em shared/api/invalidation.ts.
function useInvalidateBills() {
  const invalidate = useInvalidate();
  return () => invalidate("bill");
}

function useInvalidateBillsAndMoney() {
  const invalidate = useInvalidate();
  return () => invalidate("billPayment");
}

export function useCreateBill() {
  const invalidate = useInvalidateBills();
  return useMutation({
    mutationFn: (body: BillInput) => unwrap(api.POST("/bills", { body })),
    onSuccess: invalidate,
  });
}

export function useUpdateBill() {
  const invalidate = useInvalidateBills();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: BillUpdate }) =>
      unwrap(api.PUT("/bills/{id}", { params: { path: { id } }, body })),
    onSuccess: invalidate,
  });
}

export function useRemoveBill() {
  const invalidate = useInvalidateBills();
  return useMutation({
    mutationFn: (id: number) => expectNoContent(api.DELETE("/bills/{id}", { params: { path: { id } } })),
    onSuccess: invalidate,
  });
}

export function usePayBill() {
  const invalidate = useInvalidateBillsAndMoney();
  return useMutation({
    mutationFn: ({ billId, month, body }: { billId: number; month: string; body: PayBillInput }) =>
      unwrap(
        api.POST("/bills/{id}/occurrences/{month}/payment", { params: { path: { id: billId, month } }, body }),
      ),
    onSuccess: invalidate,
  });
}

export function useUndoBillPayment() {
  const invalidate = useInvalidateBillsAndMoney();
  return useMutation({
    mutationFn: ({ billId, month }: { billId: number; month: string }) =>
      expectNoContent(
        api.DELETE("/bills/{id}/occurrences/{month}/payment", { params: { path: { id: billId, month } } }),
      ),
    onSuccess: invalidate,
  });
}
