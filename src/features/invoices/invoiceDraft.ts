import type { Invoice, InvoiceData } from "./invoicesApi";
import { toCents } from "../../shared/lib/money";

/**
 * Os campos de uma nota no formulário: dinheiro em centavos (decisão 3), texto como digitado. A
 * conversão para reais acontece só na fronteira com a API.
 */
export type InvoiceDraft = {
  number: string;
  accessKey: string;
  issueDate: string;
  competenceDate: string;
  serviceCents: number;
  discountCents: number;
  netCents: number;
  issCents: number;
  irrfCents: number;
  pisCents: number;
  cofinsCents: number;
  csllCents: number;
  inssCents: number;
  takerName: string;
  takerDocument: string;
};

export const WITHHOLDINGS = [
  { key: "issCents", label: "ISS retido" },
  { key: "irrfCents", label: "IRRF retido" },
  { key: "pisCents", label: "PIS retido" },
  { key: "cofinsCents", label: "COFINS retido" },
  { key: "csllCents", label: "CSLL retida" },
  { key: "inssCents", label: "INSS retido" },
] as const;

const cents = (value: number | undefined) => (value === undefined || value === null ? 0 : toCents(value));

/** O rascunho a partir do que a pré-visualização reconheceu (pode vir incompleto) ou de uma nota salva. */
export function draftFrom(data?: Partial<InvoiceData> | Invoice): InvoiceDraft {
  return {
    number: data?.number ?? "",
    accessKey: data?.accessKey ?? "",
    issueDate: data?.issueDate ?? "",
    competenceDate: data?.competenceDate ?? "",
    serviceCents: cents(data?.serviceAmount),
    discountCents: cents(data?.unconditionalDiscountAmount),
    netCents: cents(data?.netAmount),
    issCents: cents(data?.issWithheldAmount),
    irrfCents: cents(data?.irrfWithheldAmount),
    pisCents: cents(data?.pisWithheldAmount),
    cofinsCents: cents(data?.cofinsWithheldAmount),
    csllCents: cents(data?.csllWithheldAmount),
    inssCents: cents(data?.inssWithheldAmount),
    takerName: data?.takerName ?? "",
    takerDocument: data?.takerDocument ?? "",
  };
}

/** O mínimo para a API aceitar: número, datas e valor do serviço. */
export function isDraftComplete(draft: InvoiceDraft): boolean {
  return draft.number.trim() !== "" && draft.issueDate !== "" && draft.competenceDate !== "" && draft.serviceCents > 0;
}

/** Para a API: centavos viram reais, texto vazio some, a chave perde os espaços. */
export function toData(draft: InvoiceDraft): InvoiceData {
  const accessKey = draft.accessKey.replace(/\D/g, "");
  return {
    number: draft.number.trim(),
    accessKey: accessKey || undefined,
    issueDate: draft.issueDate,
    competenceDate: draft.competenceDate,
    serviceAmount: draft.serviceCents / 100,
    unconditionalDiscountAmount: draft.discountCents / 100,
    netAmount: draft.netCents / 100,
    issWithheldAmount: draft.issCents / 100,
    irrfWithheldAmount: draft.irrfCents / 100,
    pisWithheldAmount: draft.pisCents / 100,
    cofinsWithheldAmount: draft.cofinsCents / 100,
    csllWithheldAmount: draft.csllCents / 100,
    inssWithheldAmount: draft.inssCents / 100,
    takerName: draft.takerName.trim() || undefined,
    takerDocument: draft.takerDocument.trim() || undefined,
  };
}

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
  if (bytes < 1024 * 1024) return `${Math.max(0, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}
