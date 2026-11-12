import { describe, expect, it } from "vitest";
import { regimeMonths, regimePeriod, regimeStatus } from "./regimePeriod";

const TODAY = new Date(2026, 10, 11);

describe("o período de cada enquadramento", () => {
  it("o atual, sem fim", () => {
    expect(regimePeriod({ validFrom: "2024-03" }, TODAY)).toBe("Desde março de 2024");
  });

  it("um encerrado, com começo e fim", () => {
    expect(regimePeriod({ validFrom: "2024-03", validTo: "2025-02" }, TODAY)).toBe("De março de 2024 a fevereiro de 2025");
  });

  it("um agendado para depois deste mês", () => {
    expect(regimePeriod({ validFrom: "2027-01" }, TODAY)).toBe("A partir de janeiro de 2027 (agendada)");
  });
});

describe("o lugar de cada enquadramento na linha do tempo", () => {
  const today = new Date(2026, 10, 12);

  it("o que vale neste mês é o atual, mesmo com uma mudança já agendada fechando ele", () => {
    expect(regimeStatus({ validFrom: "2026-07", validTo: undefined }, today)).toBe("CURRENT");
    expect(regimeStatus({ validFrom: "2026-07", validTo: "2026-12" }, today)).toBe("CURRENT");
    expect(regimeStatus({ validFrom: "2026-07", validTo: "2026-11" }, today)).toBe("CURRENT");
  });

  it("o que começa depois deste mês é agendado; o que acabou antes, passado", () => {
    expect(regimeStatus({ validFrom: "2027-01", validTo: undefined }, today)).toBe("SCHEDULED");
    expect(regimeStatus({ validFrom: "2026-01", validTo: "2026-06" }, today)).toBe("PAST");
  });

  it("quantos meses durou, contando o primeiro e o último", () => {
    expect(regimeMonths({ validFrom: "2026-01", validTo: "2026-06" })).toBe(6);
    expect(regimeMonths({ validFrom: "2025-11", validTo: "2026-02" })).toBe(4);
    expect(regimeMonths({ validFrom: "2026-03", validTo: "2026-03" })).toBe(1);
    expect(regimeMonths({ validFrom: "2026-07", validTo: undefined })).toBeNull();
  });
});
