import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RevenueCard } from "./RevenueCard";

const mocks = vi.hoisted(() => ({ GET: vi.fn() }));
vi.mock("../../shared/api/client", () => ({ api: mocks }));

const ok = (data: unknown) => Promise.resolve({ data, response: new Response(null, { status: 200 }) });

function revenue(granularity: string, points: { start: string; end: string; amount: number; invoices: number }[]) {
  return { granularity, from: points[0]?.start, to: points.at(-1)?.end, total: points.reduce((s, p) => s + p.amount, 0), points };
}

function open() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <RevenueCard companyId={7} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => mocks.GET.mockReset());

describe("receita da empresa", () => {
  it("mostra o total, o período atual, o maior e os valores numa tabela para leitor de tela", async () => {
    mocks.GET.mockReturnValue(ok(revenue("MONTH", [
      { start: "2026-09-01", end: "2026-09-30", amount: 12000, invoices: 2 },
      { start: "2026-10-01", end: "2026-10-31", amount: 9500, invoices: 1 },
      { start: "2026-11-01", end: "2026-11-30", amount: 4200, invoices: 1 },
    ])));
    open();

    expect(await screen.findByText("R$ 25.700,00")).toBeInTheDocument();
    // No destaque e na linha da tabela para leitor de tela.
    expect(screen.getAllByText("Novembro de 2026")).toHaveLength(2);
    expect(screen.getByText("Maior: Setembro de 2026")).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Receita por período" });
    expect(within(table).getAllByRole("row")).toHaveLength(4);
  });

  it("por padrão agrupa por mês, e trocar para dia busca os últimos 30 dias", async () => {
    mocks.GET.mockReturnValue(ok(revenue("MONTH", [{ start: "2026-11-01", end: "2026-11-30", amount: 100, invoices: 1 }])));
    open();
    await screen.findByText("nos últimos 12 meses");
    expect(mocks.GET.mock.calls[0][1].params.query.granularity).toBe("MONTH");

    await userEvent.click(screen.getByRole("button", { name: "Dia" }));

    expect(screen.getByRole("button", { name: "Dia" })).toHaveAttribute("aria-pressed", "true");
    expect(mocks.GET.mock.calls.at(-1)![1].params.query.granularity).toBe("DAY");
  });

  it("sem nota ativa no período, aponta para as notas fiscais", async () => {
    mocks.GET.mockReturnValue(ok(revenue("MONTH", [{ start: "2026-11-01", end: "2026-11-30", amount: 0, invoices: 0 }])));
    open();

    expect(await screen.findByText(/Nenhuma nota ativa nos últimos 12 meses/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "notas fiscais" })).toHaveAttribute("href", "/invoices");
  });
});
