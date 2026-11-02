import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CategoriesPage } from "./CategoriesPage";
import { ToastProvider } from "../../shared/toast/ToastProvider";
import type { Category } from "./categoriesApi";

const mocks = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn() }));
vi.mock("../../shared/api/client", () => ({ api: mocks }));

const ok = (data: unknown, status = 200) => Promise.resolve({ data, response: new Response(null, { status }) });

const HOME: Category = {
  id: 1, name: "Moradia", type: "EXPENSE", color: "PEACH", icon: "HOME", archived: false, createdAt: "2026-01-01T00:00:00Z",
};

function open() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <ToastProvider>
        <MemoryRouter>
          <CategoriesPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.GET.mockImplementation(() => ok([HOME]));
});

describe("CategoriesPage", () => {
  it("cria com a cor e o ícone escolhidos", async () => {
    mocks.POST.mockReturnValue(ok({ ...HOME, id: 2 }, 201));
    open();
    await screen.findByText("Moradia");

    await userEvent.type(screen.getByLabelText("Nova categoria"), "Pet");
    await userEvent.click(screen.getByRole("radio", { name: "Âmbar" }));
    await userEvent.click(screen.getByRole("radio", { name: "Pet" }));
    await userEvent.click(screen.getByRole("button", { name: "Criar categoria" }));

    await waitFor(() =>
      expect(mocks.POST).toHaveBeenCalledWith("/categories", {
        body: { name: "Pet", type: "EXPENSE", color: "AMBER", icon: "PET" },
      }),
    );
  });

  it("enquanto o usuário não escolhe, a cor e o ícone seguem o tipo", async () => {
    open();
    await screen.findByText("Moradia");

    expect(screen.getByRole("radio", { name: "Coral" })).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: /Receita/ }));
    expect(screen.getByRole("radio", { name: "Menta" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Moeda" })).toBeChecked();

    // depois de escolher, trocar o tipo não desfaz a escolha
    await userEvent.click(screen.getByRole("radio", { name: "Céu" }));
    await userEvent.click(screen.getByRole("button", { name: /Poupança/ }));
    expect(screen.getByRole("radio", { name: "Céu" })).toBeChecked();
  });

  it("editar manda só o que mudou", async () => {
    mocks.PATCH.mockReturnValue(ok({ ...HOME, color: "TEAL" }));
    open();
    const row = (await screen.findByText("Moradia")).closest("li")!;

    await userEvent.click(within(row).getByRole("button", { name: "Editar" }));
    const editing = screen.getByLabelText("Nome").closest("li")!;
    await userEvent.click(within(editing).getByRole("radio", { name: "Verde-água" }));
    await userEvent.click(within(editing).getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(mocks.PATCH).toHaveBeenCalledWith("/categories/{id}", {
        params: { path: { id: 1 } },
        body: { name: undefined, color: "TEAL", icon: undefined },
      }),
    );
  });

  it("sem nenhuma mudança, salvar fica desabilitado", async () => {
    open();
    const row = (await screen.findByText("Moradia")).closest("li")!;

    await userEvent.click(within(row).getByRole("button", { name: "Editar" }));

    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });
});
