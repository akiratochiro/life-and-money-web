import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FiscalCalendar } from "./FiscalCalendar";
import { event } from "./testEvents";

const mocks = vi.hoisted(() => ({ GET: vi.fn() }));
vi.mock("../../shared/api/client", () => ({ api: mocks }));

const ok = (data: unknown) => Promise.resolve({ data, response: new Response(null, { status: 200 }) });

const DAS = event();
const RENT = event({
  id: "BILL:5:2026-11", source: "BILL", scope: "PF", company: null, title: "Aluguel", detail: null,
  dueDate: "2026-11-15", payableUntil: "2026-11-16", expectedAmount: 1500, link: { kind: "BILLS", companyId: null, month: "2026-11" },
});
const ACCOUNTANT = event({
  id: "COMPANY_EXPENSE:2:2026-11", source: "COMPANY_EXPENSE", title: "Contador", detail: "Despesa fixa",
  dueDate: "2026-11-10", status: "OVERDUE", expectedAmount: 500, link: { kind: "COMPANY_EXPENSES", companyId: 3, month: "2026-11" },
});

const COMPANIES = [{ id: 3, name: "Estúdio Ana", emoji: "🎨" }, { id: 4, name: "Loja Bia", emoji: "🛍️" }];

function serve({ events = [ACCOUNTANT, RENT, DAS], reminders = { overdue: [ACCOUNTANT], nextDays: [RENT], count: 2 } } = {}) {
  mocks.GET.mockImplementation((path: string) => {
    if (path === "/calendar") return ok(events);
    if (path === "/calendar/reminders") return ok(reminders);
    if (path === "/holidays") return ok({ year: 2026, available: true, source: "BRASIL_API", holidays: [] });
    if (path === "/companies") return ok(COMPANIES);
    throw new Error(`GET inesperado: ${path}`);
  });
}

function open(element: React.ReactNode, initial = "/calendar") {
  const router = createMemoryRouter(
    [{ path: "/calendar", element }, { path: "*", element: <p>destino</p> }],
    { initialEntries: [initial] },
  );
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

/** Os pedidos do calendário: o mês na tela e os vizinhos que o prefetch busca. */
const calendarCalls = () => mocks.GET.mock.calls.filter(([path]) => path === "/calendar").map(([, options]) => options.params.query);

// Com chaves: devolver o mock faria o vitest tratá-lo como limpeza e chamá-lo depois do teste.
beforeEach(() => {
  mocks.GET.mockReset();
  vi.useFakeTimers({ shouldAdvanceTime: true, now: new Date(2026, 10, 12, 12) });
});
afterEach(() => {
  vi.useRealTimers();
});

describe("calendário fiscal", () => {
  it("pede o mês inteiro e mostra os vencimentos, com empresa, detalhe, valor e status", async () => {
    serve();
    open(<FiscalCalendar />);

    const list = await screen.findByRole("list", { name: "Vencimentos" });
    expect(calendarCalls()).toContainEqual({ from: "2026-11-01", to: "2026-11-30", scope: "ALL" });
    const items = within(list).getAllByRole("link");
    expect(items[0]).toHaveTextContent(/Contador.*Venceu em 10 de nov\. de 2026 · Estúdio Ana · Despesa fixa.*R\$\s500,00.*Atrasado/);
    expect(items[0]).toHaveAttribute("href", "/companies/3/expenses");
    expect(items[1]).toHaveTextContent(/Aluguel.*R\$\s1\.500,00.*Pendente/);
    expect(items[1]).toHaveAttribute("href", "/bills");
    expect(items[2]).toHaveAttribute("href", "/companies/3/taxes");
    expect(screen.getByRole("button", { name: /^10 de novembro: 1 atrasado$/ })).toBeInTheDocument();
    expect(screen.getByText(/Só feriados nacionais/)).toBeInTheDocument();
  });

  it("\"Pede atenção\" mostra os atrasados e os próximos 7 dias", async () => {
    serve();
    open(<FiscalCalendar />);

    const attention = await screen.findByRole("region", { name: "Pede atenção" });
    expect(within(attention).getByRole("heading")).toHaveTextContent("Pede atenção (2)");
    expect(within(attention).getAllByRole("link").map((link) => link.textContent)).toEqual([
      expect.stringContaining("Contador"), expect.stringContaining("Aluguel"),
    ]);
  });

  it("sem nada pedindo atenção, a seção some", async () => {
    serve({ reminders: { overdue: [], nextDays: [], count: 0 } });
    open(<FiscalCalendar />);
    await screen.findByRole("list", { name: "Vencimentos" });
    expect(screen.queryByRole("region", { name: "Pede atenção" })).not.toBeInTheDocument();
  });

  it("o filtro vai para a URL e muda o pedido; a empresa escolhida filtra as empresas", async () => {
    serve();
    const router = open(<FiscalCalendar />);
    await screen.findByRole("list", { name: "Vencimentos" });

    await userEvent.click(screen.getByRole("button", { name: "Pessoal" }));
    expect(router.state.location.search).toBe("?scope=PF");
    expect(calendarCalls()).toContainEqual({ from: "2026-11-01", to: "2026-11-30", scope: "PF" });
    expect(screen.queryByRole("combobox", { name: "Empresa" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Tudo" }));
    await userEvent.selectOptions(await screen.findByRole("combobox", { name: "Empresa" }), "4");
    expect(router.state.location.search).toBe("?scope=PJ&company=4");
    expect(calendarCalls()).toContainEqual({ from: "2026-11-01", to: "2026-11-30", scope: "PJ", companyId: 4 });
  });

  it("escolher um dia mostra só os vencimentos dele", async () => {
    serve();
    open(<FiscalCalendar />);
    await screen.findByRole("list", { name: "Vencimentos" });

    await userEvent.click(screen.getByRole("button", { name: /^15 de novembro/ }));
    expect(screen.getByRole("heading", { name: /Vence em 15 de nov/ })).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Vencimentos" })).getAllByRole("link")).toHaveLength(1);
  });

  it("na aba da empresa, fica travado nela, sem filtro", async () => {
    serve({ events: [ACCOUNTANT, DAS] });
    open(<FiscalCalendar companyId={3} />);

    await screen.findByRole("list", { name: "Vencimentos" });
    expect(calendarCalls()).toContainEqual({ from: "2026-11-01", to: "2026-11-30", scope: "PJ", companyId: 3 });
    expect(screen.queryByRole("group", { name: "Mostrar" })).not.toBeInTheDocument();
  });

  it("um mês vazio diz que nada vence", async () => {
    serve({ events: [], reminders: { overdue: [], nextDays: [], count: 0 } });
    open(<FiscalCalendar />);
    expect(await screen.findByText("Nada vence neste mês.")).toBeInTheDocument();
  });
});
