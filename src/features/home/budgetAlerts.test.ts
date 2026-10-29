import { describe, expect, it } from "vitest";
import type { BudgetLine, BudgetStatus } from "../budget/budgetApi";
import { bySeverity, isAlert } from "./budgetAlerts";

function line(categoryName: string, status: BudgetStatus, usedPercentage?: number): BudgetLine {
  return {
    categoryId: 1,
    categoryName,
    categoryType: "EXPENSE",
    mode: "AMOUNT",
    limitValue: 100,
    effectiveLimit: 100,
    spent: usedPercentage ?? 0,
    remaining: 100 - (usedPercentage ?? 0),
    usedPercentage,
    status,
  };
}

// É exatamente o que a seção "Precisa da sua atenção" faz com as linhas do orçamento.
const attention = (lines: BudgetLine[]) => lines.filter(isAlert).sort(bySeverity).map((l) => l.categoryName);

describe("isAlert", () => {
  it("só marca as linhas em alerta ou estouradas", () => {
    expect(isAlert(line("Mercado", "EXCEEDED", 120))).toBe(true);
    expect(isAlert(line("Mercado", "WARNING", 85))).toBe(true);
    expect(isAlert(line("Mercado", "OK", 40))).toBe(false);
  });
});

describe("bySeverity", () => {
  it("põe as estouradas antes das em alerta, mesmo com percentual menor", () => {
    const lines = [line("Lazer", "WARNING", 95), line("Mercado", "EXCEEDED", 101)];

    expect(attention(lines)).toEqual(["Mercado", "Lazer"]);
  });

  it("dentro do mesmo status, ordena do mais usado para o menos usado", () => {
    const lines = [
      line("Lazer", "EXCEEDED", 110),
      line("Mercado", "EXCEEDED", 150),
      line("Farmácia", "WARNING", 80),
      line("Transporte", "WARNING", 90),
    ];

    expect(attention(lines)).toEqual(["Mercado", "Lazer", "Transporte", "Farmácia"]);
  });

  it("põe primeiro a linha sem percentual, que é a de limite zero com gasto", () => {
    const lines = [line("Mercado", "EXCEEDED", 300), line("Presentes", "EXCEEDED")];

    expect(attention(lines)).toEqual(["Presentes", "Mercado"]);
  });

  it("deixa de fora as linhas que estão dentro do limite", () => {
    const lines = [line("Mercado", "OK", 99), line("Lazer", "WARNING", 85)];

    expect(attention(lines)).toEqual(["Lazer"]);
  });
});
