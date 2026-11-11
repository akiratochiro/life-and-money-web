import type { Obligation } from "./taxesApi";

type TaxRegime = "SIMEI" | "SIMPLES_NACIONAL" | "LUCRO_PRESUMIDO" | "LUCRO_REAL";

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export const RULES = {
  POSTPONE: "Adia para o próximo dia útil",
  ANTICIPATE: "Antecipa para o dia útil anterior",
  NONE: "Mantém a data",
} as const;

export const RECURRENCES = { MONTHLY: "Todo mês", YEARLY: "Todo ano", ONCE: "Uma vez só" } as const;

export function monthName(month: number): string {
  return MONTHS[month - 1];
}

/** "Dia 20 do mês seguinte à competência", "31 de março", "Dia 10, todo mês". */
export function scheduleOf(obligation: Obligation): string {
  if (obligation.recurrence === "YEARLY") return `${obligation.dueDay} de ${monthName(obligation.dueMonth!)}, todo ano`;
  if (obligation.system) return `Dia ${obligation.dueDay} do mês seguinte à competência`;
  if (obligation.recurrence === "ONCE") return `Dia ${obligation.dueDay}, uma vez só`;
  return `Dia ${obligation.dueDay}, todo mês`;
}

/** As do sistema valem conforme o regime de cada mês; as personalizadas, sempre. Espelha o ObligationKind da API. */
export function appliesTo(obligation: Pick<Obligation, "kind">, regime: TaxRegime | undefined): boolean {
  switch (obligation.kind) {
    case "DAS":
    case "DARF_PREVIDENCIARIO":
    case "DEFIS":
      return regime === "SIMPLES_NACIONAL";
    case "DAS_MEI":
    case "DASN_SIMEI":
      return regime === "SIMEI";
    default:
      return true;
  }
}
