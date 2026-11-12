import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FatorRCard } from "./FatorRCard";

const mocks = vi.hoisted(() => ({ GET: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock("../../shared/api/client", () => ({ api: mocks }));

const ok = (data: unknown, status = 200) => Promise.resolve({ data, response: new Response(null, { status }) });

const NOTICE = "O Fator R é projetado com a receita e a folha previstas do mês. Estimativa do app: confirme com o seu contador.";

/** Os números do teste de integração da API: 20%, falta 2.400, economia de 686. */
const BELOW = {
  applies: true, competence: "2026-12", projectedMonth: "2026-11",
  projection: { invoices: 10000, revenue: 10000, proLabore: 2000, otherPayroll: 0 },
  window: { from: "2026-09", to: "2026-11", revenue: 30000, payroll: 6000 },
  ratio: 0.2, target: 0.28, threshold: 0.28, status: "BELOW_THRESHOLD",
  suggestion: {
    missingPayroll: 2400, partnerId: 3, currentProLabore: 2000, suggestedProLabore: 4400, registered: false,
    savings: 686, dasAnnexIII: 600, dasAnnexV: 1550, extraProLaboreTaxes: 264,
  },
  notice: NOTICE,
};

function serve(monitor: unknown) {
  mocks.GET.mockImplementation((path: string) => {
    if (path === "/companies/{companyId}/fator-r") return ok(monitor);
    throw new Error(`GET inesperado: ${path}`);
  });
}

function open() {
  const router = createMemoryRouter(
    [{ path: "/companies/7", element: <FatorRCard companyId={7} /> }, { path: "/companies/7/:tab", element: <p>aba</p> }],
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
  mocks.PUT.mockReset();
  mocks.DELETE.mockReset();
});

describe("monitor do Fator R", () => {
  it("abaixo de 28%: o Anexo V de dezembro, o pró-labore planejado que resolve e a economia", async () => {
    serve(BELOW);
    open();

    const card = await screen.findByRole("region", { name: "Fator R" });
    expect(within(card).getByRole("heading", { name: "Fator R de dezembro" })).toBeInTheDocument();
    expect(within(card).getByText("Anexo V")).toBeInTheDocument();
    expect(within(card).getByText("20,0%")).toBeInTheDocument();
    expect(within(card).getByText("Abaixo de 28,0%: dezembro vai para o Anexo V.")).toBeInTheDocument();
    const note = within(card).getByRole("note");
    expect(note).toHaveTextContent(/receita prevista de novembro \(R\$\s10\.000,00\), faltam R\$\s2\.400,00 de folha/);
    expect(note).toHaveTextContent(/Aumente o pró-labore planejado de novembro de R\$\s2\.000,00 para R\$\s4\.400,00\./);
    expect(note).toHaveTextContent(/Economia estimada em dezembro: R\$\s686,00/);
    expect(within(note).getByRole("link", { name: "Ajustar o pró-labore" })).toHaveAttribute("href", "/companies/7/withdrawals");
    expect(screen.getByText(NOTICE)).toBeInTheDocument();
  });

  it("com o pró-labore já registrado, manda editar a retirada", async () => {
    serve({ ...BELOW, suggestion: { ...BELOW.suggestion, registered: true } });
    open();
    expect(await screen.findByRole("note")).toHaveTextContent(/Edite o pró-labore de novembro de R\$\s2\.000,00 para R\$\s4\.400,00\./);
  });

  it("economia negativa: diz que o Anexo V sai mais barato", async () => {
    serve({ ...BELOW, suggestion: { ...BELOW.suggestion, savings: -1761.5, extraProLaboreTaxes: 2711.5 } });
    open();
    const note = await screen.findByRole("note");
    expect(note).toHaveTextContent(/custaria R\$\s1\.761,50 a mais do que economiza/);
    expect(note).toHaveTextContent("Neste caso, o Anexo V sai mais barato.");
  });

  it("abaixo só da meta: aviso de folga, sem economia", async () => {
    serve({
      ...BELOW, ratio: 0.29, target: 0.3, status: "BELOW_TARGET",
      suggestion: { missingPayroll: 300, partnerId: 3, currentProLabore: 2900, suggestedProLabore: 3200, registered: false },
    });
    open();
    expect(await screen.findByText("Abaixo da meta")).toBeInTheDocument();
    expect(screen.getByText("Ainda Anexo III, mas abaixo da sua meta de 30,0%.")).toBeInTheDocument();
    expect(screen.getByRole("note")).not.toHaveTextContent(/Economia|mais barato/);
  });

  it("na meta: sem alerta", async () => {
    serve({ ...BELOW, ratio: 0.31, status: "OK", suggestion: undefined });
    open();
    expect(await screen.findByText("Na sua meta (28,0%): Anexo III.")).toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("fora do Simples com Fator R, não aparece", async () => {
    serve({ applies: false, notice: NOTICE });
    open();
    await vi.waitFor(() => expect(mocks.GET).toHaveBeenCalled());
    expect(screen.queryByRole("region", { name: "Fator R" })).not.toBeInTheDocument();
  });

  it("sem o cálculo de 2027, mostra o motivo no lugar do número", async () => {
    serve({ applies: true, competence: "2027-01", projectedMonth: "2026-12",
      projection: { invoices: 0, revenue: 0, proLabore: 0, otherPayroll: 0 },
      unavailable: "O app ainda não calcula o Fator R de 2027.", notice: NOTICE });
    open();
    expect(await screen.findByText("O app ainda não calcula o Fator R de 2027.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Fator R de janeiro" })).toBeInTheDocument();
  });

  it("informa, muda e remove o faturamento esperado", async () => {
    serve(BELOW);
    mocks.PUT.mockImplementation(() => ok({ companyId: 7, amount: 12000, validFrom: "2026-11" }));
    mocks.DELETE.mockImplementation(() => ok(undefined, 204));
    open();

    await userEvent.click(await screen.findByRole("button", { name: "Informar o faturamento esperado" }));
    await userEvent.type(screen.getByLabelText(/Faturamento esperado do mês/), "1200000");
    // Depois de salvar, o monitor é recarregado (a mudança "expectedRevenue") e já traz o valor.
    serve({ ...BELOW, projection: { ...BELOW.projection, expectedRevenue: 12000, revenue: 12000 } });
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(mocks.PUT).toHaveBeenCalledWith("/companies/{companyId}/expected-revenue",
      { params: { path: { companyId: 7 } }, body: { amount: 12000 } });

    await screen.findByText(/R\$\s12\.000,00\/mês/);
    await userEvent.click(screen.getByRole("button", { name: "Mudar o faturamento esperado" }));
    await userEvent.click(screen.getByRole("button", { name: "Não tenho valor fixo" }));
    expect(mocks.DELETE).toHaveBeenCalledWith("/companies/{companyId}/expected-revenue", { params: { path: { companyId: 7 } } });
  });
});
