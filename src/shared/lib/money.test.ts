import { describe, expect, it } from "vitest";
import { digitsToInt, formatBasisPoints, formatCents, toCents } from "./money";

// O Intl separa o "R$" do número com um espaço não separável (U+00A0), não com um espaço comum.
const NBSP = " ";

describe("toCents", () => {
  it("converte reais em centavos", () => {
    expect(toCents(250.75)).toBe(25075);
    expect(toCents(0)).toBe(0);
  });

  it("arredonda o erro de ponto flutuante em vez de truncar", () => {
    // 0.29 * 100 dá 28.999999999999996 em ponto flutuante; truncar daria 28.
    expect(0.29 * 100).not.toBe(29);
    expect(toCents(0.29)).toBe(29);
    expect(toCents(19.99)).toBe(1999);
  });

  it("aguenta o maior valor que o campo aceita", () => {
    expect(toCents(999_999_999.99)).toBe(99_999_999_999);
  });
});

describe("formatCents", () => {
  it("formata centavos como reais", () => {
    expect(formatCents(25075)).toBe(`R$${NBSP}250,75`);
    expect(formatCents(0)).toBe(`R$${NBSP}0,00`);
    expect(formatCents(5)).toBe(`R$${NBSP}0,05`);
  });

  it("separa os milhares com ponto", () => {
    expect(formatCents(123_456_789)).toBe(`R$${NBSP}1.234.567,89`);
  });

  it("volta ao mesmo valor depois de ida e volta pela API", () => {
    expect(toCents(25075 / 100)).toBe(25075);
  });
});

describe("formatBasisPoints", () => {
  it("formata centésimos de ponto com duas casas", () => {
    expect(formatBasisPoints(1250)).toBe("12,50");
    expect(formatBasisPoints(10_000)).toBe("100,00");
    expect(formatBasisPoints(0)).toBe("0,00");
  });
});

describe("digitsToInt", () => {
  it("lê só os dígitos do texto formatado", () => {
    expect(digitsToInt(`R$${NBSP}250,75`, Infinity)).toBe(25075);
    expect(digitsToInt("12,50", Infinity)).toBe(1250);
  });

  it("trata texto sem dígitos como zero", () => {
    expect(digitsToInt("", Infinity)).toBe(0);
    expect(digitsToInt(`R$${NBSP}`, Infinity)).toBe(0);
  });

  it("limita ao máximo do campo", () => {
    expect(digitsToInt("10001", 10_000)).toBe(10_000);
    expect(digitsToInt("10000", 10_000)).toBe(10_000);
  });
});
