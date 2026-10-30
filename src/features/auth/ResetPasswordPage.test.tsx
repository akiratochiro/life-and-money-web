import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordPage } from "./ResetPasswordPage";
import { ApiError } from "../../shared/api/problem";

const mocks = vi.hoisted(() => ({ resetPassword: vi.fn<(token: string, password: string) => Promise<void>>() }));
vi.mock("./authApi", () => ({ resetPassword: mocks.resetPassword }));

function open(url: string) {
  const router = createMemoryRouter(
    [
      { path: "/reset-password", element: <ResetPasswordPage /> },
      { path: "/forgot-password", element: <p>pedido</p> },
    ],
    { initialEntries: [url] },
  );
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

async function fillAndSubmit(password: string, confirmation = password) {
  await userEvent.type(screen.getByLabelText("Senha nova"), password);
  await userEvent.type(screen.getByLabelText("Repita a senha nova"), confirmation);
  await userEvent.click(screen.getByRole("button", { name: "Salvar senha nova" }));
}

beforeEach(() => {
  mocks.resetPassword.mockReset();
});

describe("ResetPasswordPage", () => {
  it("tira o token da URL assim que a página o lê", async () => {
    const router = open("/reset-password?token=abc123");

    await waitFor(() => expect(router.state.location.search).toBe(""));
    expect(router.state.location.pathname).toBe("/reset-password");
    expect(screen.getByLabelText("Senha nova")).toBeInTheDocument();
  });

  it("envia o token lido da URL junto com a senha nova", async () => {
    mocks.resetPassword.mockResolvedValue();
    open("/reset-password?token=abc123");

    await fillAndSubmit("senhaNova987");

    expect(mocks.resetPassword).toHaveBeenCalledWith("abc123", "senhaNova987");
    expect(await screen.findByRole("status")).toHaveTextContent("saímos da sua conta em todos os aparelhos");
  });

  it("não envia quando as duas senhas são diferentes", async () => {
    open("/reset-password?token=abc123");

    await fillAndSubmit("senhaNova987", "senhaNova988");

    expect(screen.getByText("As duas senhas não são iguais.")).toBeInTheDocument();
    expect(mocks.resetPassword).not.toHaveBeenCalled();
  });

  it("oferece pedir outro link quando a API recusa o token", async () => {
    mocks.resetPassword.mockRejectedValue(
      new ApiError(400, { detail: "Este link para criar uma senha nova é inválido ou expirou. Peça outro." }),
    );
    open("/reset-password?token=vencido");

    await fillAndSubmit("senhaNova987");

    expect(await screen.findByRole("alert")).toHaveTextContent("inválido ou expirou");
    expect(screen.getByRole("link", { name: "Pedir outro link" })).toHaveAttribute("href", "/forgot-password");
  });

  it("mostra no campo a regra de senha que a API recusou, sem gastar o link", async () => {
    mocks.resetPassword.mockRejectedValue(
      new ApiError(400, { errors: { newPassword: "A senha deve ter entre 8 e 72 caracteres." } }),
    );
    open("/reset-password?token=abc123");

    await fillAndSubmit("senhaNova987");

    expect(await screen.findByText("A senha deve ter entre 8 e 72 caracteres.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar senha nova" })).toBeInTheDocument();
  });

  it("explica o que fazer quando o link chega sem token", () => {
    open("/reset-password");

    expect(screen.getByRole("alert")).toHaveTextContent("O link está incompleto");
    expect(mocks.resetPassword).not.toHaveBeenCalled();
  });
});
