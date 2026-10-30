import { useEffect, useState, type ReactNode } from "react";
import { isSignedIn, onSessionChange, renewSession } from "../../shared/auth/session";
import { serverWake } from "../../shared/api/serverWake";
import { SessionContext, type SessionStatus } from "./sessionContext";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");

  // Uma tentativa de renovação ao abrir o app: é o que devolve a sessão depois de um
  // recarregamento, já que o access token não é guardado em lugar nenhum. Ela só sai depois que
  // a API responde ao /health: com o servidor ainda acordando, a renovação voltaria com erro e o
  // usuário seria mandado para o login sem ter perdido a sessão.
  useEffect(() => {
    let active = true;
    serverWake.waitUntilReady().then(renewSession).then((token) => {
      if (active) {
        setStatus(token ? "authenticated" : "anonymous");
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Login, logout e sessão recusada pela API chegam aqui pelo mesmo caminho.
  useEffect(
    () => onSessionChange(() => setStatus(isSignedIn() ? "authenticated" : "anonymous")),
    [],
  );

  return <SessionContext.Provider value={status}>{children}</SessionContext.Provider>;
}
