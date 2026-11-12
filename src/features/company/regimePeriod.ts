import type { CompanyRegime } from "./companyApi";
import { currentMonth, monthLabel } from "../../shared/lib/dates";

/**
 * Como cada vigência aparece no histórico: "Desde março de 2024", "De março de 2024 a fevereiro
 * de 2025" ou, para uma mudança agendada, "A partir de janeiro de 2027".
 */
export function regimePeriod(regime: Pick<CompanyRegime, "validFrom" | "validTo">, today = new Date()): string {
  const from = monthLabel(regime.validFrom).toLowerCase();
  if (regime.validFrom > currentMonth(today)) return `A partir de ${from} (agendada)`;
  if (!regime.validTo) return `Desde ${from}`;
  return `De ${from} a ${monthLabel(regime.validTo).toLowerCase()}`;
}

export type RegimeStatus = "CURRENT" | "SCHEDULED" | "PAST";

/** Onde cada vigência fica na linha do tempo: a que vale neste mês, uma agendada ou uma que já passou. */
export function regimeStatus(regime: Pick<CompanyRegime, "validFrom" | "validTo">, today = new Date()): RegimeStatus {
  const now = currentMonth(today);
  if (regime.validFrom > now) return "SCHEDULED";
  if (regime.validTo && regime.validTo < now) return "PAST";
  return "CURRENT";
}

/** Quantos meses uma vigência encerrada durou, contando o primeiro e o último ("março a maio" são 3). */
export function regimeMonths(regime: Pick<CompanyRegime, "validFrom" | "validTo">): number | null {
  if (!regime.validTo) return null;
  const [fromYear, fromMonth] = regime.validFrom.split("-").map(Number);
  const [toYear, toMonth] = regime.validTo.split("-").map(Number);
  return (toYear - fromYear) * 12 + (toMonth - fromMonth) + 1;
}
