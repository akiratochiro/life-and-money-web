import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RevenueLimitsCard } from "./RevenueLimitsCard";

const mocks = vi.hoisted(() => ({ GET: vi.fn() }));
vi.mock("../../shared/api/client", () => ({ api: mocks }));

const ok = (data: unknown) => Promise.resolve({ data, response: new Response(null, { status: 200 }) });

const NOTICE = "Conta só as notas lançadas no app, pela competência. Estimativa do app: confirme com o seu contador.";

/** O MEI do teste de integração da API: aberto em setembro, 79% de R$ 27.000. A API manda null nos vazios. */
const MEI = {
  applies: true, year: 2026, years: [2026], regime: "SIMEI", openingYear: true, activityMonths: 4, revenue: 21450,
  projection: { total: 27950, basis: "AVERAGE" }, alert: "MEI_ANNUAL", conditional: null, notice: NOTICE,
  limits: [{
    kind: "MEI_ANNUAL", label: "Limite do MEI", amount: 27000, toleranceAmount: 32400, ratio: 0.7944, level: "WARNING",
    severity: "WARNING", exceededIn: null, effectiveFrom: null, projectedIn: "2026-12",
    message: "Você já faturou 79% do limite do MEI em 2026 (R$ 21.450,00 de R$ 27.000,00). Acima dele, a empresa deixa de ser MEI.",
    projectionMessage: "No ritmo atual, a receita passa do limite do MEI em dezembro de 2026.", source: "LC 123/2006, art. 18-A",
  }],
};

const SIMPLES = {
  applies: true, year: 2026, years: [2026, 2025], regime: "SIMPLES_NACIONAL", openingYear: false, activityMonths: 12, revenue: 400000,
  projection: { total: 600000, basis: "AVERAGE" }, alert: "SIMPLES_EPP", conditional: null, notice: NOTICE,
  limits: [
    { kind: "SIMPLES_EPP", label: "ME → EPP", amount: 360000, toleranceAmount: null, ratio: 1.1111, level: "EXCEEDED", severity: "INFO",
      exceededIn: "2026-04", effectiveFrom: "2027-01", projectedIn: null, projectionMessage: null, source: "",
      message: "A receita de 2026 passou de R$ 360.000,00 em abril de 2026: a partir de janeiro de 2027, a empresa é EPP." },
    { kind: "SIMPLES_SUBLIMIT", label: "Sublimite do ISS", amount: 3600000, toleranceAmount: 4320000, ratio: 0.1111, level: "NONE",
      severity: null, exceededIn: null, effectiveFrom: null, projectedIn: null, message: null, projectionMessage: null, source: "" },
    { kind: "SIMPLES_CEILING", label: "Teto do Simples", amount: 4800000, toleranceAmount: 5760000, ratio: 0.0833, level: "NONE",
      severity: null, exceededIn: null, effectiveFrom: null, projectedIn: null, message: null, projectionMessage: null, source: "" },
  ],
};

function serve(...responses: unknown[]) {
  let call = 0;
  mocks.GET.mockImplementation((path: string) => {
    if (path === "/companies/{companyId}/revenue-limits") return ok(responses[Math.min(call++, responses.length - 1)]);
    throw new Error(`GET inesperado: ${path}`);
  });
}

function open() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RevenueLimitsCard companyId={7} />
    </QueryClientProvider>,
  );
}

// Com chaves: devolver o mock faria o vitest tratá-lo como limpeza e chamá-lo depois do teste.
beforeEach(() => {
  mocks.GET.mockReset();
});

describe("limites de faturamento", () => {
  it("MEI: a barra do limite proporcional, o alerta e o ritmo atual", async () => {
    serve(MEI);
    open();

    const card = await screen.findByRole("region", { name: "Limites de faturamento" });
    expect(within(card).getByText("Limite do MEI")).toBeInTheDocument();
    expect(within(card).getByText("Proporcional: 4 meses de atividade")).toBeInTheDocument();
    expect(within(card).getByText("Atenção")).toBeInTheDocument();
    expect(within(card).getByText(/de R\$\s27\.000,00 · 79%/)).toBeInTheDocument();
    expect(within(card).getByRole("note")).toHaveTextContent(MEI.limits[0].message);
    expect(within(card).getByText("No ritmo atual, a receita passa do limite do MEI em dezembro de 2026.")).toBeInTheDocument();
    expect(within(card).getByText("2026")).toBeInTheDocument();
    expect(screen.getByText(NOTICE)).toBeInTheDocument();
  });

  it("Simples: a barra é do próximo limite, a EPP passada aparece em linha e o aviso não é vermelho", async () => {
    serve(SIMPLES);
    open();

    const card = await screen.findByRole("region", { name: "Limites de faturamento" });
    expect(within(card).getByText("Sublimite do ISS")).toBeInTheDocument();
    expect(within(card).getByText(/de R\$\s3\.600\.000,00 · 11%/)).toBeInTheDocument();
    expect(within(card).getByText("passou em abril de 2026")).toBeInTheDocument();
    expect(within(card).getByRole("note")).toHaveClass("bg-sunken");
    expect(within(card).getByRole("note")).toHaveTextContent(/a empresa é EPP/);
  });

  it("o seletor de ano pede o ano escolhido", async () => {
    serve(SIMPLES, { ...SIMPLES, year: 2025, projection: null });
    open();

    await userEvent.selectOptions(await screen.findByRole("combobox", { name: "Ano" }), "2025");
    expect(mocks.GET).toHaveBeenLastCalledWith("/companies/{companyId}/revenue-limits",
      { params: { path: { companyId: 7 }, query: { year: 2025 } } });
  });

  it("a ressalva da LC 238 aparece quando vem", async () => {
    serve({ ...MEI, conditional: "Os limites do MEI de 2027 em diante dependem do orçamento." });
    open();
    expect(await screen.findByText("Os limites do MEI de 2027 em diante dependem do orçamento.")).toBeInTheDocument();
  });

  it("no Lucro Presumido, no ano corrente, o card não aparece", async () => {
    serve({ applies: false, year: 2026, years: [2026], limits: [], revenue: 0, notice: NOTICE, alert: null });
    open();
    await vi.waitFor(() => expect(mocks.GET).toHaveBeenCalled());
    expect(screen.queryByRole("region", { name: "Limites de faturamento" })).not.toBeInTheDocument();
  });
});
