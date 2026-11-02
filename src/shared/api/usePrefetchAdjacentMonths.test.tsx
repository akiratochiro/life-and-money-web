import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, queryOptions } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { usePrefetchAdjacentMonths } from "./usePrefetchAdjacentMonths";

describe("usePrefetchAdjacentMonths", () => {
  it("busca o mês anterior e o próximo, e trocar de mês só busca o que ainda não está fresco", async () => {
    const fetchMonth = vi.fn((month: string) => Promise.resolve(month));
    const query = (month: string) =>
      queryOptions({ queryKey: ["transactions", month], queryFn: () => fetchMonth(month), staleTime: 30_000 });
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    // when: abre outubro (outubro em si é buscado pela tela, não pelo prefetch)
    const { rerender } = renderHook(({ month }) => usePrefetchAdjacentMonths(month, query), {
      wrapper,
      initialProps: { month: "2026-10" },
    });

    // then
    await waitFor(() => expect(fetchMonth.mock.calls.map(([month]) => month)).toEqual(["2026-09", "2026-11"]));

    // when: avança para novembro; outubro também está fresco, porque a tela acabou de buscá-lo
    queryClient.setQueryData(["transactions", "2026-10"], "2026-10");
    rerender({ month: "2026-11" });

    // then: só dezembro é novo
    await waitFor(() => expect(fetchMonth).toHaveBeenCalledTimes(3));
    expect(fetchMonth).toHaveBeenLastCalledWith("2026-12");
  });

  it("atravessa a virada do ano", async () => {
    const fetchMonth = vi.fn((month: string) => Promise.resolve(month));
    const query = (month: string) => queryOptions({ queryKey: ["x", month], queryFn: () => fetchMonth(month) });
    const queryClient = new QueryClient();

    renderHook(() => usePrefetchAdjacentMonths("2027-01", query), {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    });

    await waitFor(() => expect(fetchMonth.mock.calls.map(([month]) => month)).toEqual(["2026-12", "2027-02"]));
  });
});
