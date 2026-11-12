import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountantPage } from "./AccountantPage";

const mocks = vi.hoisted(() => ({ GET: vi.fn(), saveBlob: vi.fn() }));
vi.mock("../../shared/api/client", () => ({ api: { GET: mocks.GET } }));
vi.mock("../../shared/lib/download", async (original) => ({
  ...(await original<typeof import("../../shared/lib/download")>()),
  saveBlob: mocks.saveBlob,
}));

const ok = (data: unknown) => Promise.resolve({ data, response: new Response(null, { status: 200 }) });

const INVOICES = [
  { id: 1, competenceDate: "2026-10-31", status: "ATIVA" },
  { id: 2, competenceDate: "2026-10-31", status: "CANCELADA" },
  { id: 3, competenceDate: "2026-09-30", status: "ATIVA" },
];
const EXPENSES = {
  month: "2026-10", paidTotal: 320, pendingTotal: 0,
  items: [
    { kind: "ONE_OFF", expenseId: 5, name: "Cadeira", categoryId: 1, amount: 200, date: "2026-10-15", status: "PAID", hasReceipt: true },
    { kind: "RECURRING", expenseId: 6, name: "Nuvem", categoryId: 1, amount: 120, date: "2026-10-05", status: "PAID", hasReceipt: false },
    { kind: "RECURRING", expenseId: null, name: "Aluguel", categoryId: 2, amount: 900, date: "2026-10-10", status: "OVERDUE", hasReceipt: false },
  ],
};
const WITHDRAWALS = [{ id: 1, paymentDate: "2026-10-30" }, { id: 2, paymentDate: "2026-09-30" }];

function serve(zip: () => Promise<unknown> = () => Promise.resolve({
  data: new Blob(["PK"]),
  response: new Response(null, { status: 200, headers: { "Content-Disposition": "attachment; filename=\"ana-design_2026-10.zip\"" } }),
})) {
  mocks.GET.mockImplementation((path: string) => {
    if (path === "/companies/{companyId}/invoices") return ok(INVOICES);
    if (path === "/companies/{companyId}/expenses") return ok(EXPENSES);
    if (path === "/companies/{companyId}/withdrawals") return ok(WITHDRAWALS);
    if (path === "/companies/{companyId}/accountant-package") return zip();
    throw new Error(`GET inesperado: ${path}`);
  });
}

function open(openingDate = "2026-01-01") {
  const router = createMemoryRouter(
    [{ path: "/companies/7", element: <Outlet context={{ id: 7, openingDate, archived: false }} />,
      children: [{ path: "accountant", element: <AccountantPage /> }, { path: "expenses", element: <p>despesas</p> }] }],
    { initialEntries: ["/companies/7/accountant"] },
  );
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

// Com chaves: devolver o mock faria o vitest tratá-lo como limpeza e chamá-lo depois do teste.
beforeEach(() => {
  mocks.GET.mockReset();
  mocks.saveBlob.mockReset();
  vi.useFakeTimers({ shouldAdvanceTime: true, now: new Date(2026, 10, 12, 12) });
});
afterEach(() => {
  vi.useRealTimers();
});

describe("aba Contador", () => {
  it("começa no mês anterior e mostra o que vai no pacote, com as despesas sem comprovante", async () => {
    serve();
    open();

    const list = await screen.findByRole("list", { name: "O que vai no pacote" });
    expect(screen.getByText("Outubro de 2026")).toBeInTheDocument();
    const items = within(list).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("2 notas fiscais (1 cancelada, numa pasta própria), e o notas.csv");
    expect(items[1]).toHaveTextContent("2 despesas pagas · 1 com comprovante, e o despesas.csv");
    expect(items[1]).toHaveTextContent("Sem comprovante: Nuvem.");
    expect(within(items[1]).getByRole("link", { name: "Anexar nas despesas" })).toHaveAttribute("href", "/companies/7/expenses");
    expect(items[3]).toHaveTextContent("1 retirada paga no mês");
  });

  it("baixa o ZIP do mês com o nome que a API dá", async () => {
    serve();
    open();

    await userEvent.click(await screen.findByRole("button", { name: "Baixar o pacote de outubro (ZIP)" }));
    expect(mocks.GET).toHaveBeenCalledWith("/companies/{companyId}/accountant-package",
      { params: { path: { companyId: 7 }, query: { month: "2026-10" } }, parseAs: "blob" });
    await vi.waitFor(() => expect(mocks.saveBlob).toHaveBeenCalledWith(expect.any(Blob), "ana-design_2026-10.zip"));
  });

  it("no limite de uso, diz quanto esperar e trava o botão", async () => {
    serve(() => Promise.resolve({
      error: { status: 429, title: "Muitas tentativas", detail: "Muitas tentativas.", retryAfterSeconds: 40 },
      response: new Response(null, { status: 429 }),
    }));
    open();

    await userEvent.click(await screen.findByRole("button", { name: /Baixar o pacote/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Muitos pacotes seguidos. Tente de novo em 40 s.");
    expect(screen.getByRole("button", { name: /Baixar o pacote/ })).toBeDisabled();
  });

  it("antes da abertura não há pacote", async () => {
    serve();
    open("2026-11-03");

    // Aberta em novembro: começa em novembro; voltar para outubro sai do intervalo.
    expect(await screen.findByText("Novembro de 2026")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /anterior/i }));
    expect(screen.getByText(/O pacote vai de novembro de 2026 \(a abertura\) até o mês corrente\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Baixar o pacote/ })).toBeDisabled();
  });
});
