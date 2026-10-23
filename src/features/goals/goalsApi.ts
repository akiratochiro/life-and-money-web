import { useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import { unwrap } from "../../shared/api/problem";
import type { components } from "../../shared/api/schema";

export type Goal = components["schemas"]["SavingsGoalResponse"];

export function useGoals() {
  return useQuery({
    queryKey: ["goals"],
    queryFn: () => unwrap(api.GET("/goals")),
  });
}