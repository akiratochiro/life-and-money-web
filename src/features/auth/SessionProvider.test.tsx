import { act, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionProvider } from "./SessionProvider";
import { useSessionStatus } from "./sessionContext";

const mocks = vi.hoisted(() => ({
  waitUntilReady: vi.fn<() => Promise<void>>(),
  renewSession: vi.fn<() => Promise<string | null>>(),
  signedIn: false,
  listener: null as null | (() => void),
}));

vi.mock("../../shared/api/serverWake", () => ({
  serverWake: { waitUntilReady: mocks.waitUntilReady },
}));

vi.mock("../../shared/auth/session", () => ({
  renewSession: mocks.renewSession,
  isSignedIn: () => mocks.signedIn,
  onSessionChange: (listener: () => void) => {
    mocks.listener = listener;
    return () => {};
  },
}));

function Status() {
  return <output>{useSessionStatus()}</output>;
}

function open(queryClient = new QueryClient()) {
  render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <Status />
      </SessionProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

beforeEach(() => {
  mocks.waitUntilReady.mockReset();
  mocks.renewSession.mockReset();
  mocks.signedIn = false;
  mocks.listener = null;
});

describe("SessionProvider", () => {
  it("só tenta recuperar a sessão depois que o servidor acorda", async () => {
    let wakeUp = () => {};
    mocks.waitUntilReady.mockReturnValue(new Promise((resolve) => (wakeUp = resolve)));
    mocks.renewSession.mockResolvedValue("token");

    open();

    expect(mocks.renewSession).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("loading");

    await act(async () => wakeUp());

    expect(mocks.renewSession).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("authenticated");
  });

  it("quando a sessão termina, os dados da conta saem do cache", async () => {
    // given: uma sessão ativa com dados no cache
    mocks.waitUntilReady.mockResolvedValue();
    mocks.renewSession.mockResolvedValue("token");
    mocks.signedIn = true;
    const queryClient = new QueryClient();
    queryClient.setQueryData(["dashboard", "expenses-by-category", "2026-10"], { total: 600 });
    open(queryClient);
    await act(async () => {});

    // when: a sessão expira (401, refresh recusado ou logout)
    mocks.signedIn = false;
    act(() => mocks.listener?.());

    // then
    expect(queryClient.getQueryData(["dashboard", "expenses-by-category", "2026-10"])).toBeUndefined();
    expect(screen.getByRole("status")).toHaveTextContent("anonymous");
  });

  it("uma renovação do token não apaga o cache", async () => {
    mocks.waitUntilReady.mockResolvedValue();
    mocks.renewSession.mockResolvedValue("token");
    mocks.signedIn = true;
    const queryClient = new QueryClient();
    queryClient.setQueryData(["transactions", "2026-10"], []);
    open(queryClient);
    await act(async () => {});

    act(() => mocks.listener?.());

    expect(queryClient.getQueryData(["transactions", "2026-10"])).toEqual([]);
  });
});
