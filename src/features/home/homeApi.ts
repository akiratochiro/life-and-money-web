import { useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import { unwrap } from "../../shared/api/problem";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(api.GET("/users/me")),
  });
}

export function useMonthTotals() {
  return useQuery({
    queryKey: ["dashboard", "monthly-totals", 1],
    queryFn: () => unwrap(api.GET("/dashboard/monthly-totals", { params: { query: { months: 1 } } })),
  });
}

