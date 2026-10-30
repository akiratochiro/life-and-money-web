import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router/dom";
import { router } from "./router";
import { PrivacyProvider } from "../shared/privacy/PrivacyProvider";
import { SessionProvider } from "../features/auth/SessionProvider";
import { serverWake } from "../shared/api/serverWake";
import { useServerStatus } from "../shared/api/useServerStatus";
import { ServerWakeOverlay } from "./ServerWakeOverlay";
import { retryDelay, shouldRetryQuery } from "../shared/api/retryPolicy";

const queryClient = new QueryClient({
  defaultOptions: {
    // Só erros transitórios (rede, timeout, 502/503/504) são repetidos, com backoff: se a API
    // hibernar com o app aberto, as queries esperam ela acordar em vez de mostrar erro. As
    // mutações seguem sem retry, para um lançamento nunca ser gravado duas vezes.
    queries: { retry: shouldRetryQuery, retryDelay, staleTime: 30_000 },
  },
});

export function App() {
  const serverStatus = useServerStatus();
  const blocked = serverStatus === "waking" || serverStatus === "unreachable";

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <PrivacyProvider>
          {/* Enquanto o aviso cobre a tela, o que está atrás dele não recebe foco nem cliques. */}
          <div inert={blocked}>
            <RouterProvider router={router} />
          </div>
          {blocked && <ServerWakeOverlay status={serverStatus} onRetry={serverWake.retry} />}
        </PrivacyProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
