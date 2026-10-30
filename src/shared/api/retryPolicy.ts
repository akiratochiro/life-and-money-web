import { ApiError } from "./problem";

/**
 * Regras para esperar a API em vez de mostrar erro. O caso que importa é o despertar do Render:
 * a requisição demora (até um minuto) ou volta 502/503 do proxy enquanto a API sobe.
 */

/** Uma leitura sem resposta em 20 s é abandonada e refeita pelo retry. */
export const READ_TIMEOUT_MS = 20_000;

/** Retentativas de uma query: com o backoff abaixo, cobrem bem mais que o minuto de um despertar. */
export const MAX_QUERY_RETRIES = 6;

/** Status que o proxy devolve quando a API ainda não está de pé: o pedido não chegou a ela. */
export function isUpstreamUnavailable(status: number): boolean {
  return status === 502 || status === 503;
}

/**
 * Falhas que passam sozinhas: rede, timeout e gateway. Um 4xx é resposta da própria API (dado
 * inválido, sessão vencida, recurso que não existe) e repetir não muda o resultado.
 */
export function isTransient(error: unknown): boolean {
  if (error instanceof ApiError) {
    return isUpstreamUnavailable(error.status) || error.status === 504;
  }
  // O fetch rejeita com TypeError quando a rede falha, e com TimeoutError quando o
  // AbortSignal.timeout vence.
  return error instanceof TypeError || (error instanceof DOMException && error.name === "TimeoutError");
}

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  return failureCount < MAX_QUERY_RETRIES && isTransient(error);
}

/** 1 s, 2 s, 4 s, 8 s e depois 10 s entre as tentativas. */
export function retryDelay(failureCount: number): number {
  return Math.min(1_000 * 2 ** failureCount, 10_000);
}

/**
 * Põe timeout só nas leituras. Uma escrita abortada no meio pode já ter sido gravada, e o retry
 * de um POST duplicaria um lançamento: escrita espera o quanto for preciso e nunca se repete
 * sozinha.
 */
export function withReadTimeout(request: Request): Request {
  if (request.method !== "GET") {
    return request;
  }
  return new Request(request, { signal: AbortSignal.timeout(READ_TIMEOUT_MS) });
}
