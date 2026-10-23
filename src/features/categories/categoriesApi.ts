import { useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import { unwrap } from "../../shared/api/problem";
import type { components } from "../../shared/api/schema";

export type Category = components["schemas"]["CategoryResponse"];
export type CategoryType = NonNullable<Category["type"]>;

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => unwrap(api.GET("/categories")),
  });
}