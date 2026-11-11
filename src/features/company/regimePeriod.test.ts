import { describe, expect, it } from "vitest";
import { regimePeriod } from "./regimePeriod";

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
