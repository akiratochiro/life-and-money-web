import { describe, expect, it } from "vitest";
import { cleanCnpj, formatCnpj, isCompleteCnpj } from "./cnpj";

describe("CNPJ no formulário", () => {
  it("tira a pontuação e põe as letras em maiúsculas", () => {
    expect(cleanCnpj("12.abc.345/01de-35")).toBe("12ABC34501DE35");
    expect(cleanCnpj(" 11.222.333/0001-81 ")).toBe("11222333000181");
  });

  it("está completo com 12 letras ou dígitos e 2 dígitos no fim", () => {
    expect(isCompleteCnpj("12.ABC.345/01DE-35")).toBe(true);
    expect(isCompleteCnpj("11.222.333/0001-8")).toBe(false);
    expect(isCompleteCnpj("12.ABC.345/01DE-3A")).toBe(false);
  });

  it("formata como é impresso, e deixa um valor incompleto como veio", () => {
    expect(formatCnpj("12ABC34501DE35")).toBe("12.ABC.345/01DE-35");
    expect(formatCnpj("112223")).toBe("112223");
  });
});
