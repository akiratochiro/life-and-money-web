import { describe, expect, it } from "vitest";
import { weekdayAndDay } from "./dates";

describe("weekdayAndDay", () => {
  it("mostra o dia da semana curto, sem o ponto, e o dia do mês", () => {
    expect(weekdayAndDay("2026-11-14")).toBe("sáb 14");
    expect(weekdayAndDay("2026-11-16")).toBe("seg 16");
  });

  it("não escorrega um dia por causa do fuso", () => {
    // new Date("2026-02-28") seria meia-noite em UTC, ainda dia 27 no Brasil
    expect(weekdayAndDay("2026-02-28")).toBe("sáb 28");
  });
});
