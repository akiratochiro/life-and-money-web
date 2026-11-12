import type { BillOccurrence } from "./billsApi";

// A grade e os rótulos do mês moram em shared (decisão 32): o calendário fiscal usa os mesmos.
export { byDueDate, dayLabel, monthGrid, summarize, type DaySummary, type MonthGrid } from "../../shared/lib/monthCalendar";

/** Atrasadas primeiro, depois pela data de vencimento. */
export function byUrgency(a: BillOccurrence, b: BillOccurrence): number {
  const overdue = Number(b.status === "OVERDUE") - Number(a.status === "OVERDUE");
  return overdue !== 0 ? overdue : a.dueDate.localeCompare(b.dueDate);
}
