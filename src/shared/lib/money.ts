const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const percent = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const toCents = (amount: number): number => Math.round(amount * 100);

export const formatCents = (cents: number): string => brl.format(cents / 100);

export const formatBasisPoints = (basisPoints: number): string => percent.format(basisPoints / 100);

// Lê o texto de um campo como um inteiro nas unidades do campo (centavos ou centésimos de ponto):
// tudo que não é dígito, inclusive o "R$" e a vírgula da própria formatação, é descartado.
export function digitsToInt(text: string, max: number): number {
  const digits = text.replace(/\D/g, "");
  return Math.min(Number(digits || "0"), max);
}

/** Com o sinal escrito ("+R$ 10,00", "−R$ 5,00"): a cor nunca é a única pista de que ficou negativo. */
export function signedCents(cents: number): string {
  if (cents === 0) return formatCents(0);
  return `${cents > 0 ? "+" : "−"}${formatCents(Math.abs(cents))}`;
}
