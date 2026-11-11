import type { Invoice } from "./invoicesApi";
import { toCents } from "../../shared/lib/money";

/** As retenções que uma nota pode trazer, na ordem em que aparecem no detalhe. */
export const WITHHOLDINGS = [
  { key: "issWithheldAmount", label: "ISS retido" },
  { key: "irrfWithheldAmount", label: "IRRF retido" },
  { key: "pisWithheldAmount", label: "PIS retido" },
  { key: "cofinsWithheldAmount", label: "COFINS retido" },
  { key: "csllWithheldAmount", label: "CSLL retida" },
  { key: "inssWithheldAmount", label: "INSS retido" },
] as const;

/** A receita de uma nota: o serviço menos o desconto incondicional, que não é receita (LC 123). */
export function revenueCents(invoice: Pick<Invoice, "serviceAmount" | "unconditionalDiscountAmount">): number {
  return toCents(invoice.serviceAmount) - toCents(invoice.unconditionalDiscountAmount);
}

export type InvoiceMonth = { month: string; invoices: Invoice[]; activeRevenueCents: number };

/**
 * Agrupa por mês de competência, do mais recente ao mais antigo, mantendo a ordem da API dentro do
 * mês. O total soma só as ativas: nota cancelada não é receita.
 */
export function groupByMonth(invoices: Invoice[]): InvoiceMonth[] {
  const months = new Map<string, Invoice[]>();
  for (const invoice of invoices) {
    const month = invoice.competenceDate.slice(0, 7);
    months.set(month, [...(months.get(month) ?? []), invoice]);
  }
  return [...months.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, list]) => ({
      month,
      invoices: list,
      activeRevenueCents: list.filter((i) => i.status === "ATIVA").reduce((sum, i) => sum + revenueCents(i), 0),
    }));
}

/** "12,4 MB" ou "830 KB": o uso da cota, legível. */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 KB";
  // Um XML pequeno arredondaria para "0 KB", que parece que nada foi guardado.
  if (bytes < 1024) return "menos de 1 KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}
