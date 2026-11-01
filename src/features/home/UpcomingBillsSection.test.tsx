import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UpcomingBillsSection } from "./UpcomingBillsSection";
import { PrivacyProvider } from "../../shared/privacy/PrivacyProvider";
import type { BillOccurrence } from "../bills/billsApi";

const mocks = vi.hoisted(() => ({ GET: vi.fn() }));
vi.mock("../../shared/api/client", () => ({ api: mocks }));

function occurrence(overrides: Partial<BillOccurrence>): BillOccurrence {
  return {
    billId: 1,
    month: "2026-11",
    dueDate: "2026-11-16",
    name: "Aluguel",
    categoryId: 1,
    type: "EXPENSE",
    recurrence: "MONTHLY",
    expectedAmount: 1500,
    status: "PENDING",
    ...overrides,
  };
}

function respond(data: BillOccurrence[]) {
  mocks.GET.mockReturnValue(Promise.resolve({ data, response: new Response(null, { status: 200 }) }));
}

function open() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <PrivacyProvider>
        <MemoryRouter>
          <UpcomingBillsSection />
        </MemoryRouter>
      </PrivacyProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 15, 12, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("UpcomingBillsSection", () => {
  it("põe as atrasadas primeiro e depois o que vence mais cedo", async () => {
    respond([
      occurrence({ billId: 1, name: "Escola", dueDate: "2026-11-20" }),
      occurrence({ billId: 2, name: "Aluguel", dueDate: "2026-11-10", status: "OVERDUE" }),
      occurrence({ billId: 3, name: "Cliente X", dueDate: "2026-11-16", type: "INCOME" }),
    ]);
    open();

    const items = await screen.findAllByRole("listitem");
    expect(items.map((item) => within(item).getByText(/Aluguel|Escola|Cliente X/).textContent)).toEqual([
      "Aluguel",
      "Cliente X",
      "Escola",
    ]);
    expect(within(items[0]).getByText("Atrasada")).toBeInTheDocument();
    expect(within(items[1]).getByText(/A receber/)).toBeInTheDocument();
    expect(mocks.GET).toHaveBeenCalledWith("/bills/upcoming");
  });

  it("mostra até quatro e leva para a tela de contas com o resto", async () => {
    respond(
      Array.from({ length: 6 }, (_, index) =>
        occurrence({ billId: index + 1, name: `Conta ${index + 1}`, dueDate: `2026-11-${16 + index}` }),
      ),
    );
    open();

    expect(await screen.findAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByRole("link", { name: "Mais 2 contas" })).toHaveAttribute("href", "/bills");
  });

  it("sem nada vencendo, ainda mostra o caminho até o calendário", async () => {
    respond([]);
    open();

    expect(await screen.findByText("Nada vence nos próximos 7 dias.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver o calendário de contas" })).toHaveAttribute("href", "/bills");
  });
});
