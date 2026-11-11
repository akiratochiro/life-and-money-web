import { describe, expect, it } from "vitest";
import { competenceLabel, formatRate, rbt12Explanation } from "./taxFormat";

const simples = {
  revenue: 10000, revenueWithIssWithheld: 0, rbt12: 120000, annex: "III" as const, bracket: 1,
  nominalRate: 0.06, deduction: 0, effectiveRate: 0.06, issRate: 0.0201,
};

describe("formatação dos impostos", () => {
  it("alíquota em porcentagem com até duas casas", () => {
    expect(formatRate(0.0201)).toBe("2,01%");
    expect(formatRate(0.06)).toBe("6%");
  });

  it("a competência das declarações anuais é o ano", () => {
    expect(competenceLabel({ kind: "DAS", competence: "2026-10" })).toBe("10/2026");
    expect(competenceLabel({ kind: "DEFIS", competence: "2026-01" })).toBe("ano de 2026");
  });

  it("explica o RBT12 de cada jeito", () => {
    expect(rbt12Explanation({ ...simples, rbt12Method: "FIRST_MONTH", windowFrom: "2026-10", windowTo: "2026-10" }))
      .toBe("Primeiro mês de atividade: a receita do próprio mês × 12.");
    expect(rbt12Explanation({ ...simples, rbt12Method: "PROPORTIONAL", windowFrom: "2026-03", windowTo: "2026-09" }))
      .toBe("Menos de 12 meses de atividade: a média de 03/2026 a 09/2026 × 12.");
    expect(rbt12Explanation({ ...simples, rbt12Method: "TWELVE_MONTHS", windowFrom: "2025-10", windowTo: "2026-09" }))
      .toBe("A receita de 10/2025 a 09/2026.");
  });
});
