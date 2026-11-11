import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { WithdrawalsPage } from "./WithdrawalsPage";
import { ToastProvider } from "../../shared/toast/ToastProvider";
import { currentMonth, todayIso } from "../../shared/lib/dates";

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

const PARTNERS = [{ id: 1, name: "Ana", me: true }, { id: 2, name: "Bruno", me: false }];
const PRO_LABORE = {
  id: 50, partnerId: 1, kind: "PRO_LABORE", competenceMonth: "2026-10", paymentDate: "2026-10-30",
  grossAmount: 7000, inssAmount: 770, irrfAmount: 757.91, netAmount: 5472.09, calculated: true, warnings: [],
};
const PROFIT = {
  id: 51, partnerId: 1, kind: "DISTRIBUICAO_LUCROS", paymentDate: "2026-10-31", grossAmount: 3000, inssAmount: 0,
  irrfAmount: 0, netAmount: 3000, calculated: true, warnings: [], personalTransactionId: 900,
};
const CATEGORIES = [
  { id: 30, name: "Salário", type: "INCOME", archived: false, color: "MINT", icon: "SALARY" },
  { id: 31, name: "Mercado", type: "EXPENSE", archived: false, color: "CORAL", icon: "CART" },
];

function serve(categories: unknown[] = CATEGORIES) {
  mocks.GET.mockImplementation((path: string) => {
    if (path === "/companies/{companyId}/partners") return ok(PARTNERS);
    if (path === "/companies/{companyId}/pro-labore-plans") return ok([{ partnerId: 1, grossAmount: 7000, validFrom: "2026-11" }]);
    if (path === "/companies/{companyId}/withdrawals") return ok([PRO_LABORE, PROFIT]);
    if (path === "/categories") return ok(categories);
    throw new Error(`GET inesperado: ${path}`);
  });
}

function open({ archived = false, taxRegime = "SIMPLES_NACIONAL" } = {}) {
  const router = createMemoryRouter(
    [{ path: "/c", element: <Outlet context={{ id: 7, archived, currentRegime: { taxRegime } }} />,
      children: [{ index: true, element: <WithdrawalsPage /> }] }],
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

async function openNew() {
  await userEvent.click(await screen.findByRole("button", { name: "Registrar retirada" }));
  return screen.getByRole("dialog", { name: "Registrar retirada" });
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  serve();
});

describe("aba Retiradas", () => {
  it("mostra o planejado e as retiradas do ano, com a lançada nas finanças marcada", async () => {
    open();

    expect(await screen.findByText(/por mês, desde 11\/2026/)).toBeInTheDocument();
    const list = await screen.findByRole("list", { name: `Retiradas de ${new Date().getFullYear()}` });
    expect(within(list).getByText(/Pró-labore 10\/2026 · Ana/)).toBeInTheDocument();
    expect(within(list).getByText(/IRRF R\$\s757,91/)).toBeInTheDocument();
    expect(within(list).getByText(/^Lucros · Ana$/)).toBeInTheDocument();
    expect(within(list).getByText(/lançada nas suas finanças/)).toBeInTheDocument();
  });

  it("planejar manda o bruto para o sócio", async () => {
    mocks.PUT.mockReturnValue(ok({ partnerId: 2, grossAmount: 3000, validFrom: "2026-11" }));
    open();
    await userEvent.click(await screen.findByRole("button", { name: "Planejar o pró-labore de Bruno" }));

    await userEvent.type(screen.getByLabelText("Pró-labore planejado de Bruno"), "300000");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(mocks.PUT).toHaveBeenCalledWith("/companies/{companyId}/partners/{partnerId}/pro-labore-plan", {
      params: { path: { companyId: 7, partnerId: 2 } },
      body: { grossAmount: 3000 },
    });
  });

  it("registra o pró-labore, mostra os avisos e oferece lançar com a categoria padrão nova", async () => {
    const saved = { ...PRO_LABORE, id: 52, grossAmount: 1000, netAmount: 890, warnings: ["O pró-labore está abaixo do salário mínimo."] };
    mocks.POST.mockReturnValueOnce(ok(saved, 201)).mockReturnValueOnce(ok({ ...saved, personalTransactionId: 901 }, 201));
    open();
    const sheet = await openNew();

    await userEvent.type(within(sheet).getByLabelText("Pró-labore bruto"), "100000");
    await userEvent.click(within(sheet).getByRole("button", { name: "Registrar retirada" }));

    expect(mocks.POST.mock.calls[0][1].body).toEqual({
      partnerId: 1, kind: "PRO_LABORE", competenceMonth: currentMonth(), paymentDate: todayIso(), grossAmount: 1000,
      inssAmount: undefined, irrfAmount: undefined,
    });
    expect(await within(sheet).findByRole("note")).toHaveTextContent("abaixo do salário mínimo");
    expect(within(sheet).getByRole("option", { name: "Pró-labore (nova)" })).toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole("button", { name: /Lançar R\$\s890,00 nas minhas finanças/ }));

    expect(mocks.POST).toHaveBeenLastCalledWith("/companies/{companyId}/withdrawals/{withdrawalId}/personal-transaction", {
      params: { path: { companyId: 7, withdrawalId: 52 } },
      body: undefined,
    });
    expect(await within(sheet).findByText("Lançada nas suas finanças.")).toBeInTheDocument();
  });

  it("lança numa categoria de receita escolhida; a padrão que já existe aparece sem o (nova)", async () => {
    serve([...CATEGORIES, { id: 32, name: "Pró-labore", type: "INCOME", archived: false, color: "TEAL", icon: "SALARY" }]);
    mocks.POST.mockReturnValue(ok({ ...PRO_LABORE, personalTransactionId: 902 }, 201));
    open();
    await userEvent.click(await screen.findByRole("button", { name: /Pró-labore 10\/2026/ }));
    const sheet = screen.getByRole("dialog", { name: "Pró-labore" });

    const select = await within(sheet).findByLabelText("Categoria nas suas finanças");
    expect(within(select).getByRole("option", { name: "Pró-labore" })).toBeInTheDocument();
    expect(within(select).queryByRole("option", { name: "Mercado" })).not.toBeInTheDocument();
    await userEvent.selectOptions(select, "30");
    await userEvent.click(within(sheet).getByRole("button", { name: /Lançar/ }));

    expect(mocks.POST.mock.calls[0][1].body).toEqual({ categoryId: 30 });
  });

  it("a distribuição de lucros pede o valor e o IRRF opcional, sem mês da folha", async () => {
    mocks.POST.mockReturnValue(ok({ ...PROFIT, id: 53, personalTransactionId: undefined }, 201));
    open();
    const sheet = await openNew();

    await userEvent.click(within(sheet).getByRole("button", { name: "Lucros" }));
    expect(within(sheet).queryByRole("group", { name: "Mês da folha" })).not.toBeInTheDocument();
    await userEvent.type(within(sheet).getByLabelText("Valor distribuído"), "300000");
    await userEvent.click(within(sheet).getByRole("button", { name: "Registrar retirada" }));

    expect(mocks.POST.mock.calls[0][1].body).toEqual({
      partnerId: 1, kind: "DISTRIBUICAO_LUCROS", paymentDate: todayIso(), grossAmount: 3000, irrfAmount: undefined,
    });
  });

  it("no MEI: sem pró-labore planejado nem escolha de tipo, só a distribuição", async () => {
    open({ taxRegime: "SIMEI" });
    const sheet = await openNew();

    expect(screen.queryByText("Pró-labore planejado")).not.toBeInTheDocument();
    expect(within(sheet).queryByRole("group", { name: "Tipo de retirada" })).not.toBeInTheDocument();
    expect(within(sheet).getByLabelText("Valor distribuído")).toBeInTheDocument();
  });

  it("antes de 2026 pede o INSS e o IRRF do holerite", async () => {
    mocks.POST.mockReturnValue(ok({ ...PRO_LABORE, calculated: false }, 201));
    open();
    const sheet = await openNew();
    const month = within(sheet).getByRole("group", { name: "Mês da folha" });
    const previous = within(month).getByRole("button", { name: /anterior/i });
    while (!within(sheet).queryByLabelText("INSS retido")) await userEvent.click(previous);

    await userEvent.type(within(sheet).getByLabelText("Pró-labore bruto"), "500000");
    await userEvent.type(within(sheet).getByLabelText("INSS retido"), "55000");
    await userEvent.type(within(sheet).getByLabelText("IRRF retido"), "40050");
    await userEvent.click(within(sheet).getByRole("button", { name: "Registrar retirada" }));

    expect(mocks.POST.mock.calls[0][1].body).toMatchObject({ competenceMonth: "2025-12", grossAmount: 5000, inssAmount: 550, irrfAmount: 400.5 });
  });

  it("excluir uma retirada lançada pergunta pelo lançamento", async () => {
    mocks.DELETE.mockReturnValue(Promise.resolve({ response: new Response(null, { status: 204 }) }));
    open();
    await userEvent.click(await screen.findByRole("button", { name: /^Lucros/ }));
    const sheet = screen.getByRole("dialog", { name: "Distribuição de lucros" });
    expect(within(sheet).getByText("Lançada nas suas finanças.")).toBeInTheDocument();

    await userEvent.click(within(sheet).getByRole("button", { name: "Excluir retirada" }));
    expect(within(sheet).getByText(/Excluir também o lançamento\?/)).toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole("button", { name: "Excluir as duas" }));

    expect(mocks.DELETE).toHaveBeenCalledWith("/companies/{companyId}/withdrawals/{withdrawalId}", {
      params: { path: { companyId: 7, withdrawalId: 51 }, query: { deletePersonal: true } },
    });
  });

  it("excluir mostra a recusa da API", async () => {
    mocks.DELETE.mockReturnValue(problem(404, "Retirada não encontrada."));
    open();
    await userEvent.click(await screen.findByRole("button", { name: /Pró-labore 10\/2026/ }));
    const sheet = screen.getByRole("dialog", { name: "Pró-labore" });

    await userEvent.click(within(sheet).getByRole("button", { name: "Excluir retirada" }));
    await userEvent.click(within(sheet).getByRole("button", { name: "Excluir" }));

    expect(await within(sheet).findByRole("alert")).toHaveTextContent("Retirada não encontrada.");
  });

  it("empresa arquivada só consulta", async () => {
    open({ archived: true });
    await screen.findByText("Sem pró-labore planejado");

    expect(screen.queryByRole("button", { name: "Registrar retirada" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Planejar/ })).not.toBeInTheDocument();
  });
});
