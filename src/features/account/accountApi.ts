import { api } from "../../shared/api/client";
import { ApiError, expectNoContent } from "../../shared/api/problem";

/** A palavra que o usuário digita para confirmar a exclusão. */
export const DELETE_CONFIRMATION = "EXCLUIR";

/** O nome do arquivo que a API sugere no Content-Disposition. */
export function filenameFrom(contentDisposition: string | null): string | undefined {
  const match = contentDisposition?.match(/filename="?([^";]+)"?/);
  return match?.[1];
}

/** Baixa o JSON com todos os dados da conta, com o nome de arquivo que a API mandou. */
export async function downloadAccountExport(): Promise<void> {
  const result = await api.GET("/users/me/export", { parseAs: "blob" });
  const { response } = result;
  if (result.data === undefined) {
    throw new ApiError(response.status, result.error);
  }
  const data = result.data;

  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filenameFrom(response.headers.get("Content-Disposition")) ?? "life-and-money.json";
  link.click();
  URL.revokeObjectURL(url);
}

export async function deleteAccount(password: string): Promise<void> {
  await expectNoContent(api.DELETE("/users/me", { body: { password } }));
}
