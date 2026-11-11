/**
 * O nome do arquivo sugerido no Content-Disposition. Prefere o `filename*` (RFC 6266, em UTF-8),
 * que a API manda quando o nome tem acento; senão, o `filename` simples.
 */
export function filenameFromDisposition(contentDisposition: string | null): string | undefined {
  if (!contentDisposition) return undefined;
  const extended = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (extended) {
    try {
      return decodeURIComponent(extended[1]);
    } catch {
      // Codificação inválida: cai para o filename simples.
    }
  }
  return contentDisposition.match(/filename="?([^";]+)"?/)?.[1];
}

/** Entrega um Blob como download, com o nome dado. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
