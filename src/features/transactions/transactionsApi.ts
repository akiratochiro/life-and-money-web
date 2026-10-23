import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import { unwrap } from "../../shared/api/problem";
import type { components } from "../../shared/api/schema";

export type TransactionInput = components["schemas"]["TransactionRequest"];

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: TransactionInput) => unwrap(api.POST("/transactions", { body })),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["goals"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      ]),
  });
}