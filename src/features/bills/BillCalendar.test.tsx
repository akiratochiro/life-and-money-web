import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BillCalendar } from "./BillCalendar";
import type { BillOccurrence } from "./billsApi";

function occurrence(overrides: Partial<BillOccurrence>): BillOccurrence {
  return {
    billId: 1,
    month: "2026-11",
    dueDate: "2026-11-10",
    name: "Aluguel",
    categoryId: 1,
    type: "EXPENSE",
    recurrence: "MONTHLY",
    expectedAmount: 1500,
    status: "PENDING",
    ...overrides,
  };
}

function days() {
  return screen.getAllByRole("button").filter((button) => button.closest('[aria-label="Dias do mês"]'));
}

describe("BillCalendar", () => {
  it("mostra um botão por dia e começa o mês na coluna certa", () => {
    render(<BillCalendar month="2026-08" occurrences={[]} today="2026-08-15" selectedDay={null} onSelectDay={vi.fn()} />);

    expect(days()).toHaveLength(31);
    // 1º/08/2026 é um sábado: sétima coluna
    expect(days()[0]).toHaveStyle({ gridColumnStart: "7" });
  });

  it("descreve cada dia pelo status das contas, para quem usa leitor de tela", () => {
    render(
      <BillCalendar
        month="2026-11"
        occurrences={[
          occurrence({ billId: 1, dueDate: "2026-11-10", status: "OVERDUE" }),
          occurrence({ billId: 2, dueDate: "2026-11-10", status: "PAID" }),
          occurrence({ billId: 3, dueDate: "2026-11-20", status: "PENDING" }),
        ]}
        today="2026-11-15"
        selectedDay={null}
        onSelectDay={vi.fn()}
      />,
    );

    const tenth = screen.getByRole("button", { name: "10 de novembro: 1 atrasada, 1 paga" });
    expect(tenth.querySelector('[data-status="OVERDUE"]')).not.toBeNull();
    expect(tenth.querySelector('[data-status="PAID"]')).not.toBeNull();
    expect(tenth.querySelector('[data-status="PENDING"]')).toBeNull();
    expect(screen.getByRole("button", { name: "20 de novembro: 1 pendente" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "15 de novembro" })).toHaveAttribute("aria-current", "date");
  });

  it("uma conta do dia 31 em fevereiro aparece no dia 28", () => {
    // A API já manda o vencimento ajustado; o calendário só precisa ter o dia 28 como último.
    render(
      <BillCalendar
        month="2027-02"
        occurrences={[occurrence({ month: "2027-02", dueDate: "2027-02-28" })]}
        today="2026-11-15"
        selectedDay={null}
        onSelectDay={vi.fn()}
      />,
    );

    expect(days()).toHaveLength(28);
    expect(screen.getByRole("button", { name: "28 de fevereiro: 1 pendente" })).toBeInTheDocument();
  });

  it("tocar num dia seleciona; tocar de novo limpa", async () => {
    const onSelectDay = vi.fn();
    const { rerender } = render(
      <BillCalendar month="2026-11" occurrences={[]} today="2026-11-15" selectedDay={null} onSelectDay={onSelectDay} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "20 de novembro" }));
    expect(onSelectDay).toHaveBeenLastCalledWith("2026-11-20");

    rerender(
      <BillCalendar month="2026-11" occurrences={[]} today="2026-11-15" selectedDay="2026-11-20" onSelectDay={onSelectDay} />,
    );
    expect(screen.getByRole("button", { name: "20 de novembro" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "20 de novembro" }));
    expect(onSelectDay).toHaveBeenLastCalledWith(null);
  });
});
