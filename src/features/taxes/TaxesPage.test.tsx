import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { TaxesPage } from "./TaxesPage";
import { ToastProvider } from "../../shared/toast/ToastProvider";
import { todayIso } from "../../shared/lib/dates";

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

// Vencimentos no passado: o formulário usa o próprio vencimento como data do pagamento.
const DARF = {
  obligationId: 3, kind: "DARF_PREVIDENCIARIO", name: "DARF do pró-labore (INSS e IRRF)", competence: "2026-09",
  dueDate: "2026-10-20", status: "OVERDUE", expectedAmount: 330, declaration: false,
  calculation: { darf: { proLabores: [{ partnerId: 1, partnerName: "Ana", gross: 3000, inss: 330, irrf: 0, registered: true }] } },
};
const DAS = {
  obligationId: 1, kind: "DAS", name: "DAS do Simples Nacional", competence: "2026-09", dueDate: "2026-10-20",
  status: "PAID", expectedAmount: 399, declaration: false,
  calculation: { simples: { revenue: 10000, revenueWithIssWithheld: 10000, rbt12: 120000, rbt12Method: "FIRST_MONTH",
    windowFrom: "2026-09", windowTo: "2026-09", annex: "III", bracket: 1, nominalRate: 0.06, deduction: 0,
    effectiveRate: 0.06, issRate: 0.0201 } },
  payment: { paidAmount: 401.5, paidDate: "2026-10-15", expectedAtPayment: 399, difference: 2.5, expenseId: 9 },
};
const DEFIS = {
  obligationId: 4, kind: "DEFIS", name: "DEFIS (declaração anual do Simples)", competence: "2025-01", dueDate: "2026-03-31",
  status: "PENDING", declaration: true, note: "Declaração anual, sem valor a pagar.",
};

function serve(items: unknown[] = [DARF, DAS]) {
  mocks.GET.mockImplementation((path: string) => {
    if (path === "/companies/{companyId}/taxes") {
      return ok({ month: "2026-10", expectedPending: 330, paidTotal: 401.5, items, notice: "Estimativa calculada pelo app: não substitui o seu contador." });
    }
    throw new Error(`GET inesperado: ${path}`);
  });
}

function open(archived = false) {
  const router = createMemoryRouter(
    [{ path: "/c", element: <Outlet context={{ id: 7, archived }} />, children: [{ index: true, element: <TaxesPage /> }] }],
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

describe("aba Impostos", () => {
  it("mostra os totais, o aviso e cada vencimento com o status por texto", async () => {
    open();

    const list = await screen.findByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).getByText("Atrasado")).toBeInTheDocument();
    expect(within(list).getByText("Pago")).toBeInTheDocument();
    expect(within(list).getByText("R$ 401,50")).toBeInTheDocument();
    expect(screen.getByText("Estimativa calculada pelo app: não substitui o seu contador.")).toBeInTheDocument();
  });

  it("o detalhe do DAS explica a conta e mostra a diferença do pago", async () => {
    open();
    await userEvent.click(await screen.findByRole("button", { name: /DAS do Simples/ }));

    const sheet = screen.getByRole("dialog", { name: "DAS do Simples Nacional" });
    const memory = within(sheet).getByRole("region", { name: "Memória de cálculo" });
    expect(within(memory).getByText("Primeiro mês de atividade: a receita do próprio mês × 12.")).toBeInTheDocument();
    expect(within(memory).getByText("Anexo III, faixa 1")).toBeInTheDocument();
    expect(within(memory).getByText("2,01%")).toBeInTheDocument();
    expect(within(sheet).getByText(/\+R\$\s2,50/)).toBeInTheDocument();
    expect(within(sheet).queryByRole("button", { name: "Marcar como pago" })).not.toBeInTheDocument();
  });

  it("pagar já vem com o previsto e manda o valor e a data", async () => {
    mocks.POST.mockReturnValue(ok({}, 201));
    open();
    await userEvent.click(await screen.findByRole("button", { name: /DARF/ }));

    const sheet = screen.getByRole("dialog", { name: "DARF do pró-labore (INSS e IRRF)" });
    expect((within(sheet).getByLabelText("Valor pago") as HTMLInputElement).value).toMatch(/^R\$\s330,00$/);
    await userEvent.click(within(sheet).getByRole("button", { name: "Marcar como pago" }));

    expect(mocks.POST).toHaveBeenCalledWith("/companies/{companyId}/taxes/{obligationId}/occurrences/{competence}/payment", {
      params: { path: { companyId: 7, obligationId: 3, competence: "2026-09" } },
      body: { amount: 330, date: "2026-10-20" },
    });
  });

  it("a declaração só pede a data da entrega", async () => {
    serve([DEFIS]);
    mocks.POST.mockReturnValue(ok({}, 201));
    open();
    await userEvent.click(await screen.findByRole("button", { name: /DEFIS/ }));

    const sheet = screen.getByRole("dialog", { name: /DEFIS/ });
    expect(within(sheet).queryByLabelText("Valor pago")).not.toBeInTheDocument();
    expect(within(sheet).getByText("ano de 2025")).toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole("button", { name: "Marcar como entregue" }));

    expect(mocks.POST.mock.calls[0][1].body).toEqual({ date: DEFIS.dueDate <= todayIso() ? DEFIS.dueDate : todayIso() });
  });

  it("desfazer pede confirmação e mostra o erro da API", async () => {
    mocks.DELETE.mockReturnValue(problem(404, "Este vencimento não está pago."));
    open();
    await userEvent.click(await screen.findByRole("button", { name: /DAS do Simples/ }));
    const sheet = screen.getByRole("dialog", { name: "DAS do Simples Nacional" });

    await userEvent.click(within(sheet).getByRole("button", { name: "Desfazer pagamento" }));
    expect(within(sheet).getByText(/a despesa de Impostos é apagada junto/)).toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole("button", { name: "Desfazer" }));

    expect(await within(sheet).findByRole("alert")).toHaveTextContent("Este vencimento não está pago.");
  });

  it("empresa arquivada só consulta", async () => {
    open(true);
    await userEvent.click(await screen.findByRole("button", { name: /DARF/ }));

    expect(screen.queryByRole("button", { name: "Marcar como pago" })).not.toBeInTheDocument();
  });
});
