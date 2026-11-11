import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ExpensesPage } from "./ExpensesPage";
import { ToastProvider } from "../../shared/toast/ToastProvider";
import { currentMonth } from "../../shared/lib/dates";

const mocks = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn(), PATCH: vi.fn() }));
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
const problem = (status: number, detail: string) => Promise.resolve({ error: { detail }, response: new Response(null, { status }) });
const MONTH = currentMonth();

const CATEGORIES = [
  { id: 1, name: "Aluguel", color: "PEACH", icon: "HOME", countsAsPayroll: false, system: false, archived: false },
  { id: 2, name: "Impostos", color: "AMBER", icon: "COIN", countsAsPayroll: false, system: true, archived: false },
  { id: 3, name: "Software", color: "TEAL", icon: "PHONE", countsAsPayroll: false, system: false, archived: false },
];

const ITEMS = [
  { kind: "ONE_OFF", expenseId: 10, name: "Licença IDE", categoryId: 3, amount: 89.9, date: `${MONTH}-03`, status: "PAID", hasReceipt: true },
  { kind: "RECURRING", recurringExpenseId: 20, name: "Aluguel", categoryId: 1, amount: 2000, expectedAmount: 2000,
    date: `${MONTH}-05`, dueDate: `${MONTH}-05`, status: "OVERDUE", hasReceipt: false },
  { kind: "RECURRING", recurringExpenseId: 21, expenseId: 11, name: "Contador", categoryId: 3, amount: 470, expectedAmount: 450,
    date: `${MONTH}-02`, dueDate: `${MONTH}-10`, status: "PAID", hasReceipt: false },
];

function serve() {
  mocks.GET.mockImplementation((path: string) => {
    if (path === "/companies/{companyId}/expenses") return ok({ month: MONTH, paidTotal: 559.9, pendingTotal: 2000, items: ITEMS });
    if (path === "/companies/{companyId}/expense-categories") return ok(CATEGORIES);
    if (path === "/companies/{companyId}/recurring-expenses") return ok([]);
    throw new Error(`GET inesperado: ${path}`);
  });
}

function open() {
  const router = createMemoryRouter(
    [{ path: "/c", element: <Outlet context={{ id: 7, archived: false }} />, children: [{ index: true, element: <ExpensesPage /> }] }],
    { initialEntries: ["/c"] },
  );
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  serve();
});

describe("aba Despesas", () => {
  it("mostra o mês com os totais e o status de cada despesa por texto", async () => {
    open();

    const list = await screen.findByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("R$ 559,90")).toBeInTheDocument();
    expect(within(list).getByText("Atrasada")).toBeInTheDocument();
    expect(within(list).getAllByText("Paga")).toHaveLength(2);
  });

  it("a nova despesa não oferece a categoria Impostos, que é do sistema", async () => {
    open();
    await userEvent.click(await screen.findByRole("button", { name: "Nova despesa" }));

    const sheet = screen.getByRole("dialog", { name: "Nova despesa" });
    expect(within(sheet).getByRole("button", { name: /Aluguel/ })).toBeInTheDocument();
    expect(within(sheet).queryByRole("button", { name: /Impostos/ })).not.toBeInTheDocument();
  });

  it("salva a avulsa e depois sobe o comprovante; se o comprovante falhar, a despesa fica e o aviso diz", async () => {
    mocks.POST.mockReturnValue(ok({ id: 99, name: "Cadeira", amount: 800, categoryId: 1, date: `${MONTH}-02`, hasReceipt: false }, 201));
    mocks.PUT.mockReturnValue(problem(422, "Você atingiu o limite de 50 MB de arquivos."));
    open();
    await userEvent.click(await screen.findByRole("button", { name: "Nova despesa" }));
    const sheet = screen.getByRole("dialog", { name: "Nova despesa" });

    await userEvent.type(within(sheet).getByLabelText("Valor"), "80000");
    await userEvent.type(within(sheet).getByLabelText("Nome"), "Cadeira");
    await userEvent.click(within(sheet).getByRole("button", { name: /Aluguel/ }));
    await userEvent.upload(within(sheet).getByLabelText("Comprovante (opcional)"), new File(["%PDF-"], "recibo.pdf", { type: "application/pdf" }));
    await userEvent.click(within(sheet).getByRole("button", { name: "Salvar despesa" }));

    expect(mocks.POST.mock.calls[0][1].body).toMatchObject({ name: "Cadeira", amount: 800, categoryId: 1 });
    const form = mocks.PUT.mock.calls[0][1].bodySerializer() as FormData;
    expect((form.get("file") as File).name).toBe("recibo.pdf");
    expect(await screen.findByText(/A despesa foi salva, mas o comprovante não subiu/)).toBeInTheDocument();
  });

  it("pagar uma fixa atrasada manda o valor e a data informados", async () => {
    mocks.POST.mockReturnValue(ok({ id: 50 }, 201));
    open();
    await userEvent.click(await screen.findByRole("button", { name: /Aluguel/ }));

    const sheet = screen.getByRole("dialog", { name: "Aluguel" });
    await userEvent.clear(within(sheet).getByLabelText("Valor pago"));
    await userEvent.type(within(sheet).getByLabelText("Valor pago"), "210000");
    await userEvent.click(within(sheet).getByRole("button", { name: "Marcar como paga" }));

    expect(mocks.POST).toHaveBeenCalledWith("/companies/{companyId}/recurring-expenses/{recurringId}/occurrences/{month}/payment", {
      params: { path: { companyId: 7, recurringId: 20, month: MONTH } },
      body: { amount: 2100, date: `${MONTH}-05` },
    });
  });

  it("desfazer o pagamento de uma fixa pede confirmação, e corrigir o pagamento só mexe em valor e data", async () => {
    mocks.DELETE.mockResolvedValue({ response: new Response(null, { status: 204 }) });
    open();
    await userEvent.click(await screen.findByRole("button", { name: /Contador/ }));
    const sheet = screen.getByRole("dialog", { name: "Contador" });

    await userEvent.click(within(sheet).getByRole("button", { name: "Desfazer pagamento" }));
    expect(mocks.DELETE).not.toHaveBeenCalled();
    await userEvent.click(within(sheet).getByRole("button", { name: "Desfazer" }));
    expect(mocks.DELETE).toHaveBeenCalledWith("/companies/{companyId}/recurring-expenses/{recurringId}/occurrences/{month}/payment", {
      params: { path: { companyId: 7, recurringId: 21, month: MONTH } },
    });
  });

  it("a correção do pagamento de uma fixa não mostra nome nem categoria", async () => {
    open();
    await userEvent.click(await screen.findByRole("button", { name: /Contador/ }));
    const sheet = screen.getByRole("dialog", { name: "Contador" });

    await userEvent.click(within(sheet).getByRole("button", { name: "Corrigir valor ou data do pagamento" }));

    expect(within(sheet).getByLabelText("Valor pago")).toBeInTheDocument();
    expect(within(sheet).queryByLabelText("Nome")).not.toBeInTheDocument();
  });
});
