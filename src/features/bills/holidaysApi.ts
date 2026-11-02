import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import { unwrap } from "../../shared/api/problem";
import type { components } from "../../shared/api/schema";

export type Holiday = components["schemas"]["Holiday"];
export type HolidaysResponse = components["schemas"]["HolidaysResponse"];

/**
 * Os feriados de um ano nunca mudam, então, uma vez carregados, ficam frescos para sempre. Se a
 * BrasilAPI estava fora do ar (available=false), a resposta vale só um minuto, para tentar de novo.
 */
export function holidaysQuery(year: number) {
  return queryOptions({
    queryKey: ["holidays", year],
    queryFn: () => unwrap(api.GET("/holidays", { params: { query: { year } } })),
    staleTime: (query) => (query.state.data?.available ? Infinity : 60_000),
  });
}

export function useHolidays(year: number) {
  return useQuery(holidaysQuery(year));
}

/** Feriados por data; um dia com dois nomes (raro) mostra os dois. */
export function holidaysByDate(holidays: Holiday[]): Map<string, string> {
  const byDate = new Map<string, string>();
  for (const holiday of holidays) {
    const current = byDate.get(holiday.date);
    byDate.set(holiday.date, current ? `${current} e ${holiday.name}` : holiday.name);
  }
  return byDate;
}
