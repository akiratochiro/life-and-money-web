import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import { unwrap } from "../../shared/api/problem";
import type { components } from "../../shared/api/schema";
import { monthGrid } from "../../shared/lib/monthCalendar";

export type CalendarEvent = components["schemas"]["CalendarEvent"];
export type CalendarScope = "ALL" | "PF" | "PJ";

/**
 * Os vencimentos do mês (decisão 32). A família "calendar" é recarregada por toda mudança que mexe num
 * status: contas, pagamentos, notas, impostos, despesas e retiradas.
 */
export function calendarQuery(month: string, scope: CalendarScope, companyId?: number) {
  const days = monthGrid(month).days;
  return queryOptions({
    queryKey: ["calendar", "events", month, scope, companyId ?? null],
    queryFn: () =>
      unwrap(api.GET("/calendar", {
        params: { query: { from: days[0], to: days[days.length - 1], scope, ...(companyId ? { companyId } : {}) } },
      })),
  });
}

export function useCalendar(month: string, scope: CalendarScope, companyId?: number) {
  return useQuery(calendarQuery(month, scope, companyId));
}

/** O que pede atenção: atrasados e próximos 7 dias. O menu mostra o total. */
export function useReminders(scope: CalendarScope = "ALL", companyId?: number) {
  return useQuery({
    queryKey: ["calendar", "reminders", scope, companyId ?? null],
    queryFn: () =>
      unwrap(api.GET("/calendar/reminders", { params: { query: { scope, ...(companyId ? { companyId } : {}) } } })),
  });
}
