import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MonthCards } from "./MonthCards";
import { UpcomingCard } from "./UpcomingCard";
import { addMonths, currentMonth } from "../../shared/lib/dates";

const mocks = vi.hoisted(() => ({ GET: vi.fn() }));
vi.mock("../../shared/api/client", () => ({ api: mocks }));

const ok = (data: unknown) => Promise.resolve({ data, response: new Response(null, { status: 200 }) });

const OCTOBER = {
  month: "2026-10", open: false, revenue: 10000, expenses: { paid: 320, pending: 0, total: 320 },
  taxes: { paid: 401.5, expected: 330, total: 731.5, withoutExpected: 0 }, result: 8948.5,
  withdrawals: { total: 3000, count: 1 }, notice: "Os impostos são estimativas do app: não substituem o seu contador.",
};
const NOVEMBER = {
  month: "2026-11", open: true, revenue: 0, expenses: { paid: 0, pending: 120, total: 120 },
  taxes: { paid: 0, expected: 0, total: 0, withoutExpected: 1 }, result: -120, withdrawals: { total: 0, count: 0 }, notice: "",
};

const upcoming = (n: number) => Array.from({ length: n }, (_, i) => ({
  source: i % 2 ? "TAX" : "EXPENSE", name: `Conta ${i + 1}`, dueDate: `2026-11-${String(i + 5).padStart(2, "0")}`,
  amount: i === 1 ? undefined : 100 + i, status: i === 0 ? "OVERDUE" : "PENDING", month: "2026-11",
}));

function serve(overview: unknown, items: unknown[] = []) {
  mocks.GET.mockImplementation((path: string) => {
    if (path === "/companies/{companyId}/overview") return ok(overview);
    if (path === "/companies/{companyId}/upcoming") return ok(items);
    throw new Error(`GET inesperado: ${path}`);
  });
}

function open(element: React.ReactNode) {
  const router = createMemoryRouter(
    [{ path: "/companies/7", element }, { path: "/companies/7/:tab", element: <p>aba</p> }],
    { initialEntries: ["/companies/7"] },
  );
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

// Com chaves: devolver o mock faria o vitest tratá-lo como limpeza e chamá-lo depois do teste.
beforeEach(() => {
  mocks.GET.mockReset();
});

describe("cards do mês", () => {
  it("mostra receita, despesas, impostos, retiradas e o resultado com o sinal", async () => {
    serve(OCTOBER);
    open(<MonthCards companyId={7} />);

    const result = await screen.findByRole("region", { name: "Resultado" });
    expect(within(result).getByText("Resultado")).toBeInTheDocument();
    expect(within(result).getByText(/^\+R\$\s8\.948,50$/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Impostos.*731,50.*330,00 previsto/ })).toHaveAttribute("href", "/companies/7/taxes");
    expect(screen.getByRole("link", { name: /Retiradas.*3\.000,00.*Não entram no resultado/ })).toBeInTheDocument();
    expect(mocks.GET.mock.calls[0][1].params.query).toEqual({ month: currentMonth() });
  });

  it("no mês aberto, avisa a previsão, o negativo e o imposto sem valor", async () => {
    serve(NOVEMBER);
    open(<MonthCards companyId={7} />);

    const result = await screen.findByRole("region", { name: "Resultado" });
    expect(within(result).getByText("Resultado previsto")).toBeInTheDocument();
    expect(within(result).getByText(/^−R\$\s120,00$/)).toBeInTheDocument();
    expect(screen.getByText("1 sem valor previsto")).toBeInTheDocument();
    expect(screen.getByText(/^R\$\s120,00 a pagar$/)).toBeInTheDocument();
    expect(screen.getByText(/O mês ainda não acabou/)).toBeInTheDocument();
  });

  it("trocar de mês busca o mês escolhido", async () => {
    serve(OCTOBER);
    open(<MonthCards companyId={7} />);
    await screen.findByRole("region", { name: "Resultado" });

    await userEvent.click(screen.getByRole("button", { name: "Mês anterior" }));

    const months = mocks.GET.mock.calls.map(([, options]) => options.params.query.month);
    expect(months).toContain(addMonths(currentMonth(), -1));
  });
});

describe("próximos vencimentos", () => {
  it("mostra até 5, com o status por texto, e o link para o resto", async () => {
    serve(OCTOBER, upcoming(7));
    open(<UpcomingCard companyId={7} />);

    const list = await screen.findByRole("list", { name: "Próximos vencimentos" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(5);
    expect(within(list).getByText("Atrasado")).toBeInTheDocument();
    expect(within(list).getByText("Sem valor")).toBeInTheDocument();
    expect(within(list).getByRole("link", { name: /Conta 2/ })).toHaveAttribute("href", "/companies/7/taxes");
    expect(within(list).getByRole("link", { name: /Conta 1/ })).toHaveAttribute("href", "/companies/7/expenses");
    expect(screen.getByText(/E mais 2/)).toBeInTheDocument();
  });

  it("sem nada a vencer, diz isso", async () => {
    serve(OCTOBER, []);
    open(<UpcomingCard companyId={7} />);

    expect(await screen.findByText("Nada atrasado nem vencendo nos próximos 30 dias.")).toBeInTheDocument();
  });
});
