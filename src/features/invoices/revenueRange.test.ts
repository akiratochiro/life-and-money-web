import { describe, expect, it } from "vitest";
import { barLabel, defaultRange, periodLabel } from "./revenueRange";

const TODAY = new Date(2026, 10, 11);

describe("o período padrão do gráfico de receita", () => {
  it("30 dias, 12 semanas ou 12 meses até hoje", () => {
    expect(defaultRange("DAY", TODAY)).toEqual({ from: "2026-10-13", to: "2026-11-11" });
    expect(defaultRange("WEEK", TODAY)).toEqual({ from: "2026-08-26", to: "2026-11-11" });
    expect(defaultRange("MONTH", TODAY)).toEqual({ from: "2025-12-01", to: "2026-11-11" });
  });
});

describe("os rótulos das barras", () => {
  it("o dia, a segunda-feira da semana ou o mês", () => {
    expect(barLabel("2026-11-09", "DAY")).toBe("9");
    expect(barLabel("2026-11-09", "WEEK")).toBe("09/11");
    expect(barLabel("2026-11-01", "MONTH")).toBe("nov");
  });

  it("o período por extenso", () => {
    expect(periodLabel("2026-11-09", "2026-11-09", "DAY")).toBe("9 de novembro");
    expect(periodLabel("2026-10-26", "2026-11-01", "WEEK")).toBe("26 de out. a 1 de nov.");
    expect(periodLabel("2026-11-01", "2026-11-30", "MONTH")).toBe("Novembro de 2026");
  });
});
