import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router/dom";
import { router } from "./router";
import { PrivacyProvider } from "../shared/privacy/PrivacyProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PrivacyProvider>
        <RouterProvider router={router} />
      </PrivacyProvider>
    </QueryClientProvider>
  );
}
