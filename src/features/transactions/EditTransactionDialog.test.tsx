import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { EditTransactionDialog } from "./EditTransactionDialog";
import type { Transaction } from "./transactionsApi";
import { ToastProvider } from "../../shared/toast/ToastProvider";
import { CelebrateProvider } from "../../shared/celebrate/CelebrateProvider";

const mocks = vi.hoisted(() => ({ GET: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock("../../shared/api/client", () => ({ api: mocks }));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
});

const ok = (data: unknown, status = 200) => Promise.resolve({ data, response: new Response(null, { status }) });
const CATEGORY = { id: 30, name: "Pró-labore", type: "INCOME" as const, archived: false, color: "TEAL" as const, icon: "SALARY" as const, createdAt: "" };

/** O pró-labore de 10/2026 lançado nas finanças (Fase 6): líquido de 2.670,00 em 30/10. */
const LAUNCHED: Transaction = {
  id: 900, categoryId: 30, amount: 2670, transactionDate: "2026-10-30", description: "Pró-labore 10/2026 · Ana Design",
  createdAt: "", updatedAt: "",
  origin: { kind: "WITHDRAWAL", label: "Pró-labore 10/2026 · Ana Design", companyId: 7, withdrawalId: 50, editable: true },
};

function open(transaction: Transaction) {
  const router = createMemoryRouter(
    [{ path: "/", element: <EditTransactionDialog transaction={transaction} category={CATEGORY} onClose={() => {}} /> }],
  );
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <ToastProvider>
        <CelebrateProvider>
          <RouterProvider router={router} />
        </CelebrateProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
  return screen.getByRole("dialog", { name: "Editar transação" });
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.GET.mockImplementation((path: string) => ok(path === "/categories" ? [CATEGORY] : []));
  mocks.DELETE.mockReturnValue(Promise.resolve({ response: new Response(null, { status: 204 }) }));
});

describe("transação lançada por uma retirada", () => {
  it("mostra valor e data só para leitura, com a origem e o link para a empresa", () => {
    const dialog = open(LAUNCHED);

    const locked = within(dialog).getByRole("region", { name: "Valor e data" });
    expect(within(locked).getByText(/^R\$\s2\.670,00$/)).toBeInTheDocument();
    expect(within(locked).getByText(/Vem de Pró-labore 10\/2026 · Ana Design/)).toBeInTheDocument();
    expect(within(locked).getByRole("link", { name: "na página da empresa" })).toHaveAttribute("href", "/companies/7/withdrawals");
    expect(within(dialog).queryByLabelText("Valor")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("group", { name: "Tipo de transação" })).not.toBeInTheDocument();
  });

  it("salvar manda o mesmo valor e a mesma data, com a descrição nova", async () => {
    mocks.PUT.mockReturnValue(ok({ ...LAUNCHED, description: "Meu pró-labore" }));
    const dialog = open(LAUNCHED);

    const description = within(dialog).getByLabelText("Descrição (opcional)");
    await userEvent.clear(description);
    await userEvent.type(description, "Meu pró-labore");
    await userEvent.click(within(dialog).getByRole("button", { name: "Salvar alterações" }));

    expect(mocks.PUT.mock.calls[0][1].body).toMatchObject({ amount: 2670, transactionDate: "2026-10-30", description: "Meu pró-labore" });
  });

  it("apagar pergunta pela retirada: as duas vão pela exclusão da retirada", async () => {
    const dialog = open(LAUNCHED);

    await userEvent.click(within(dialog).getByRole("button", { name: "Apagar transação" }));
    expect(within(dialog).getByText(/Apagar também a retirada na empresa\?/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Apagar as duas" }));

    expect(mocks.DELETE).toHaveBeenCalledWith("/companies/{companyId}/withdrawals/{withdrawalId}", {
      params: { path: { companyId: 7, withdrawalId: 50 }, query: { deletePersonal: true } },
    });
  });

  it("só o lançamento apaga a transação, e a retirada fica", async () => {
    const dialog = open(LAUNCHED);

    await userEvent.click(within(dialog).getByRole("button", { name: "Apagar transação" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Só o lançamento" }));

    expect(mocks.DELETE).toHaveBeenCalledWith("/transactions/{id}", { params: { path: { id: 900 } } });
  });

  it("com a empresa arquivada, só apaga o lançamento", async () => {
    const dialog = open({ ...LAUNCHED, origin: { ...LAUNCHED.origin!, editable: false } });

    expect(within(dialog).getByText(/a empresa está arquivada/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Apagar transação" }));

    expect(within(dialog).queryByRole("button", { name: "Apagar as duas" })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Apagar" })).toBeInTheDocument();
  });
});
