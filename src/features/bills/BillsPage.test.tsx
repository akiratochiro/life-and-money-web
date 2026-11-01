import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BillsPage } from "./BillsPage";
import { formatCents } from "../../shared/lib/money";
import { PrivacyProvider } from "../../shared/privacy/PrivacyProvider";
import type { BillOccurrence } from "./billsApi";

const mocks = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  PUT: vi.fn(),
  DELETE: vi.fn(),
}));

// O cliente da API é substituído; os hooks do TanStack Query rodam de verdade. Assim o teste vê o
// que sai para a API (caminho, parâmetros e corpo), inclusive a conversão de centavos para reais.
vi.mock("../../shared/api/client", () => ({ api: mocks }));

const ok = (data: unknown, status = 200) => Promise.resolve({ data, response: new Response(null, { status }) });
const noContent = () => Promise.resolve({ response: new Response(null, { status: 204 }) });

function occurrence(overrides: Partial<BillOccurrence>): BillOccurrence {
  // Sem dizer o contrário, o vencimento cai num dia útil e o prazo é o próprio dia.
  const dueDate = overrides.dueDate ?? "2026-11-10";
  return {
    billId: 1,
    month: "2026-11",
    dueDate,
    payableUntil: dueDate,
    name: "Aluguel",
    categoryId: 1,
    type: "EXPENSE",
    recurrence: "MONTHLY",
    expectedAmount: 1500,
    status: "OVERDUE",
    ...overrides,
  };
}

const NOVEMBER = [
  occurrence({ billId: 1, name: "Aluguel", dueDate: "2026-11-10", status: "OVERDUE", expectedAmount: 1500 }),
  occurrence({ billId: 2, name: "Luz", dueDate: "2026-11-20", status: "PENDING", expectedAmount: 180, categoryId: 2 }),
  occurrence({
    billId: 3,
    name: "Cliente X",
    dueDate: "2026-11-05",
    status: "PAID",
    type: "INCOME",
    categoryId: 3,
    expectedAmount: 2000,
    paidAmount: 2000,
    paidOn: "2026-11-05",
    transactionId: 99,
  }),
];

const NOVEMBER_HOLIDAYS = {
  year: 2026,
  available: true,
  holidays: [
    { date: "2026-11-02", name: "Finados" },
    { date: "2026-11-15", name: "Proclamação da República" },
    { date: "2026-11-20", name: "Dia da consciência negra" },
  ],
};

const CATEGORIES = [
  { id: 1, name: "Casa", type: "EXPENSE", archived: false },
  { id: 2, name: "Energia", type: "EXPENSE", archived: false },
  { id: 3, name: "Freela", type: "INCOME", archived: false },
];

function open() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <PrivacyProvider>
        <MemoryRouter>
          <BillsPage />
        </MemoryRouter>
      </PrivacyProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // Só o Date é falso: o userEvent continua com os timers de verdade.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 15, 12, 0));
  mocks.GET.mockImplementation((path: string) => {
    if (path === "/bills/occurrences") return ok(NOVEMBER);
    if (path === "/categories") return ok(CATEGORIES);
    if (path === "/bills") return ok([]);
    if (path === "/holidays") return ok(NOVEMBER_HOLIDAYS);
    throw new Error(`GET inesperado: ${path}`);
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("BillsPage", () => {
  it("mostra as ocorrências do mês, o status de cada uma e o que falta pagar e receber", async () => {
    open();

    expect(await screen.findByText("Aluguel")).toBeInTheDocument();
    expect(mocks.GET).toHaveBeenCalledWith("/bills/occurrences", { params: { query: { month: "2026-11" } } });

    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByText("Atrasada")).toBeInTheDocument();
    expect(within(items[1]).getByText("Pendente")).toBeInTheDocument();
    expect(within(items[2]).getByText("Recebida")).toBeInTheDocument();
    // Falta pagar: aluguel + luz. Falta receber: nada, o cliente já pagou.
    expect(screen.getByText("Falta pagar").nextSibling).toHaveTextContent("R$ 1.680,00");
    expect(screen.getByText("Falta receber").nextSibling).toHaveTextContent("R$ 0,00");
  });

  it("destaca os feriados nacionais e avisa que estaduais e municipais não entram", async () => {
    open();
    await screen.findByText("Aluguel");

    expect(mocks.GET).toHaveBeenCalledWith("/holidays", { params: { query: { year: 2026 } } });
    expect(await screen.findByRole("button", { name: "2 de novembro, feriado: Finados" })).toBeInTheDocument();
    expect(
      screen.getByText("Só feriados nacionais, segundo a BrasilAPI. Feriados estaduais e municipais não aparecem nem adiam o prazo."),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "15 de novembro, feriado: Proclamação da República" }));
    expect(screen.getByText("Feriado nacional: Proclamação da República")).toBeInTheDocument();
    expect(screen.getByText("Nada vence neste dia.")).toBeInTheDocument();
  });

  it("sem a BrasilAPI, avisa que os prazos consideram só os fins de semana", async () => {
    mocks.GET.mockImplementation((path: string) => {
      if (path === "/bills/occurrences") return ok(NOVEMBER);
      if (path === "/holidays") return ok({ year: 2026, available: false, holidays: [] });
      throw new Error(`GET inesperado: ${path}`);
    });
    open();

    expect(
      await screen.findByText("Não foi possível carregar os feriados agora. Os prazos consideram só os fins de semana."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2 de novembro" })).not.toHaveAttribute("data-holiday");
  });

  it("um vencimento em dia não útil mostra até quando dá para pagar", async () => {
    mocks.GET.mockImplementation((path: string) => {
      if (path === "/bills/occurrences")
        return ok([occurrence({ name: "Condomínio", dueDate: "2026-11-14", payableUntil: "2026-11-16", status: "PENDING" })]);
      if (path === "/holidays") return ok(NOVEMBER_HOLIDAYS);
      throw new Error(`GET inesperado: ${path}`);
    });
    open();

    expect(await screen.findByText("vence sáb 14 → pague até seg 16")).toBeInTheDocument();
  });

  it("tocar num dia do calendário mostra só o que vence nele", async () => {
    open();
    await screen.findByText("Aluguel");

    await userEvent.click(screen.getByRole("button", { name: "20 de novembro, feriado: Dia da consciência negra: 1 pendente" }));

    expect(screen.getByRole("heading", { name: /Vence em 20 de nov/ })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Luz")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Ver o mês todo" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("paga com um valor diferente do previsto, enviando reais a partir dos centavos", async () => {
    mocks.POST.mockReturnValue(ok({ ...NOVEMBER[1], status: "PAID" }, 201));
    open();
    await screen.findByText("Luz");
    const light = screen.getAllByRole("listitem")[1];

    await userEvent.click(within(light).getByRole("button", { name: "Marcar como paga" }));
    const amount = within(light).getByLabelText("Valor pago");
    // O Intl separa "R$" do número com um espaço não separável, por isso a comparação usa o formatador.
    expect(amount).toHaveValue(formatCents(18000));

    await userEvent.clear(amount);
    await userEvent.type(amount, "21347");
    await userEvent.click(within(light).getByRole("button", { name: "Confirmar" }));

    await waitFor(() =>
      expect(mocks.POST).toHaveBeenCalledWith("/bills/{id}/occurrences/{month}/payment", {
        params: { path: { id: 2, month: "2026-11" } },
        body: { amount: 213.47, paidOn: "2026-11-15" },
      }),
    );
  });

  it("mostra o erro da API ao pagar", async () => {
    mocks.POST.mockReturnValue(
      Promise.resolve({
        error: { detail: "Este mês já está marcado como pago." },
        response: new Response(null, { status: 409 }),
      }),
    );
    open();
    await screen.findByText("Luz");
    const light = screen.getAllByRole("listitem")[1];

    await userEvent.click(within(light).getByRole("button", { name: "Marcar como paga" }));
    await userEvent.click(within(light).getByRole("button", { name: "Confirmar" }));

    expect(await within(light).findByRole("alert")).toHaveTextContent("Este mês já está marcado como pago.");
  });

  it("desfaz um pagamento", async () => {
    mocks.DELETE.mockReturnValue(noContent());
    open();
    await screen.findByText("Cliente X");
    const client = screen.getAllByRole("listitem")[2];

    await userEvent.click(within(client).getByRole("button", { name: "Desfazer" }));

    await waitFor(() =>
      expect(mocks.DELETE).toHaveBeenCalledWith("/bills/{id}/occurrences/{month}/payment", {
        params: { path: { id: 3, month: "2026-11" } },
      }),
    );
  });

  it("cria uma conta mensal com vencimento no dia 31", async () => {
    mocks.POST.mockReturnValue(ok({}, 201));
    open();
    await screen.findByText("Aluguel");

    await userEvent.click(screen.getByRole("button", { name: "Nova conta" }));
    await userEvent.type(screen.getByLabelText("Nome"), "Condomínio");
    await userEvent.type(screen.getByLabelText("Valor previsto"), "60000");
    await userEvent.click(screen.getByRole("button", { name: "Casa" }));
    await userEvent.selectOptions(screen.getByLabelText("Dia do vencimento"), "31");
    expect(screen.getByText("Nos meses sem esse dia, vence no último dia do mês.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    await waitFor(() =>
      expect(mocks.POST).toHaveBeenCalledWith("/bills", {
        body: {
          name: "Condomínio",
          categoryId: 1,
          amount: 600,
          recurrence: "MONTHLY",
          startMonth: "2026-11",
          dueDay: 31,
          endMonth: undefined,
        },
      }),
    );
  });

  it("uma conta única tira o mês e o dia da data de vencimento", async () => {
    mocks.POST.mockReturnValue(ok({}, 201));
    open();
    await screen.findByText("Aluguel");

    await userEvent.click(screen.getByRole("button", { name: "Nova conta" }));
    await userEvent.click(screen.getByRole("button", { name: "A receber" }));
    await userEvent.type(screen.getByLabelText("Nome"), "Reembolso");
    await userEvent.type(screen.getByLabelText("Valor previsto"), "12050");
    await userEvent.click(screen.getByRole("button", { name: "Freela" }));
    await userEvent.click(screen.getByRole("button", { name: "Uma vez" }));
    const date = screen.getByLabelText("Vencimento");
    await userEvent.clear(date);
    await userEvent.type(date, "2027-02-28");

    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    await waitFor(() =>
      expect(mocks.POST).toHaveBeenCalledWith("/bills", {
        body: {
          name: "Reembolso",
          categoryId: 3,
          amount: 120.5,
          recurrence: "ONCE",
          startMonth: "2027-02",
          dueDay: 28,
          endMonth: undefined,
        },
      }),
    );
  });
});
