import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ExpenseCategoriesSheet } from "./ExpenseCategoriesSheet";

const mocks = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn() }));
vi.mock("../../shared/api/client", () => ({ api: mocks }));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});

const ok = (data: unknown, status = 200) => Promise.resolve({ data, response: new Response(null, { status }) });

function open() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <ExpenseCategoriesSheet companyId={7} onClose={() => {}} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.GET.mockReturnValue(ok([
    { id: 1, name: "Impostos", color: "AMBER", icon: "COIN", countsAsPayroll: false, system: true, archived: false },
    { id: 2, name: "Salários e encargos", color: "MINT", icon: "SALARY", countsAsPayroll: true, system: false, archived: false },
  ]));
});

describe("categorias da empresa", () => {
  it("Impostos aparece com cadeado e sem editar; a de folha diz que conta para o Fator R", async () => {
    open();

    expect(await screen.findByRole("img", { name: "Categoria do sistema" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar Impostos" })).not.toBeInTheDocument();
    expect(screen.getByText("Conta como folha (Fator R)")).toBeInTheDocument();
  });

  it("cria uma categoria marcada como folha", async () => {
    mocks.POST.mockReturnValue(ok({ id: 3 }, 201));
    open();
    await userEvent.click(await screen.findByRole("button", { name: "Nova categoria" }));

    await userEvent.type(screen.getByLabelText("Nome da categoria"), "FGTS");
    await userEvent.click(screen.getByRole("checkbox", { name: /Conta como folha/ }));
    await userEvent.click(screen.getByRole("button", { name: "Criar categoria" }));

    expect(mocks.POST.mock.calls[0][1].body).toMatchObject({ name: "FGTS", countsAsPayroll: true, color: "CORAL", icon: "OTHER" });
  });

  it("editar mostra o arquivar, que avisa que encerra as despesas fixas", async () => {
    open();
    await userEvent.click(await screen.findByRole("button", { name: "Editar Salários e encargos" }));

    const form = screen.getByLabelText("Nome da categoria").closest("form")!;
    expect(within(form).getByRole("button", { name: /Arquivar categoria \(encerra as despesas fixas dela\)/ })).toBeInTheDocument();
  });
});
