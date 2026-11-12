import { describe, expect, it } from "vitest";
import { amountOf, linkOf, statusOf } from "./events";
import { event } from "./testEvents";

describe("linkOf", () => {
  it("leva à tela onde cada coisa é paga", () => {
    expect(linkOf(event())).toBe("/companies/3/taxes");
    expect(linkOf(event({ link: { kind: "COMPANY_EXPENSES", companyId: 3, month: "2026-11" } }))).toBe("/companies/3/expenses");
    expect(linkOf(event({ link: { kind: "BILLS", companyId: null, month: "2026-11" } }))).toBe("/bills");
  });
});

describe("statusOf", () => {
  it("diz o status por texto, com a forma certa para receber e para a declaração", () => {
    expect(statusOf(event({ status: "OVERDUE" }))).toEqual({ tone: "danger", label: "Atrasado" });
    expect(statusOf(event())).toEqual({ tone: "warning", label: "Pendente" });
    expect(statusOf(event({ status: "PAID" }))).toEqual({ tone: "income", label: "Pago" });
    expect(statusOf(event({ direction: "IN" })).label).toBe("A receber");
    expect(statusOf(event({ direction: "IN", status: "PAID" })).label).toBe("Recebido");
    expect(statusOf(event({ source: "DECLARATION", status: "PAID" })).label).toBe("Entregue");
    expect(statusOf(event({ nothingToPay: true, expectedAmount: 0 })).label).toBe("Nada a pagar");
  });
});

describe("amountOf", () => {
  it("o pago, senão o previsto; null vira \"Sem valor\", e a declaração não tem valor", () => {
    expect(amountOf(event())).toMatch(/^R\$\s399,00$/);
    expect(amountOf(event({ status: "PAID", paidAmount: 401.5 }))).toMatch(/^R\$\s401,50$/);
    expect(amountOf(event({ expectedAmount: null }))).toBe("Sem valor");
    expect(amountOf(event({ source: "DECLARATION", expectedAmount: null }))).toBe("Declaração");
  });
});
