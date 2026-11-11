import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { CompanyLayout } from "./CompanyLayout";
import { CompanyOverviewPage } from "./CompanyOverviewPage";

const mocks = vi.hoisted(() => ({ GET: vi.fn(), DELETE: vi.fn() }));
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
const problem = (status: number, detail: string) =>
  Promise.resolve({ error: { detail }, response: new Response(null, { status }) });

const SIMPLES = { id: 2, legalNature: "SLU", taxRegime: "SIMPLES_NACIONAL", annexConfig: "FATOR_R", validFrom: "2025-03" };
const MEI = { id: 1, legalNature: "MEI", taxRegime: "SIMEI", meiActivity: "SERVICOS", validFrom: "2024-03", validTo: "2025-02" };

function company(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    name: "Ana Design",
    emoji: "🎨",
    cnpj: "12ABC34501DE35",
    openingDate: "2024-03-10",
    openingDateEditable: false,
    revenueBasis: "COMPETENCIA",
    fatorRTarget: 0.28,
    openingBalance: 1500,
    openingBalanceDate: "2024-03-10",
    currentRegime: SIMPLES,
    archived: false,
    createdAt: "",
    ...overrides,
  };
}

function serve(data: { company?: unknown; regimes?: unknown[]; companyStatus?: number } = {}) {
  mocks.GET.mockImplementation((path: string) => {
    if (path === "/companies/{id}") {
      return data.companyStatus ? problem(data.companyStatus, "Empresa não encontrada.") : ok(data.company ?? company());
    }
    if (path === "/companies/{id}/regimes") return ok(data.regimes ?? [MEI, SIMPLES]);
    if (path === "/companies/{companyId}/partners") return ok([{ id: 3, name: "Ana Souza", me: true }]);
    if (path === "/companies/{companyId}/revenue") return ok({ granularity: "MONTH", from: "", to: "", total: 0, points: [] });
    throw new Error(`GET inesperado: ${path}`);
  });
}

function open() {
  const router = createMemoryRouter(
    [{ path: "/companies/:companyId", element: <CompanyLayout />, children: [{ index: true, element: <CompanyOverviewPage /> }] }],
    { initialEntries: ["/companies/7"] },
  );
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mocks.GET.mockReset();
  mocks.DELETE.mockReset();
});

describe("página da empresa", () => {
  it("mostra o cabeçalho, os dados e o histórico do mais recente ao mais antigo", async () => {
    serve();
    open();

    expect(await screen.findByRole("heading", { name: "Ana Design" })).toBeInTheDocument();
    expect(screen.getByText("SLU · Simples Nacional · Fator R")).toBeInTheDocument();
    expect(screen.getByText("12.ABC.345/01DE-35")).toBeInTheDocument();
    expect(await screen.findByText("Ana Souza (você)")).toBeInTheDocument();

    const history = await screen.findAllByRole("listitem");
    expect(history.map((item) => item.textContent)).toEqual([
      "SLU · Simples Nacional · Fator RDesde março de 2025",
      "MEI · SIMEI · ServiçosDe março de 2024 a fevereiro de 2025",
    ]);
  });

  it("desfazer a última mudança pede confirmação antes de chamar a API", async () => {
    serve();
    mocks.DELETE.mockReturnValue(ok([{ ...MEI, validTo: undefined }]));
    open();

    await userEvent.click(await screen.findByRole("button", { name: "Desfazer última mudança" }));
    expect(mocks.DELETE).not.toHaveBeenCalled();
    expect(screen.getByText(/Desfazer a mudança de março de 2025\?/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Desfazer" }));
    expect(mocks.DELETE).toHaveBeenCalledWith("/companies/{id}/regimes/latest", { params: { path: { id: 7 } } });
  });

  it("com um enquadramento só, não oferece desfazer", async () => {
    serve({ company: company({ currentRegime: { ...MEI, validTo: undefined } }), regimes: [{ ...MEI, validTo: undefined }] });
    open();

    expect(await screen.findByRole("button", { name: "Mudar enquadramento" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desfazer última mudança" })).not.toBeInTheDocument();
  });

  it("uma empresa arquivada é só leitura, com o desarquivar à vista", async () => {
    serve({ company: company({ archived: true }) });
    open();

    expect(await screen.findByText("Arquivada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desarquivar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mudar enquadramento" })).not.toBeInTheDocument();
  });

  it("no Lucro Presumido, avisa que os impostos são lançados à mão", async () => {
    const presumido = { id: 4, legalNature: "LTDA", taxRegime: "LUCRO_PRESUMIDO", validFrom: "2024-03" };
    serve({ company: company({ currentRegime: presumido }), regimes: [presumido] });
    open();

    expect(await screen.findByRole("note")).toHaveTextContent("o app não calcula os impostos");
  });

  it("editar abre a folha com os dados atuais", async () => {
    serve();
    open();

    await userEvent.click(await screen.findByRole("button", { name: "Editar" }));

    const sheet = screen.getByRole("dialog", { name: "Editar empresa" });
    expect(within(sheet).getByLabelText("Nome da empresa")).toHaveValue("Ana Design");
    expect(within(sheet).getByRole("button", { name: "Arquivar empresa" })).toBeInTheDocument();
  });

  it("uma empresa de outro usuário (404) mostra que não foi encontrada", async () => {
    serve({ companyStatus: 404 });
    open();

    expect(await screen.findByText("Empresa não encontrada.")).toBeInTheDocument();
  });
});
