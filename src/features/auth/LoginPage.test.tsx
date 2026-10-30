import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";
import { ApiError } from "../../shared/api/problem";

const mocks = vi.hoisted(() => ({ login: vi.fn() }));
vi.mock("./authApi", () => ({ login: mocks.login }));

afterEach(() => {
  vi.useRealTimers();
});

describe("LoginPage", () => {
  it("depois de muitas tentativas, mostra quanto esperar e só libera o botão no fim", async () => {
    mocks.login.mockRejectedValue(
      new ApiError(429, { detail: "Muitas tentativas em pouco tempo.", retryAfterSeconds: 65 }),
    );
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await user.type(screen.getByLabelText("E-mail"), "ana@exemplo.dev");
    await user.type(screen.getByLabelText("Senha"), "senhaErrada1");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Muitas tentativas. Tente de novo em 1:05.");
    expect(screen.getByRole("button", { name: "Entrar" })).toBeDisabled();

    act(() => vi.advanceTimersByTime(6_000));
    expect(screen.getByRole("alert")).toHaveTextContent("Tente de novo em 59 s.");

    act(() => vi.advanceTimersByTime(59_000));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });
});
