import { useMutation } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import { ApiError } from "../../shared/api/problem";
import { filenameFromDisposition, saveBlob } from "../../shared/lib/download";

/**
 * Baixa o pacote do mês (decisão 34): o fetch autenticado, como o arquivo da nota, e o nome do
 * Content-Disposition. Não muda nada no servidor, então não invalida nenhuma chave.
 */
export async function downloadAccountantPackage(companyId: number, month: string): Promise<void> {
  const result = await api.GET("/companies/{companyId}/accountant-package", {
    params: { path: { companyId }, query: { month } },
    parseAs: "blob",
  });
  if (result.data === undefined) {
    throw new ApiError(result.response.status, result.error);
  }
  saveBlob(result.data as Blob, filenameFromDisposition(result.response.headers.get("Content-Disposition")) ?? `pacote-${month}.zip`);
}

export function useDownloadAccountantPackage(companyId: number) {
  return useMutation({ mutationFn: (month: string) => downloadAccountantPackage(companyId, month) });
}
