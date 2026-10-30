import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionProvider } from "./SessionProvider";
import { useSessionStatus } from "./sessionContext";

const mocks = vi.hoisted(() => ({
  waitUntilReady: vi.fn<() => Promise<void>>(),
  renewSession: vi.fn<() => Promise<string | null>>(),
}));

vi.mock("../../shared/api/serverWake", () => ({
  serverWake: { waitUntilReady: mocks.waitUntilReady },
}));

vi.mock("../../shared/auth/session", () => ({
  renewSession: mocks.renewSession,
  isSignedIn: () => false,
  onSessionChange: () => () => {},
}));

function Status() {
  return <output>{useSessionStatus()}</output>;
}

beforeEach(() => {
  mocks.waitUntilReady.mockReset();
  mocks.renewSession.mockReset();
});

describe("SessionProvider", () => {
  it("só tenta recuperar a sessão depois que o servidor acorda", async () => {
    let wakeUp = () => {};
    mocks.waitUntilReady.mockReturnValue(new Promise((resolve) => (wakeUp = resolve)));
    mocks.renewSession.mockResolvedValue("token");

    render(
      <SessionProvider>
        <Status />
      </SessionProvider>,
    );

    expect(mocks.renewSession).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("loading");

    await act(async () => wakeUp());

    expect(mocks.renewSession).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("authenticated");
  });
});
