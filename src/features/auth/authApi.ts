import { api } from "../../shared/api/client";
import { unwrap } from "../../shared/api/problem";
import { tokenStorage } from "../../shared/auth/tokenStorage";

export type Credentials = { email: string; password: string };

export async function login(credentials: Credentials): Promise<void> {
  const data = await unwrap(api.POST("/auth/login", { body: credentials }));
  if (!data.accessToken) {
    throw new Error("A resposta do login veio sem token.");
  }
  tokenStorage.set(data.accessToken);
}

export type Registration = Credentials & { name: string };

export async function register(registration: Registration): Promise<void> {
  await unwrap(api.POST("/auth/register", { body: registration }));
  await login({ email: registration.email, password: registration.password });
}