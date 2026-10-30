import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router/dom";
import { router } from "./router";
import { PrivacyProvider } from "../shared/privacy/PrivacyProvider";
import { SessionProvider } from "../features/auth/SessionProvider";
import { serverWake } from "../shared/api/serverWake";
import { useServerStatus } from "../shared/api/useServerStatus";
import { ServerWakeOverlay } from "./ServerWakeOverlay";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
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
