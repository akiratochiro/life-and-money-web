import { describe, expect, it } from "vitest";
import { barGeometry, mainLimit, percent } from "./revenueLimits";
import type { RevenueLimit, RevenueLimits } from "./companyOverviewApi";

const limit = (overrides: Partial<RevenueLimit>): RevenueLimit =>
  ({ kind: "SIMPLES_EPP", label: "", amount: 100, ratio: 0, level: "NONE", source: "", exceededIn: null, toleranceAmount: null, ...overrides }) as RevenueLimit;

const limits = (items: RevenueLimit[]) => ({ limits: items }) as unknown as RevenueLimits;

describe("mainLimit", () => {
  it("é o próximo limite ainda não passado; com todos passados, o último", () => {
    const epp = limit({ kind: "SIMPLES_EPP", exceededIn: "2026-04" });
    const sublimit = limit({ kind: "SIMPLES_SUBLIMIT" });
    const ceiling = limit({ kind: "SIMPLES_CEILING" });
    expect(mainLimit(limits([epp, sublimit, ceiling]))?.kind).toBe("SIMPLES_SUBLIMIT");
    expect(mainLimit(limits([epp, { ...sublimit, exceededIn: "2026-10" }, { ...ceiling, exceededIn: "2026-12" }]))?.kind)
      .toBe("SIMPLES_CEILING");
  });
});

describe("percent", () => {
  it("não arredonda para cima, como as frases do servidor", () => {
    expect(percent(0.7944)).toBe("79%");
    expect(percent(0.9999)).toBe("99%");
    expect(percent(1.1)).toBe("110%");
  });
});

describe("barGeometry", () => {
  it("com tolerância, a escala vai até os 120% e a marca dos 100% fica antes do fim", () => {
    expect(barGeometry(21450, limit({ amount: 27000, toleranceAmount: 32400 }))).toEqual({ fill: (21450 / 32400) * 100, limitAt: (27000 / 32400) * 100 });
  });

  it("sem tolerância, a barra enche até o limite e não passa de 100%", () => {
    expect(barGeometry(500, limit({ amount: 360 }))).toEqual({ fill: 100, limitAt: 100 });
  });
});
