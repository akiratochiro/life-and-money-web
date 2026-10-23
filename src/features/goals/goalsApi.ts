import { api } from "../../shared/api/client";
import { unwrap } from "../../shared/api/problem";
import type { components } from "../../shared/api/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";


export type Goal = components["schemas"]["SavingsGoalResponse"];
export type GoalInput = components["schemas"]["SavingsGoalRequest"];


export function useGoals() {
  return useQuery({
    queryKey: ["goals"],
    queryFn: () => unwrap(api.GET("/goals")),
  });
}


function useInvalidateGoals() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["goals"] }),
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
    ]);
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