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

const OBLIGATIONS = [
  { id: 1, kind: "DAS", name: "DAS do Simples Nacional", recurrence: "MONTHLY", dueDay: 20, dueRule: "POSTPONE", system: true, active: true },
  { id: 2, kind: "DAS_MEI", name: "DAS-MEI", recurrence: "MONTHLY", dueDay: 20, dueRule: "POSTPONE", system: true, active: true },
  { id: 9, kind: "CUSTOM", name: "Taxa de licença", recurrence: "YEARLY", dueDay: 15, dueMonth: 11, dueRule: "POSTPONE",
    fixedAmount: 250, system: false, active: true, startMonth: "2026-01" },
];

const scenario = (proLabore: number, das: number, totalCost: number) => ({
  proLabore, das, effectiveRate: das / 10000, inss: proLabore * 0.11, irrf: 0, netProLabore: proLabore * 0.89, totalCost,
});
const COMPARISON = {
  monthlyRevenue: 10000, target: 0.28, annexIII: scenario(2800, 600, 908), annexV: scenario(1621, 1550, 1728.31),
  savings: 820.31, cheaper: "III", notice: "Estimativa calculada pelo app.",
};

function serve(items: unknown[] = [DARF, DAS]) {
  mocks.GET.mockImplementation((path: string) => {
    if (path === "/companies/{companyId}/obligations") return ok(OBLIGATIONS);
    if (path === "/companies/{companyId}/revenue") return ok({ granularity: "MONTH", from: "", to: "", total: 10000, points: [] });
    if (path === "/companies/{companyId}/pro-labore-calculator") return ok(COMPARISON);
    if (path === "/companies/{companyId}/taxes") {
      return ok({ month: "2026-10", expectedPending: 330, paidTotal: 401.5, items, notice: "Estimativa calculada pelo app: não substitui o seu contador." });
    }
    throw new Error(`GET inesperado: ${path}`);
  });
}

function open(archived = false, taxRegime = "SIMPLES_NACIONAL") {
  const router = createMemoryRouter(
    [{ path: "/c", element: <Outlet context={{ id: 7, archived, currentRegime: { taxRegime } }} />, children: [{ index: true, element: <TaxesPage /> }] }],
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

  describe("obrigações", () => {
    async function openSheet() {
      open();
      await userEvent.click(await screen.findByRole("button", { name: "Obrigações" }));
      return screen.getByRole("dialog", { name: "Obrigações" });
    }

    it("as do sistema têm cadeado, sem editar, e dizem quando não se aplicam ao regime", async () => {
      const sheet = await openSheet();

      expect(await within(sheet).findAllByLabelText("Obrigação do sistema")).toHaveLength(2);
      expect(within(sheet).queryByRole("button", { name: "Editar DAS do Simples Nacional" })).not.toBeInTheDocument();
      expect(within(sheet).getByText(/não se aplica ao regime atual/)).toBeInTheDocument();
      expect(within(sheet).getByText("15 de novembro, todo ano")).toBeInTheDocument();
    });

    it("desativar manda só o active", async () => {
      mocks.PATCH.mockReturnValue(ok({ ...OBLIGATIONS[0], active: false }));
      const sheet = await openSheet();

      await userEvent.click(await within(sheet).findByLabelText("DAS do Simples Nacional ativa"));

      expect(mocks.PATCH).toHaveBeenCalledWith("/companies/{companyId}/obligations/{obligationId}", {
        params: { path: { companyId: 7, obligationId: 1 } },
        body: { active: false, changes: undefined },
      });
    });

    it("cria uma anual com o mês, sem valor fixo", async () => {
      mocks.POST.mockReturnValue(ok({ id: 10 }, 201));
      const sheet = await openSheet();
      await userEvent.click(await within(sheet).findByRole("button", { name: "Nova obrigação" }));

      await userEvent.type(within(sheet).getByLabelText("Nome da obrigação"), "Alvará");
      await userEvent.selectOptions(within(sheet).getByLabelText("Recorrência"), "YEARLY");
      await userEvent.selectOptions(within(sheet).getByLabelText("Mês"), "3");
      await userEvent.click(within(sheet).getByRole("button", { name: "Criar obrigação" }));

      expect(mocks.POST.mock.calls[0][1].body).toMatchObject({
        name: "Alvará", recurrence: "YEARLY", dueDay: 10, dueMonth: 3, dueRule: "POSTPONE", fixedAmount: undefined,
      });
    });

    it("excluir uma personalizada com pagamento mostra a recusa da API", async () => {
      mocks.DELETE.mockReturnValue(problem(409, "Esta obrigação tem pagamentos registrados: desative em vez de excluir."));
      const sheet = await openSheet();
      await userEvent.click(await within(sheet).findByRole("button", { name: "Editar Taxa de licença" }));

      await userEvent.click(within(sheet).getByRole("button", { name: "Excluir obrigação" }));
      await userEvent.click(within(sheet).getByRole("button", { name: "Excluir" }));

      expect(await within(sheet).findByRole("alert")).toHaveTextContent("desative em vez de excluir");
    });
  });

  describe("calculadora de pró-labore", () => {
    const calls = () => mocks.GET.mock.calls.filter(([path]) => path === "/companies/{companyId}/pro-labore-calculator");

    it("começa com a receita do mês passado e já mostra a comparação", async () => {
      open();
      await userEvent.click(await screen.findByRole("button", { name: "Calculadora de pró-labore" }));
      const sheet = screen.getByRole("dialog", { name: "Calculadora de pró-labore" });

      const comparison = await within(sheet).findByRole("region", { name: "Comparação" });
      expect((within(sheet).getByLabelText("Faturamento do mês") as HTMLInputElement).value).toMatch(/10\.000,00/);
      expect(calls()[0][1].params.query).toEqual({ monthlyRevenue: 10000, otherPayroll: 0 });
      expect(within(comparison).getByText("Mais barato")).toBeInTheDocument();
      expect(within(comparison).getByText(/a menos por mês do que no Anexo V/)).toBeInTheDocument();
    });

    it("recalcula só ao tocar em Calcular", async () => {
      open();
      await userEvent.click(await screen.findByRole("button", { name: "Calculadora de pró-labore" }));
      const sheet = screen.getByRole("dialog", { name: "Calculadora de pró-labore" });
      await within(sheet).findByRole("region", { name: "Comparação" });

      await userEvent.type(within(sheet).getByLabelText("Outros salários do mês"), "150000");
      expect(calls()).toHaveLength(1);
      await userEvent.click(within(sheet).getByRole("button", { name: "Calcular" }));

      expect(calls().at(-1)![1].params.query).toEqual({ monthlyRevenue: 10000, otherPayroll: 1500 });
    });

    it("não aparece para o MEI", async () => {
      open(false, "SIMEI");
      await screen.findByRole("button", { name: "Obrigações" });

      expect(screen.queryByRole("button", { name: "Calculadora de pró-labore" })).not.toBeInTheDocument();
    });
  });
});
