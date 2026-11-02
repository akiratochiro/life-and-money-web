import { api } from "../../shared/api/client";
import { unwrap } from "../../shared/api/problem";
import type { components } from "../../shared/api/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useInvalidate } from "../../shared/api/invalidation";

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

export function useArchiveCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (id: number) => unwrap(api.POST("/categories/{id}/archive", { params: { path: { id } } })),
    onSuccess: invalidate,
  });
}