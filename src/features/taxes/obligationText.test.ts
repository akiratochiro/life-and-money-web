import { describe, expect, it } from "vitest";
import { appliesTo, scheduleOf } from "./obligationText";
import type { Obligation } from "./taxesApi";

const base: Obligation = {
  id: 1, kind: "CUSTOM", name: "Taxa", recurrence: "MONTHLY", dueDay: 10, dueRule: "NONE", system: false, active: true,
};

describe("texto das obrigações", () => {
  it("descreve o vencimento", () => {
    expect(scheduleOf({ ...base, kind: "DAS", system: true, dueDay: 20 })).toBe("Dia 20 do mês seguinte à competência");
    expect(scheduleOf({ ...base, kind: "DEFIS", system: true, recurrence: "YEARLY", dueDay: 31, dueMonth: 3 })).toBe("31 de março, todo ano");
    expect(scheduleOf(base)).toBe("Dia 10, todo mês");
    expect(scheduleOf({ ...base, recurrence: "ONCE" })).toBe("Dia 10, uma vez só");
  });

  it("as do sistema dependem do regime; as personalizadas valem sempre", () => {
    expect(appliesTo({ kind: "DAS" }, "SIMPLES_NACIONAL")).toBe(true);
    expect(appliesTo({ kind: "DAS" }, "SIMEI")).toBe(false);
    expect(appliesTo({ kind: "DASN_SIMEI" }, "SIMEI")).toBe(true);
    expect(appliesTo({ kind: "CUSTOM" }, "LUCRO_PRESUMIDO")).toBe(true);
  });
});
