/**
 * O CNPJ como o usuário digita ou cola: com ou sem pontuação, e, desde julho de 2026, com letras
 * nas 12 primeiras posições. A validação de verdade (dígitos verificadores) é da API; aqui só se
 * limpa, para mandar sem a barra (que num caminho de URL separaria segmentos), e se formata.
 */
export function cleanCnpj(raw: string): string {
  return raw.replace(/[^0-9a-zA-Z]/g, "").toUpperCase();
}

/** Já tem os 14 caracteres no formato certo: dá para consultar. */
export function isCompleteCnpj(raw: string): boolean {
  return /^[0-9A-Z]{12}[0-9]{2}$/.test(cleanCnpj(raw));
}

/** 12.ABC.345/01DE-35. Um valor incompleto volta como veio. */
export function formatCnpj(raw: string): string {
  const value = cleanCnpj(raw);
  if (value.length !== 14) return raw;
  return `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 8)}/${value.slice(8, 12)}-${value.slice(12)}`;
}
