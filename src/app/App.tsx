import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router/dom";
import { router } from "./router";
import { PrivacyProvider } from "../shared/privacy/PrivacyProvider";
import { SessionProvider } from "../features/auth/SessionProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <PrivacyProvider>
          <RouterProvider router={router} />
        </PrivacyProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
