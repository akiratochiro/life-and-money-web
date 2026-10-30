import { api } from "../../shared/api/client";
import { expectNoContent, unwrap } from "../../shared/api/problem";
import { startSession } from "../../shared/auth/session";

export type Credentials = { email: string; password: string };

export async function login(credentials: Credentials): Promise<void> {
  // A resposta traz o access token; o refresh token vem no cookie, que o navegador guarda sozinho.
  startSession(await unwrap(api.POST("/auth/login", { body: credentials })));
}

export type Registration = Credentials & { name: string };

export async function register(registration: Registration): Promise<void> {
  await unwrap(api.POST("/auth/register", { body: registration }));
  await login({ email: registration.email, password: registration.password });
}

/** A API responde a mesma mensagem exista ou não uma conta com o e-mail. */
export async function requestPasswordReset(email: string): Promise<string> {
  const response = await unwrap(api.POST("/auth/forgot-password", { body: { email } }));
  return response.message;
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await expectNoContent(api.POST("/auth/reset-password", { body: { token, newPassword } }));
}
