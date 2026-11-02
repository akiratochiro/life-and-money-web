import { api } from "../../shared/api/client";
import { ApiError, unwrap } from "../../shared/api/problem";
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

/** O 409 da API é o nome repetido; o resto já vem explicado no ProblemDetail. */
export function categoryErrorMessage(error: Error | null): string | undefined {
  if (error instanceof ApiError && error.status === 409) {
    return "Já existe uma categoria ativa com esse nome e esse tipo.";
  }
  return error?.message;
}

/**
 * A categoria criada entra nas listas do cache assim que o servidor responde, na ordem por nome
 * que a API usa. Assim quem a criou (o "+" da nova transação) já pode mostrá-la selecionada, sem
 * esperar a lista ser buscada de novo; a busca vem logo depois e confirma.
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (body: NewCategory) => unwrap(api.POST("/categories", { body })),
    onSuccess: (created) => {
      queryClient.setQueriesData<Category[]>({ queryKey: ["categories"] }, (list) =>
        list ? insertByName(list, created) : list,
      );
      return invalidate();
    },
  });
}

export function insertByName(list: Category[], category: Category): Category[] {
  if (list.some((item) => item.id === category.id)) return list;
  return [...list, category].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export type CategoryUpdate = components["schemas"]["UpdateCategoryRequest"];

/** Edição parcial: nome, cor e ícone; o que não vier no corpo fica como está. */
export function useUpdateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: CategoryUpdate }) =>
      unwrap(api.PATCH("/categories/{id}", { params: { path: { id } }, body })),
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