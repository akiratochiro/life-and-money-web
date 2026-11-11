import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import { ApiError, expectNoContent, unwrap } from "../../shared/api/problem";
import type { components } from "../../shared/api/schema";
import { useInvalidate } from "../../shared/api/invalidation";
import { filenameFromDisposition, saveBlob } from "../../shared/lib/download";

export type ExpenseCategory = components["schemas"]["ExpenseCategoryResponse"];
export type ExpenseMonth = components["schemas"]["ExpenseMonthResponse"];
export type ExpenseItem = ExpenseMonth["items"][number];
export type OneOffExpense = components["schemas"]["OneOffExpenseRequest"];
export type RecurringExpense = components["schemas"]["RecurringExpenseResponse"];
export type RecurringExpenseInput = components["schemas"]["RecurringExpenseRequest"];
export type ExpenseCategoryInput = components["schemas"]["ExpenseCategoryRequest"];
export type ExpenseCategoryUpdate = components["schemas"]["UpdateExpenseCategoryRequest"];

/** Tudo debaixo da chave da empresa: arquivar a empresa recarrega as despesas também. */
export function expenseMonthQuery(companyId: number, month: string) {
  return queryOptions({
    queryKey: ["companies", companyId, "expenses", month],
    queryFn: () => unwrap(api.GET("/companies/{companyId}/expenses", { params: { path: { companyId }, query: { month } } })),
  });
}

export function useExpenseMonth(companyId: number, month: string) {
  return useQuery(expenseMonthQuery(companyId, month));
}

export function useExpenseCategories(companyId: number, includeArchived = false) {
  return useQuery({
    queryKey: ["companies", companyId, "expense-categories", { includeArchived }],
    queryFn: () =>
      unwrap(api.GET("/companies/{companyId}/expense-categories", { params: { path: { companyId }, query: { includeArchived } } })),
  });
}

export function useRecurringExpenses(companyId: number) {
  return useQuery({
    queryKey: ["companies", companyId, "recurring-expenses"],
    queryFn: () => unwrap(api.GET("/companies/{companyId}/recurring-expenses", { params: { path: { companyId } } })),
  });
}

function useExpenseMutation<TInput, TResult>(fn: (input: TInput) => Promise<TResult>) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidate("companyExpense") });
}

export function useCreateOneOff(companyId: number) {
  return useExpenseMutation((body: OneOffExpense) =>
    unwrap(api.POST("/companies/{companyId}/expenses", { params: { path: { companyId } }, body })),
  );
}

export function useUpdateExpense(companyId: number) {
  return useExpenseMutation(({ expenseId, body }: { expenseId: number; body: OneOffExpense }) =>
    unwrap(api.PUT("/companies/{companyId}/expenses/{expenseId}", { params: { path: { companyId, expenseId } }, body })),
  );
}

export function useDeleteExpense(companyId: number) {
  return useExpenseMutation((expenseId: number) =>
    expectNoContent(api.DELETE("/companies/{companyId}/expenses/{expenseId}", { params: { path: { companyId, expenseId } } })),
  );
}

/** Multipart como nas notas: o arquivo vai no FormData, e o corpo tipado é só um marcador. */
export function useAttachReceipt(companyId: number) {
  return useExpenseMutation(({ expenseId, file }: { expenseId: number; file: File }) => {
    const form = new FormData();
    form.append("file", file);
    return unwrap(
      api.PUT("/companies/{companyId}/expenses/{expenseId}/receipt", {
        params: { path: { companyId, expenseId } },
        body: { file: "" },
        bodySerializer: () => form,
      }),
    );
  });
}

export function useRemoveReceipt(companyId: number) {
  return useExpenseMutation((expenseId: number) =>
    expectNoContent(
      api.DELETE("/companies/{companyId}/expenses/{expenseId}/receipt", { params: { path: { companyId, expenseId } } }),
    ),
  );
}

export async function downloadReceipt(companyId: number, expenseId: number): Promise<void> {
  const result = await api.GET("/companies/{companyId}/expenses/{expenseId}/receipt", {
    params: { path: { companyId, expenseId } },
    parseAs: "blob",
  });
  if (result.data === undefined) throw new ApiError(result.response.status, result.error);
  saveBlob(result.data as Blob, filenameFromDisposition(result.response.headers.get("Content-Disposition")) ?? "comprovante");
}

export function useCreateRecurring(companyId: number) {
  return useExpenseMutation((body: RecurringExpenseInput) =>
    unwrap(api.POST("/companies/{companyId}/recurring-expenses", { params: { path: { companyId } }, body })),
  );
}

export function useUpdateRecurring(companyId: number) {
  return useExpenseMutation(({ recurringId, body }: { recurringId: number; body: RecurringExpenseInput }) =>
    unwrap(
      api.PUT("/companies/{companyId}/recurring-expenses/{recurringId}", { params: { path: { companyId, recurringId } }, body }),
    ),
  );
}

export function useDeleteRecurring(companyId: number) {
  return useExpenseMutation((recurringId: number) =>
    expectNoContent(
      api.DELETE("/companies/{companyId}/recurring-expenses/{recurringId}", { params: { path: { companyId, recurringId } } }),
    ),
  );
}

export function usePayRecurring(companyId: number) {
  return useExpenseMutation(
    ({ recurringId, month, amount, date }: { recurringId: number; month: string; amount?: number; date?: string }) =>
      unwrap(
        api.POST("/companies/{companyId}/recurring-expenses/{recurringId}/occurrences/{month}/payment", {
          params: { path: { companyId, recurringId, month } },
          body: { amount, date },
        }),
      ),
  );
}

export function useUnpayRecurring(companyId: number) {
  return useExpenseMutation(({ recurringId, month }: { recurringId: number; month: string }) =>
    expectNoContent(
      api.DELETE("/companies/{companyId}/recurring-expenses/{recurringId}/occurrences/{month}/payment", {
        params: { path: { companyId, recurringId, month } },
      }),
    ),
  );
}

export function useCreateExpenseCategory(companyId: number) {
  return useExpenseMutation((body: ExpenseCategoryInput) =>
    unwrap(api.POST("/companies/{companyId}/expense-categories", { params: { path: { companyId } }, body })),
  );
}

export function useUpdateExpenseCategory(companyId: number) {
  return useExpenseMutation(({ categoryId, body }: { categoryId: number; body: ExpenseCategoryUpdate }) =>
    unwrap(
      api.PATCH("/companies/{companyId}/expense-categories/{categoryId}", { params: { path: { companyId, categoryId } }, body }),
    ),
  );
}

export function useArchiveExpenseCategory(companyId: number) {
  return useExpenseMutation((categoryId: number) =>
    unwrap(
      api.POST("/companies/{companyId}/expense-categories/{categoryId}/archive", { params: { path: { companyId, categoryId } } }),
    ),
  );
}
