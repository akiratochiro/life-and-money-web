import { describe, expect, it } from "vitest";
import { byDueDate, byUrgency, dayLabel, monthGrid, summarize } from "./calendar";
import type { BillOccurrence } from "./billsApi";

function occurrence(overrides: Partial<BillOccurrence>): BillOccurrence {
  return {
    billId: 1,
    month: "2026-11",
    dueDate: "2026-11-10",
    name: "Aluguel",
    categoryId: 1,
    type: "EXPENSE",
    recurrence: "MONTHLY",
    expectedAmount: 1500,
    status: "PENDING",
    ...overrides,
  };
}

describe("monthGrid", () => {
  it("fevereiro de 2026 começa num domingo e ocupa exatamente 4 linhas", () => {
    const grid = monthGrid("2026-02");

    expect(grid.leadingBlanks).toBe(0);
    expect(grid.days).toHaveLength(28);
    expect(grid.weeks).toBe(4);
  });

  it("agosto de 2026 começa num sábado e ocupa 6 linhas", () => {
    const grid = monthGrid("2026-08");

    expect(grid.leadingBlanks).toBe(6);
    expect(grid.days).toHaveLength(31);
    expect(grid.weeks).toBe(6);
  });

  it("fevereiro de 2028, bissexto, tem 29 dias", () => {
    const grid = monthGrid("2028-02");

    expect(grid.leadingBlanks).toBe(2); // terça-feira
    expect(grid.days.at(-1)).toBe("2028-02-29");
  });

  it("meses de 30 dias terminam no dia 30", () => {
    expect(monthGrid("2026-04").days.at(-1)).toBe("2026-04-30");
    expect(monthGrid("2026-11").days.at(-1)).toBe("2026-11-30");
  });

  it("não escorrega um dia por causa do fuso: o primeiro e o último dia são do próprio mês", () => {
    const grid = monthGrid("2026-02");

    expect(grid.days[0]).toBe("2026-02-01");
    expect(grid.days.at(-1)).toBe("2026-02-28");
  });

  it("dezembro vira o ano sem confusão", () => {
    const grid = monthGrid("2026-12");

    expect(grid.leadingBlanks).toBe(2); // 1º/12/2026 é uma terça
    expect(grid.days.at(-1)).toBe("2026-12-31");
  });
});

describe("byDueDate e summarize", () => {
  it("agrupa por dia e conta por status", () => {
    const days = byDueDate([
      occurrence({ billId: 1, dueDate: "2026-11-10", status: "OVERDUE" }),
      occurrence({ billId: 2, dueDate: "2026-11-10", status: "PAID" }),
      occurrence({ billId: 3, dueDate: "2026-11-20" }),
    ]);

    expect(days.get("2026-11-10")).toHaveLength(2);
    expect(summarize(days.get("2026-11-10") ?? [])).toEqual({ OVERDUE: 1, PENDING: 0, PAID: 1 });
    expect(days.get("2026-11-15")).toBeUndefined();
  });
});

describe("dayLabel", () => {
  it("diz a data e quantas contas há em cada status, no singular e no plural", () => {
    expect(dayLabel("2026-11-15", { OVERDUE: 1, PENDING: 2, PAID: 0 })).toBe(
      "15 de novembro: 1 atrasada, 2 pendentes",
    );
    expect(dayLabel("2026-11-15", { OVERDUE: 0, PENDING: 0, PAID: 1 })).toBe("15 de novembro: 1 paga");
  });

  it("um dia sem contas é só a data", () => {
    expect(dayLabel("2026-02-28", { OVERDUE: 0, PENDING: 0, PAID: 0 })).toBe("28 de fevereiro");
  });
});

describe("byUrgency", () => {
  it("põe as atrasadas primeiro e depois ordena pelo vencimento", () => {
    const sorted = [
      occurrence({ billId: 1, dueDate: "2026-11-18" }),
      occurrence({ billId: 2, dueDate: "2026-11-20", status: "OVERDUE" }),
      occurrence({ billId: 3, dueDate: "2026-11-16" }),
      occurrence({ billId: 4, dueDate: "2026-10-10", status: "OVERDUE" }),
    ].sort(byUrgency);

    expect(sorted.map((item) => item.billId)).toEqual([4, 2, 3, 1]);
  });
});
