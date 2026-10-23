import { api } from "../../shared/api/client";
import { unwrap } from "../../shared/api/problem";
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
