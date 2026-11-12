/** Os três status de um vencimento: contas pessoais, impostos e despesas usam os mesmos. */
export type DueStatus = "OVERDUE" | "PENDING" | "PAID";

/** O que o calendário do mês precisa de cada item: o dia e o status. */
export type DueItem = { dueDate: string; status: DueStatus };

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
export function byDueDate<T extends DueItem>(occurrences: T[]): Map<string, T[]> {
  const days = new Map<string, T[]>();
  for (const occurrence of occurrences) {
    days.set(occurrence.dueDate, [...(days.get(occurrence.dueDate) ?? []), occurrence]);
  }
  return days;
}

export type DaySummary = Record<DueStatus, number>;

export function summarize(occurrences: DueItem[]): DaySummary {
  const summary: DaySummary = { OVERDUE: 0, PENDING: 0, PAID: 0 };
  for (const occurrence of occurrences) {
    summary[occurrence.status] += 1;
  }
  return summary;
}

/** Singular e plural de cada status. O padrão é o das contas ("1 paga"); o calendário fiscal usa o masculino. */
export type StatusWords = Record<DueStatus, [string, string]>;

export const BILL_WORDS: StatusWords = {
  OVERDUE: ["atrasada", "atrasadas"],
  PENDING: ["pendente", "pendentes"],
  PAID: ["paga", "pagas"],
};

export const DUE_WORDS: StatusWords = {
  OVERDUE: ["atrasado", "atrasados"],
  PENDING: ["pendente", "pendentes"],
  PAID: ["pago", "pagos"],
};

/**
 * O texto que um leitor de tela lê para o dia: "15 de novembro, feriado: Proclamação da
 * República: 1 pendente".
 */
export function dayLabel(isoDate: string, summary: DaySummary, holiday?: string, words: StatusWords = BILL_WORDS): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(
    new Date(year, month - 1, day),
  );
  const head = holiday ? `${date}, feriado: ${holiday}` : date;
  const parts = (["OVERDUE", "PENDING", "PAID"] as const)
    .filter((status) => summary[status] > 0)
    .map((status) => `${summary[status]} ${words[status][summary[status] === 1 ? 0 : 1]}`);
  return parts.length === 0 ? head : `${head}: ${parts.join(", ")}`;
}
