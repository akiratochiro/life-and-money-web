import type { TaxCalculation, TaxOccurrence } from "./taxesApi";

const percent = new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** Alíquotas vêm como fração (0,0201): na tela, "2,01%". */
export function formatRate(rate: number): string {
  return percent.format(rate);
}

/** "10/2026", ou o ano para as declarações anuais, cuja competência é o ano inteiro. */
export function competenceLabel(occurrence: Pick<TaxOccurrence, "kind" | "competence">): string {
  const [year, month] = occurrence.competence.split("-");
  if (occurrence.kind === "DEFIS" || occurrence.kind === "DASN_SIMEI") return `ano de ${year}`;
  return `${month}/${year}`;
}

function monthYear(month: string): string {
  const [year, monthNumber] = month.split("-");
  return `${monthNumber}/${year}`;
}

/** Como o RBT12 saiu, em uma frase: é a parte da conta que mais confunde. */
export function rbt12Explanation(simples: NonNullable<TaxCalculation["simples"]>): string {
  switch (simples.rbt12Method) {
    case "FIRST_MONTH":
      return "Primeiro mês de atividade: a receita do próprio mês × 12.";
    case "PROPORTIONAL":
      return `Menos de 12 meses de atividade: a média de ${monthYear(simples.windowFrom)} a ${monthYear(simples.windowTo)} × 12.`;
    default:
      return `A receita de ${monthYear(simples.windowFrom)} a ${monthYear(simples.windowTo)}.`;
  }
}
