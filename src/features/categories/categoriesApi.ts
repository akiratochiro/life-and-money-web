import { api } from "../../shared/api/client";
import { unwrap } from "../../shared/api/problem";
import type { components } from "../../shared/api/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidate, useInvalidate } from "../../shared/api/invalidation";
import { useToast } from "../../shared/toast/toastContext";

export type Category = components["schemas"]["CategoryResponse"];
export type CategoryType = Category["type"];
export type NewCategory = components["schemas"]["CreateCategoryRequest"];

export function useCategories(includeArchived = false) {
  return useQuery({
    queryKey: ["categories", { includeArchived }],
    queryFn: () => unwrap(api.GET("/categories", { params: { query: { includeArchived } } })),
  });
}
function useInvalidateCategories() {
  const invalidate = useInvalidate();
  return () => invalidate("category");
}

export function useCreateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (body: NewCategory) => unwrap(api.POST("/categories", { body })),
    onSuccess: invalidate,
  });
}

export function useRenameCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      unwrap(api.PATCH("/categories/{id}", { params: { path: { id } }, body: { name } })),
    onSuccess: invalidate,
  });
}

/**
 * Otimista: a categoria sai das ativas e entra nas arquivadas antes da resposta. Se o servidor
 * recusar, todas as listas de categorias voltam ao que eram e um aviso diz o motivo.
 */
export function useArchiveCategory() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: number) => unwrap(api.POST("/categories/{id}/archive", { params: { path: { id } } })),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["categories"] });
      const snapshot = queryClient.getQueriesData<Category[]>({ queryKey: ["categories"] });
      for (const [key, list] of snapshot) {
        if (!list) continue;
        const includeArchived = (key[1] as { includeArchived?: boolean } | undefined)?.includeArchived;
        queryClient.setQueryData<Category[]>(key, archiveIn(list, id, includeArchived === true));
      }
      return snapshot;
    },
    onError: (error, _id, snapshot) => {
      snapshot?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.show(`Não foi possível arquivar a categoria. ${error.message}`, "error");
    },
    onSettled: () => invalidate(queryClient, "category"),
  });
}

/** A lista com arquivadas marca a categoria; a lista só de ativas a perde. */
export function archiveIn(list: Category[], id: number, includeArchived: boolean): Category[] {
  return includeArchived
    ? list.map((category) => (category.id === id ? { ...category, archived: true } : category))
    : list.filter((category) => category.id !== id);
}