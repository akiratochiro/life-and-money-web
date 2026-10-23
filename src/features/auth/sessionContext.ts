import { createContext, useContext } from "react";

/**
 * - `loading`: ainda tentando recuperar a sessão pelo cookie, logo depois de abrir a página;
 * - `authenticated` / `anonymous`: já se sabe a resposta.
 *
 * O estado intermediário existe porque o access token vive só em memória: ao recarregar, o app
 * não sabe de imediato se há sessão, e mandar para o login antes da resposta expulsaria um
 * usuário que está logado.
 */
export type SessionStatus = "loading" | "authenticated" | "anonymous";

export const SessionContext = createContext<SessionStatus | null>(null);

export function useSessionStatus(): SessionStatus {
  const status = useContext(SessionContext);
  if (status === null) {
    throw new Error("useSessionStatus precisa estar dentro de um SessionProvider");
  }
  return status;
}
