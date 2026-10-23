import type { components } from "../api/schema";

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

const API_URL = import.meta.env.VITE_API_URL;

/**
 * O header existe para barrar CSRF. Em produção o cookie é SameSite=None, então o navegador o
 * enviaria também num POST disparado por outro site; um header fora da lista segura do CORS
 * obriga o preflight, que só passa para as origens que a API permite.
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

export function endSession(): void {
  endedWhileActive = accessToken !== null;
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

async function requestRenewal(): Promise<string | null> {
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { [REFRESH_REQUEST_HEADER]: "1" },
    });

    if (!response.ok) {
      endSession();
      return null;
    }

    startSession((await response.json()) as TokenResponse);
    return accessToken;
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
    await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" });
  } catch {
    // O logout local acontece de qualquer forma; o cookie expira sozinho mais tarde.
  }
  endSession();
}

function notify(): void {
  listeners.forEach((listener) => listener());
}
