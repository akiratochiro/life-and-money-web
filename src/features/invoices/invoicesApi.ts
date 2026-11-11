import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import { ApiError, expectNoContent, unwrap } from "../../shared/api/problem";
import type { components } from "../../shared/api/schema";
import { useInvalidate } from "../../shared/api/invalidation";
import { filenameFromDisposition, saveBlob } from "../../shared/lib/download";

export type Invoice = components["schemas"]["InvoiceResponse"];
export type InvoiceData = components["schemas"]["InvoiceData"];
export type InvoicePreview = components["schemas"]["InvoicePreview"];
export type AttachmentUsage = components["schemas"]["AttachmentUsage"];

/** As notas moram debaixo da chave da empresa: mudar a empresa (arquivar) recarrega as notas também. */
export function useInvoices(companyId: number, year: number) {
  return useQuery({
    queryKey: ["companies", companyId, "invoices", year],
    queryFn: () =>
      unwrap(api.GET("/companies/{companyId}/invoices", { params: { path: { companyId }, query: { year } } })),
  });
}

export function useInvoiceYears(companyId: number) {
  return useQuery({
    queryKey: ["companies", companyId, "invoices", "years"],
    queryFn: () => unwrap(api.GET("/companies/{companyId}/invoices/years", { params: { path: { companyId } } })),
  });
}

export function useAttachmentUsage() {
  return useQuery({
    queryKey: ["attachments", "usage"],
    queryFn: () => unwrap(api.GET("/attachments/usage")),
  });
}

/**
 * Multipart: o corpo vai como FormData, e o openapi-fetch deixa o navegador pôr o Content-Type com
 * a fronteira. O tipo gerado descreve os arquivos como texto (é como o OpenAPI descreve binário),
 * por isso o corpo tipado é só um marcador, e o que vai de verdade sai do bodySerializer.
 */
export function usePreviewInvoices(companyId: number) {
  return useMutation({
    mutationFn: (files: File[]) => {
      const form = new FormData();
      files.forEach((file) => form.append("files", file));
      return unwrap(
        api.POST("/companies/{companyId}/invoices/parse", {
          params: { path: { companyId } },
          body: { files: [] },
          bodySerializer: () => form,
        }),
      );
    },
  });
}

/** Só o XML: a API relê o arquivo e usa os valores dele. */
export function useSaveInvoice(companyId: number) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return unwrap(
        api.POST("/companies/{companyId}/invoices", {
          params: { path: { companyId } },
          body: { file: "" },
          bodySerializer: () => form,
        }),
      );
    },
    onSuccess: () => invalidate("invoice"),
  });
}

export function useSetInvoiceStatus(companyId: number) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ invoiceId, cancel }: { invoiceId: number; cancel: boolean }) =>
      unwrap(
        cancel
          ? api.POST("/companies/{companyId}/invoices/{invoiceId}/cancel", { params: { path: { companyId, invoiceId } } })
          : api.POST("/companies/{companyId}/invoices/{invoiceId}/reactivate", {
              params: { path: { companyId, invoiceId } },
            }),
      ),
    onSuccess: () => invalidate("invoice"),
  });
}

export function useDeleteInvoice(companyId: number) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (invoiceId: number) =>
      expectNoContent(
        api.DELETE("/companies/{companyId}/invoices/{invoiceId}", { params: { path: { companyId, invoiceId } } }),
      ),
    onSuccess: () => invalidate("invoice"),
  });
}

/** Baixa o XML original, com o nome que a API mandou. */
export async function downloadInvoiceFile(companyId: number, invoiceId: number): Promise<void> {
  const result = await api.GET("/companies/{companyId}/invoices/{invoiceId}/file", {
    params: { path: { companyId, invoiceId } },
    parseAs: "blob",
  });
  if (result.data === undefined) {
    throw new ApiError(result.response.status, result.error);
  }
  saveBlob(result.data as Blob, filenameFromDisposition(result.response.headers.get("Content-Disposition")) ?? "nota");
}
