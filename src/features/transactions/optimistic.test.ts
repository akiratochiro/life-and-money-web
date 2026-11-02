import { describe, expect, it } from "vitest";
import { applyToGoal, insertTransaction, monthOf, provisionalTransaction, removeTransaction } from "./optimistic";
import type { Transaction } from "./transactionsApi";
import type { Goal } from "../goals/goalsApi";

function tx(id: number, transactionDate: string): Transaction {
  return { id, categoryId: 1, amount: 10, transactionDate, createdAt: "", updatedAt: "" };
}

const goal: Goal = {
  id: 7, name: "Viagem", targetAmount: 1000, deadline: "2027-06-30", saved: 900, remaining: 100,
  monthsLeft: 8, monthlyNeeded: 12.5, status: "IN_PROGRESS",
};

describe("insertTransaction", () => {
  // O extrato vem do servidor ordenado por data decrescente e, no mesmo dia, pelo id decrescente.
  const list = [tx(9, "2026-10-20"), tx(5, "2026-10-20"), tx(8, "2026-10-12"), tx(2, "2026-10-01")];

  it("um lançamento novo vai para o topo do seu dia", () => {
    const result = insertTransaction(list, tx(-1, "2026-10-20"));
    expect(result.map((item) => item.id)).toEqual([-1, 9, 5, 8, 2]);
  });

  it("um dia que ainda não existia entra na posição da data", () => {
    const result = insertTransaction(list, tx(-1, "2026-10-15"));
    expect(result.map((item) => item.id)).toEqual([9, 5, -1, 8, 2]);
  });

  it("uma transação editada volta para o lugar que o servidor daria a ela pelo id", () => {
    const result = insertTransaction(removeTransaction(list, 5), tx(5, "2026-10-12"));
    expect(result.map((item) => item.id)).toEqual([9, 8, 5, 2]);
  });

  it("a mais antiga vai para o fim", () => {
    expect(insertTransaction(list, tx(-1, "2026-09-30")).at(-1)?.id).toBe(-1);
  });

  it("não altera a lista original", () => {
    insertTransaction(list, tx(-1, "2026-10-20"));
    expect(list).toHaveLength(4);
  });
});

describe("provisionalTransaction", () => {
  it("tem a forma da resposta do servidor, com id negativo", () => {
    const result = provisionalTransaction(
      { categoryId: 3, amount: 120.5, transactionDate: "2026-10-31", description: "  Mercado  " },
      -4,
      new Date("2026-10-31T15:00:00Z"),
    );
    expect(result).toEqual({
      id: -4, categoryId: 3, goalId: undefined, amount: 120.5, transactionDate: "2026-10-31",
      description: "Mercado", createdAt: "2026-10-31T15:00:00.000Z", updatedAt: "2026-10-31T15:00:00.000Z",
    });
    expect(monthOf(result.transactionDate)).toBe("2026-10");
  });
});

describe("applyToGoal", () => {
  it("um aporte soma ao guardado e tira do que falta", () => {
    const [result] = applyToGoal([goal], 7, 50);
    expect(result).toMatchObject({ saved: 950, remaining: 50, status: "IN_PROGRESS" });
  });

  it("chegar ao alvo conclui a meta, e o que falta nunca fica negativo", () => {
    const [result] = applyToGoal([goal], 7, 250);
    expect(result).toMatchObject({ saved: 1150, remaining: 0, status: "REACHED" });
  });

  it("tirar um aporte de uma meta concluída a reabre", () => {
    const [result] = applyToGoal([{ ...goal, saved: 1000, remaining: 0, status: "REACHED" }], 7, -10);
    expect(result).toMatchObject({ saved: 990, remaining: 10, status: "IN_PROGRESS" });
  });

  it("não acumula erro de ponto flutuante", () => {
    const [result] = applyToGoal([{ ...goal, saved: 0.1 }], 7, 0.2);
    expect(result.saved).toBe(0.3);
  });

  it("sem meta, nada muda", () => {
    expect(applyToGoal([goal], undefined, 50)).toEqual([goal]);
  });
});
