import { describe, expect, it } from "vitest";
import { formatBytes, groupByMonth, revenueCents } from "./invoiceList";
import type { Invoice } from "./invoicesApi";

function invoice(id: number, competenceDate: string, service: number, status: Invoice["status"] = "ATIVA", discount = 0): Invoice {
  return {
    id, competenceDate, status, serviceAmount: service, unconditionalDiscountAmount: discount, number: String(id),
    source: "XML", issueDate: competenceDate, netAmount: service, issWithheldAmount: 0, irrfWithheldAmount: 0,
    pisWithheldAmount: 0, cofinsWithheldAmount: 0, csllWithheldAmount: 0, inssWithheldAmount: 0,
  } as Invoice;
}

describe("notas por mês", () => {
  it("do mês mais recente ao mais antigo, com o total só das ativas e sem o desconto", () => {
    const months = groupByMonth([
      invoice(3, "2026-11-02", 1000),
      invoice(2, "2026-10-31", 10000, "ATIVA", 500),
      invoice(1, "2026-10-15", 4000, "CANCELADA"),
    ]);

    expect(months.map((m) => m.month)).toEqual(["2026-11", "2026-10"]);
    expect(months[1].invoices.map((i) => i.id)).toEqual([2, 1]);
    expect(months[1].activeRevenueCents).toBe(950_000);
  });

  it("a receita de uma nota desconta o desconto incondicional", () => {
    expect(revenueCents({ serviceAmount: 10000, unconditionalDiscountAmount: 500 })).toBe(950_000);
  });

  it("o uso da cota fica legível", () => {
    expect(formatBytes(0)).toBe("0 KB");
    expect(formatBytes(60)).toBe("menos de 1 KB");
    expect(formatBytes(850 * 1024)).toBe("850 KB");
    expect(formatBytes(12.4 * 1024 * 1024)).toBe("12,4 MB");
  });
});
