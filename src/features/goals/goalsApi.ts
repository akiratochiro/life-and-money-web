import { api } from "../../shared/api/client";
import { unwrap } from "../../shared/api/problem";
import type { components } from "../../shared/api/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useInvalidate } from "../../shared/api/invalidation";


export type Goal = components["schemas"]["SavingsGoalResponse"];
export type GoalInput = components["schemas"]["SavingsGoalRequest"];


export function useGoals() {
  return useQuery({
    queryKey: ["goals"],
    queryFn: () => unwrap(api.GET("/goals")),
  });
}


function useInvalidateGoals() {
  const invalidate = useInvalidate();
  return () => invalidate("goal");
}

export function useCreateGoal() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: (body: GoalInput) => unwrap(api.POST("/goals", { body })),
    onSuccess: invalidate,
  });
}

export function useUpdateGoal() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: GoalInput }) =>
      unwrap(api.PUT("/goals/{id}", { params: { path: { id } }, body })),
    onSuccess: invalidate,
  });
}

export function useDeleteGoal() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: (id: number) => unwrap(api.DELETE("/goals/{id}", { params: { path: { id } } })),
    onSuccess: invalidate,
  });
}