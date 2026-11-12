import { describe, expect, it } from "vitest";
import { DUE_WORDS, dayLabel } from "./monthCalendar";

// A grade, o agrupamento e o rótulo das contas são testados em features/bills/calendar.test.ts.
describe("dayLabel com as palavras do calendário fiscal", () => {
  it("usa o masculino de impostos e despesas", () => {
    expect(dayLabel("2026-11-23", { OVERDUE: 1, PENDING: 2, PAID: 1 }, undefined, DUE_WORDS))
      .toBe("23 de novembro: 1 atrasado, 2 pendentes, 1 pago");
  });
});
