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
