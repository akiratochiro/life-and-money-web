import type { components } from "../api/schema";
import { API_BASE } from "../api/base";
import { MAX_QUERY_RETRIES, isUpstreamUnavailable, retryDelay } from "../api/retryPolicy";

type TokenResponse = components["schemas"]["TokenResponse"];

/**
 * A sessão do usuário, em duas peças com responsabilidades diferentes:
 *
 * - o **access token** vive só nesta variável, em memória. Não vai para o localStorage nem para
 *   o sessionStorage, então um XSS não encontra onde lê-lo, e recarregar a página o perde;
 * - o **refresh token** está num cookie HttpOnly que este código nunca vê. É ele que devolve a
 *   sessão depois de um recarregamento, e é por isso que o `renew()` abaixo funciona sem receber
 *   nenhum segredo como argumento.
 *
 * Este módulo propositalmente não usa o cliente tipado de `api/client.ts`: é o client que depende
 * da sessão para montar o header Authorization, e o contrário criaria uma importação circular.
 */

/**
 * Segunda barreira contra CSRF; a primeira é o SameSite=Strict do cookie. Um header fora da lista
 * segura do CORS obriga o preflight, e a API não libera nenhuma outra origem.
 */
const REFRESH_REQUEST_HEADER = "X-Refresh-Request";

/** Renova um pouco antes do vencimento, para nenhuma requisição sair com o token já expirado. */
const RENEW_BEFORE_MS = 30_000;

let accessToken: string | null = null;
let expiresAt = 0;
let renewal: Promise<string | null> | null = null;

/** Distingue "a sessão caiu durante o uso" de "nunca houve sessão nesta aba". */
let endedWhileActive = false;

const listeners = new Set<() => void>();

export function isSignedIn(): boolean {
  return accessToken !== null;
}

/** Verdadeiro quando havia uma sessão e ela acabou: é o que merece um aviso na tela de login. */
export function sessionExpired(): boolean {
  return endedWhileActive;
}

/** Avisa a interface quando a sessão começa ou termina fora de um clique do usuário. */
export function onSessionChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function startSession(response: TokenResponse): void {
  accessToken = response.accessToken;
  expiresAt = Date.now() + response.expiresIn * 1000;
  endedWhileActive = false;
  notify();
}

/**
 * `expired: false` quando o fim da sessão foi pedido pelo próprio usuário (excluir a conta): aí a
 * tela de login não deve dizer que a sessão expirou.
 */
export function endSession({ expired = true }: { expired?: boolean } = {}): void {
  endedWhileActive = expired && accessToken !== null;
  accessToken = null;
  expiresAt = 0;
  notify();
}

/**
 * Pede um access token novo usando o cookie. Chamadas concorrentes compartilham a mesma
 * requisição: sem isso, as consultas que a tela dispara ao abrir renovariam em paralelo e,
 * como cada renovação rotaciona o token, uma invalidaria a outra.
 */
export function renewSession(): Promise<string | null> {
  renewal ??= requestRenewal().finally(() => {
    renewal = null;
  });
  return renewal;
}

/** Espera pedida num 429, com teto: o limite de renovação é por minuto. */
function retryAfterMs(response: Response): number {
  const seconds = Number(response.headers.get("Retry-After"));
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 60) * 1_000 : 5_000;
}

/**
 * Sem timeout e com retry só para 502/503 e 429. O 502/503 é o proxy avisando que a API ainda não
 * está de pé, e o 429 é a API recusando antes de olhar o token: nos dois casos, o pedido não
 * chegou a rotacionar nada. Qualquer outra falha pode ter acontecido depois de a API
 * rotacionar o token, e repetir com o token antigo seria tratado como roubo de sessão — a API
 * revogaria todas as sessões do usuário.
 */
async function requestRenewal(): Promise<string | null> {
  try {
    for (let failures = 0; ; failures++) {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { [REFRESH_REQUEST_HEADER]: "1" },
      });

      if (response.ok) {
        startSession((await response.json()) as TokenResponse);
        return accessToken;
      }

      const retryable = isUpstreamUnavailable(response.status) || response.status === 429;
      if (!retryable || failures >= MAX_QUERY_RETRIES) {
        endSession();
        return null;
      }

      const delay = response.status === 429 ? retryAfterMs(response) : retryDelay(failures);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  } catch {
    // Sem rede não há como saber se a sessão ainda vale; tratar como encerrada é o seguro.
    endSession();
    return null;
  }
}

/** Token para a próxima requisição, renovando sozinho quando está perto de vencer. */
export function currentAccessToken(): Promise<string | null> {
  if (accessToken !== null && Date.now() < expiresAt - RENEW_BEFORE_MS) {
    return Promise.resolve(accessToken);
  }
  return renewSession();
}

export async function revokeSession(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: "POST" });
  } catch {
    // O logout local acontece de qualquer forma; o cookie expira sozinho mais tarde.
  }
  endSession();
}

function notify(): void {
  listeners.forEach((listener) => listener());
}
