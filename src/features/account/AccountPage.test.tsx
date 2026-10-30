import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountPage } from "./AccountPage";
import { ApiError } from "../../shared/api/problem";

const mocks = vi.hoisted(() => ({
  deleteAccount: vi.fn<(password: string) => Promise<void>>(),
  downloadAccountExport: vi.fn<() => Promise<void>>(),
  endSession: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("./accountApi", async (original) => ({
  ...(await original<typeof import("./accountApi")>()),
  deleteAccount: mocks.deleteAccount,
  downloadAccountExport: mocks.downloadAccountExport,
}));
vi.mock("../home/homeApi", () => ({
  useMe: () => ({ data: { id: 1, name: "Ana Souza", email: "ana@exemplo.dev", createdAt: "2026-01-15T12:00:00Z" } }),
}));
vi.mock("../auth/useLogout", () => ({ useLogout: () => mocks.logout }));
vi.mock("../../shared/auth/session", () => ({ endSession: mocks.endSession }));

function LoginStub() {
  const state = useLocation().state as { accountDeleted?: boolean } | null;
  return <p>{state?.accountDeleted ? "login: conta excluída" : "login"}</p>;
}

function open() {
  const router = createMemoryRouter(
    [
      { path: "/account", element: <AccountPage /> },
      { path: "/login", element: <LoginStub /> },
    ],
    { initialEntries: ["/account"] },
  );
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

async function startDeletion(confirmation: string, password: string) {
  await userEvent.click(screen.getByRole("button", { name: "Quero excluir minha conta" }));
  if (confirmation) await userEvent.type(screen.getByLabelText("Digite EXCLUIR para confirmar"), confirmation);
  if (password) await userEvent.type(screen.getByLabelText("Sua senha"), password);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AccountPage", () => {
  it("mostra o perfil e deixa sair e exportar os dados", async () => {
    mocks.downloadAccountExport.mockResolvedValue();
    open();

    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
    expect(screen.getByText("ana@exemplo.dev")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Exportar meus dados" }));
    expect(mocks.downloadAccountExport).toHaveBeenCalledOnce();

    await userEvent.click(screen.getByRole("button", { name: "Sair da conta" }));
    expect(mocks.logout).toHaveBeenCalledOnce();
  });

  it("só libera a exclusão com EXCLUIR digitado exatamente e a senha preenchida", async () => {
    open();
    const button = () => screen.getByRole("button", { name: "Excluir minha conta" });

    await startDeletion("excluir", "senha12345");
    expect(button()).toBeDisabled();

    await userEvent.clear(screen.getByLabelText("Digite EXCLUIR para confirmar"));
    await userEvent.type(screen.getByLabelText("Digite EXCLUIR para confirmar"), "EXCLUIR");
    expect(button()).toBeEnabled();

    await userEvent.clear(screen.getByLabelText("Sua senha"));
    expect(button()).toBeDisabled();
    expect(mocks.deleteAccount).not.toHaveBeenCalled();
  });

  it("depois de excluir, encerra a sessão sem dizer que expirou e volta para o login", async () => {
    mocks.deleteAccount.mockResolvedValue();
    open();

    await startDeletion("EXCLUIR", "senha12345");
    await userEvent.click(screen.getByRole("button", { name: "Excluir minha conta" }));

    expect(mocks.deleteAccount).toHaveBeenCalledWith("senha12345");
    expect(mocks.endSession).toHaveBeenCalledWith({ expired: false });
    expect(await screen.findByText("login: conta excluída")).toBeInTheDocument();
  });

  it("com a senha errada, marca o campo e não sai da tela", async () => {
    mocks.deleteAccount.mockRejectedValue(
      new ApiError(403, { detail: "Senha incorreta.", errors: { password: "Senha incorreta." } }),
    );
    open();

    await startDeletion("EXCLUIR", "chute123");
    await userEvent.click(screen.getByRole("button", { name: "Excluir minha conta" }));

    expect(await screen.findByText("Senha incorreta.")).toBeInTheDocument();
    expect(mocks.endSession).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Excluir minha conta" })).toBeInTheDocument();
  });
});
