import { api } from "../../shared/api/client";
import { expectNoContent, unwrap } from "../../shared/api/problem";
import { startSession } from "../../shared/auth/session";

export type Credentials = { email: string; password: string };

export async function login(credentials: Credentials): Promise<void> {
  // A resposta traz o access token; o refresh token vem no cookie, que o navegador guarda sozinho.
  startSession(await unwrap(api.POST("/auth/login", { body: credentials })));
}

export type Registration = Credentials & { name: string };

/**
 * Pede o cadastro. Não abre sessão: a conta só existe depois que o link do e-mail é usado
 * ({@link confirmEmail}). A API responde a mesma mensagem tenha ou não o e-mail uma conta.
 */
export async function register(registration: Registration): Promise<string> {
  const response = await unwrap(api.POST("/auth/register", { body: registration }));
  return response.message;
}

/** Usa o token do link do e-mail e cria a conta. Depois, é preciso entrar com a senha. */
export async function confirmEmail(token: string): Promise<void> {
  await unwrap(api.POST("/auth/confirm-email", { body: { token } }));
}

/** A API responde a mesma mensagem exista ou não uma conta com o e-mail. */
export async function requestPasswordReset(email: string): Promise<string> {
  const response = await unwrap(api.POST("/auth/forgot-password", { body: { email } }));
  return response.message;
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await expectNoContent(api.POST("/auth/reset-password", { body: { token, newPassword } }));
}
