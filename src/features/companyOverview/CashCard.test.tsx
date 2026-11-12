import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CashCard } from "./CashCard";

/** A frase do governo tem um trecho em negrito: procura o parágrafo pelo texto inteiro. */
const sentence = (pattern: RegExp) => (_: string, element: Element | null) =>
  element?.tagName === "P" && pattern.test(element.textContent ?? "");

const mocks = vi.hoisted(() => ({ GET: vi.fn() }));
vi.mock("../../shared/api/client", () => ({ api: mocks }));

const ok = (data: unknown) => Promise.resolve({ data, response: new Response(null, { status: 200 }) });

const NOTICE = "As notas entram no saldo pela data de emissão. Se o cliente paga depois, o saldo real pode estar menor.";

/** Os números do teste de integração da API: saldo 10.058,50, DARF de outubro a vencer. */
const CASH = {
  asOf: "2026-11-11", openingBalance: 5000, openingBalanceDate: "2026-10-01",
  balance: { total: 10058.5, revenue: 8450, expenses: 721.5, withdrawals: 2670 },
  provision: { total: 1730, currentMonth: 1080, dueSoon: 330, overdue: 320, withoutExpected: 1 },
  available: 8328.5,
  governmentShare: { month: "2026-11", revenue: 12000, amount: 1080, effectiveRate: 0.09, kind: "DAS" },
  notice: NOTICE,
};

function serve(cash: unknown) {
  mocks.GET.mockImplementation((path: string) => {
    if (path === "/companies/{companyId}/cash") return ok(cash);
    throw new Error(`GET inesperado: ${path}`);
  });
}

function open() {
  const router = createMemoryRouter(
    [{ path: "/companies/7", element: <CashCard companyId={7} /> }, { path: "/companies/7/:tab", element: <p>aba</p> }],
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

describe("caixa da empresa", () => {
  it("mostra o disponível em destaque, o saldo, a reserva e a parte do governo", async () => {
    serve(CASH);
    open();

    const card = await screen.findByRole("region", { name: "Caixa da empresa" });
    expect(within(card).getByText(/^R\$\s8\.328,50$/)).toBeInTheDocument();
    expect(within(card).getByText(/^hoje, 11 de nov\.? de 2026$/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Saldo na conta.*10\.058,50/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: /Reserva de impostos.*1\.730,00/ })).toBeInTheDocument();
    expect(screen.getByText(sentence(/^Das notas de novembro \(R\$\s12\.000,00\), R\$\s1\.080,00 já é do governo \(DAS, 9,0%\)\.$/)))
      .toBeInTheDocument();
    expect(screen.getByText(NOTICE)).toBeInTheDocument();
    expect(mocks.GET.mock.calls[0][1].params.path).toEqual({ companyId: 7 });
  });

  it("abre o saldo e a reserva com a conta de onde vêm os números", async () => {
    serve(CASH);
    open();

    await userEvent.click(await screen.findByRole("button", { name: /Saldo na conta/ }));
    expect(screen.getByRole("button", { name: /Saldo na conta/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/^Saldo inicial em 1 de out\.? de 2026$/).nextSibling).toHaveTextContent(/5\.000,00/);
    expect(screen.getByText("+ Notas emitidas (líquido)").nextSibling).toHaveTextContent(/8\.450,00/);
    expect(screen.getByText("− Despesas pagas, com impostos").nextSibling).toHaveTextContent(/721,50/);
    expect(screen.getByText("− Retiradas (líquido)").nextSibling).toHaveTextContent(/2\.670,00/);

    await userEvent.click(screen.getByRole("button", { name: /Reserva de impostos/ }));
    expect(screen.getByText("Do mês corrente (até agora)").nextSibling).toHaveTextContent(/1\.080,00/);
    expect(screen.getByText("A vencer, de meses passados").nextSibling).toHaveTextContent(/330,00/);
    expect(screen.getByRole("link", { name: "Vencidos" })).toHaveAttribute("href", "/companies/7/taxes");
    expect(screen.getByText("1 imposto sem valor previsto ficou fora.")).toBeInTheDocument();
  });

  it("disponível negativo diz quanto falta para os impostos", async () => {
    serve({ ...CASH, balance: { ...CASH.balance, total: 1310 }, available: -420 });
    open();

    const card = await screen.findByRole("region", { name: "Caixa da empresa" });
    expect(within(card).getByText(/^−R\$\s420,00$/)).toBeInTheDocument();
    expect(within(card).getByText(/Faltam R\$\s420,00 para cobrir os impostos\./)).toBeInTheDocument();
  });

  it("no MEI fala do valor fixo, sem alíquota", async () => {
    serve({ ...CASH, governmentShare: { month: "2026-11", revenue: 6000, amount: 81.05, kind: "DAS_MEI" } });
    open();
    expect(await screen.findByText(sentence(/R\$\s81,05 já é do governo \(DAS-MEI, valor fixo\)/))).toBeInTheDocument();
  });

  it("sem nota no mês, diz que ainda não há notas", async () => {
    serve({ ...CASH, governmentShare: { month: "2026-11", revenue: 0, amount: 0, effectiveRate: null, kind: "DAS" } });
    open();
    expect(await screen.findByText("Ainda não há notas em novembro.")).toBeInTheDocument();
  });

  it("sem DAS (Lucro Presumido), não há frase do governo", async () => {
    serve({ ...CASH, governmentShare: undefined });
    open();
    await screen.findByRole("region", { name: "Caixa da empresa" });
    expect(screen.queryByText(/já é do governo/)).not.toBeInTheDocument();
  });

  it("mostra o erro da API", async () => {
    mocks.GET.mockImplementation(() => Promise.resolve({
      error: { title: "Erro", status: 500, detail: "Não deu para calcular o caixa." },
      response: new Response(null, { status: 500 }),
    }));
    open();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não deu para calcular o caixa.");
  });
});
