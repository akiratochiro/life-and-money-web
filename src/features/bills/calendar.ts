import type { BillOccurrence, BillStatus } from "./billsApi";

export type MonthGrid = {
  /** Quantas casas vazias vêm antes do dia 1, com a semana começando no domingo. */
  leadingBlanks: number;
  /** Os dias do mês em "AAAA-MM-DD". */
  days: string[];
  /** Quantas linhas a grade ocupa: de 4 (fevereiro começando no domingo) a 6. */
  weeks: number;
};

/**
 * Monta a grade de um mês "AAAA-MM". Só usa o construtor local de Date (ano, mês, dia), que não
 * passa por UTC: `new Date("2026-02-28")` seria lido como meia-noite em UTC e, no Brasil, cairia
 * no dia 27.
 */
export function monthGrid(month: string): MonthGrid {
  const [year, monthNumber] = month.split("-").map(Number);
  const leadingBlanks = new Date(year, monthNumber - 1, 1).getDay();
  const length = new Date(year, monthNumber, 0).getDate();
  const days = Array.from({ length }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`);
  return { leadingBlanks, days, weeks: Math.ceil((leadingBlanks + length) / 7) };
}

/** As ocorrências agrupadas pelo dia de vencimento. */
export function byDueDate(occurrences: BillOccurrence[]): Map<string, BillOccurrence[]> {
  const days = new Map<string, BillOccurrence[]>();
  for (const occurrence of occurrences) {
    days.set(occurrence.dueDate, [...(days.get(occurrence.dueDate) ?? []), occurrence]);
  }
  return days;
}

export type DaySummary = Record<BillStatus, number>;

export function summarize(occurrences: BillOccurrence[]): DaySummary {
  const summary: DaySummary = { OVERDUE: 0, PENDING: 0, PAID: 0 };
  for (const occurrence of occurrences) {
    summary[occurrence.status] += 1;
  }
  return summary;
}

const STATUS_WORDS: Record<BillStatus, [string, string]> = {
  OVERDUE: ["atrasada", "atrasadas"],
  PENDING: ["pendente", "pendentes"],
  PAID: ["paga", "pagas"],
};

/** O texto que um leitor de tela lê para o dia: "15 de novembro: 1 atrasada, 2 pendentes". */
export function dayLabel(isoDate: string, summary: DaySummary): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(
    new Date(year, month - 1, day),
  );
  const parts = (["OVERDUE", "PENDING", "PAID"] as const)
    .filter((status) => summary[status] > 0)
    .map((status) => `${summary[status]} ${STATUS_WORDS[status][summary[status] === 1 ? 0 : 1]}`);
  return parts.length === 0 ? date : `${date}: ${parts.join(", ")}`;
}

/** Atrasadas primeiro, depois pela data de vencimento. */
export function byUrgency(a: BillOccurrence, b: BillOccurrence): number {
  const overdue = Number(b.status === "OVERDUE") - Number(a.status === "OVERDUE");
  return overdue !== 0 ? overdue : a.dueDate.localeCompare(b.dueDate);
}
