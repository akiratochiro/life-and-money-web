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
const WITHDRAWAL = {
  id: 50, partnerId: 1, kind: "PRO_LABORE", competenceMonth: "2026-10", paymentDate: "2026-10-30",
  grossAmount: 7000, inssAmount: 770, irrfAmount: 757.91, netAmount: 5472.09, calculated: true, warnings: [],
};

function serve() {
  mocks.GET.mockImplementation((path: string) => {
    if (path === "/companies/{companyId}/partners") return ok(PARTNERS);
    if (path === "/companies/{companyId}/pro-labore-plans") return ok([{ partnerId: 1, grossAmount: 7000, validFrom: "2026-11" }]);
    if (path === "/companies/{companyId}/withdrawals") return ok([WITHDRAWAL]);
    throw new Error(`GET inesperado: ${path}`);
  });
}

function open(archived = false) {
  const router = createMemoryRouter(
    [{ path: "/c", element: <Outlet context={{ id: 7, archived }} />, children: [{ index: true, element: <WithdrawalsPage /> }] }],
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

describe("aba Retiradas", () => {
  it("mostra o planejado de cada sócio e os pagos do ano com INSS, IRRF e líquido", async () => {
    open();

    expect(await screen.findByText(/por mês, desde 11\/2026/)).toBeInTheDocument();
    expect(screen.getByText("Sem pró-labore planejado")).toBeInTheDocument();
    const list = await screen.findByRole("list", { name: `Pró-labores de ${new Date().getFullYear()}` });
    expect(within(list).getByText(/Pró-labore 10\/2026 · Ana/)).toBeInTheDocument();
    expect(within(list).getByText(/IRRF R\$\s757,91/)).toBeInTheDocument();
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

  it("registrar manda o bruto sem INSS e IRRF, e mostra os avisos da API antes de fechar", async () => {
    mocks.POST.mockReturnValue(ok({ ...WITHDRAWAL, id: 51, grossAmount: 1000, warnings: ["O pró-labore está abaixo do salário mínimo."] }, 201));
    open();
    await userEvent.click(await screen.findByRole("button", { name: "Registrar pró-labore" }));
    const sheet = screen.getByRole("dialog", { name: "Registrar pró-labore" });

    await userEvent.type(within(sheet).getByLabelText("Pró-labore bruto"), "100000");
    await userEvent.click(within(sheet).getByRole("button", { name: "Registrar pró-labore" }));

    expect(mocks.POST.mock.calls[0][1].body).toEqual({
      partnerId: 1, kind: "PRO_LABORE", competenceMonth: currentMonth(), paymentDate: todayIso(), grossAmount: 1000,
      inssAmount: undefined, irrfAmount: undefined,
    });
    expect(await within(sheet).findByRole("note")).toHaveTextContent("abaixo do salário mínimo");
  });

  it("antes de 2026 pede o INSS e o IRRF do holerite", async () => {
    mocks.POST.mockReturnValue(ok({ ...WITHDRAWAL, calculated: false }, 201));
    open();
    await userEvent.click(await screen.findByRole("button", { name: "Registrar pró-labore" }));
    const sheet = screen.getByRole("dialog", { name: "Registrar pró-labore" });
    const month = within(sheet).getByRole("group", { name: "Mês da folha" });
    const previous = within(month).getByRole("button", { name: /anterior/i });
    while (!within(sheet).queryByLabelText("INSS retido")) await userEvent.click(previous);

    await userEvent.type(within(sheet).getByLabelText("Pró-labore bruto"), "500000");
    await userEvent.type(within(sheet).getByLabelText("INSS retido"), "55000");
    await userEvent.type(within(sheet).getByLabelText("IRRF retido"), "40050");
    await userEvent.click(within(sheet).getByRole("button", { name: "Registrar pró-labore" }));

    expect(mocks.POST.mock.calls[0][1].body).toMatchObject({ competenceMonth: "2025-12", grossAmount: 5000, inssAmount: 550, irrfAmount: 400.5 });
  });

  it("excluir pede confirmação e mostra a recusa da API", async () => {
    mocks.DELETE.mockReturnValue(problem(404, "Retirada não encontrada."));
    open();
    await userEvent.click(await screen.findByRole("button", { name: /Pró-labore 10\/2026/ }));
    const sheet = screen.getByRole("dialog", { name: "Pró-labore" });

    await userEvent.click(within(sheet).getByRole("button", { name: "Excluir pró-labore" }));
    await userEvent.click(within(sheet).getByRole("button", { name: "Excluir" }));

    expect(await within(sheet).findByRole("alert")).toHaveTextContent("Retirada não encontrada.");
  });

  it("empresa arquivada só consulta", async () => {
    open(true);
    await screen.findByText("Sem pró-labore planejado");

    expect(screen.queryByRole("button", { name: "Registrar pró-labore" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Planejar/ })).not.toBeInTheDocument();
  });
});
