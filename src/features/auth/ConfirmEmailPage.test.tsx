import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfirmEmailPage } from "./ConfirmEmailPage";
import { ApiError } from "../../shared/api/problem";

const mocks = vi.hoisted(() => ({ confirmEmail: vi.fn<(token: string) => Promise<void>>() }));
vi.mock("./authApi", () => ({ confirmEmail: mocks.confirmEmail }));

function open(url: string) {
  const router = createMemoryRouter([{ path: "/confirm-email", element: <ConfirmEmailPage /> }], {
    initialEntries: [url],
  });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

beforeEach(() => {
  mocks.confirmEmail.mockReset();
});

describe("ConfirmEmailPage", () => {
  it("abrir o link não confirma nada: antivírus de e-mail também abrem links", async () => {
    const router = open("/confirm-email?token=abc123");

    await waitFor(() => expect(router.state.location.search).toBe(""));
    expect(screen.getByRole("button", { name: "Confirmar meu e-mail" })).toBeInTheDocument();
    expect(mocks.confirmEmail).not.toHaveBeenCalled();
  });

  it("o botão confirma com o token lido da URL e manda entrar", async () => {
    mocks.confirmEmail.mockResolvedValue();
    open("/confirm-email?token=abc123");

    await userEvent.click(screen.getByRole("button", { name: "Confirmar meu e-mail" }));

    expect(mocks.confirmEmail).toHaveBeenCalledWith("abc123");
    expect(await screen.findByRole("status")).toHaveTextContent("Seu e-mail foi confirmado");
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/login");
  });

  it("um link vencido ou já usado mostra a mensagem da API e leva a um cadastro novo", async () => {
    mocks.confirmEmail.mockRejectedValue(
      new ApiError(400, { detail: "Este link de confirmação é inválido ou expirou." }),
    );
    open("/confirm-email?token=velho");

    await userEvent.click(screen.getByRole("button", { name: "Confirmar meu e-mail" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Este link de confirmação é inválido ou expirou.");
    expect(screen.getByRole("link", { name: "Fazer o cadastro de novo" })).toHaveAttribute("href", "/register");
  });

  it("sem token na URL, nem oferece o botão", () => {
    open("/confirm-email");

    expect(screen.queryByRole("button", { name: "Confirmar meu e-mail" })).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("O link está incompleto");
  });
});
