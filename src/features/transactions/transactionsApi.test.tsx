import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCreateTransaction, useDeleteTransaction, useUpdateTransaction, type Transaction } from "./transactionsApi";
import { ToastProvider } from "../../shared/toast/ToastProvider";
import { CelebrateProvider } from "../../shared/celebrate/CelebrateProvider";
import type { Goal } from "../goals/goalsApi";

const mocks = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock("../../shared/api/client", () => ({ api: mocks }));

/** Uma resposta que só chega quando o teste mandar: é o intervalo em que a tela é otimista. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

const ok = (data: unknown, status = 200) => ({ data, response: new Response(null, { status }) });
const problem = (status: number, detail: string) => ({ error: { detail }, response: new Response(null, { status }) });

function tx(id: number, transactionDate: string, extra: Partial<Transaction> = {}): Transaction {
  return { id, categoryId: 1, amount: 100, transactionDate, createdAt: "", updatedAt: "", ...extra };
}

const GOAL: Goal = {
  id: 7, name: "Viagem", targetAmount: 1000, deadline: "2027-06-30", saved: 300, remaining: 700,
  monthsLeft: 8, monthlyNeeded: 87.5, status: "IN_PROGRESS",
};

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <CelebrateProvider>{children}</CelebrateProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

/** O toast é renderizado pelo provider, fora do hook: este componente o põe na tela do teste. */
function renderToasts() {
  render(<div />, { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  queryClient.setQueryData(["transactions", "2026-10"], [tx(9, "2026-10-20"), tx(8, "2026-10-12")]);
  queryClient.setQueryData(["goals"], [GOAL]);
  // Depois de cada mutação o cache é recarregado; aqui o "servidor" devolve o que já estava.
  mocks.GET.mockImplementation((path: string) =>
    Promise.resolve(ok(path === "/goals" ? queryClient.getQueryData(["goals"]) : [])),
  );
});

const october = () => queryClient.getQueryData<Transaction[]>(["transactions", "2026-10"]);
const november = () => queryClient.getQueryData<Transaction[]>(["transactions", "2026-11"]);
const goal = () => queryClient.getQueryData<Goal[]>(["goals"])?.[0];

describe("criar transação", () => {
  it("aparece no extrato e soma na meta antes de o servidor responder", async () => {
    const response = deferred<ReturnType<typeof ok>>();
    mocks.POST.mockReturnValue(response.promise);
    const { result } = renderHook(() => useCreateTransaction(), { wrapper });

    act(() => result.current.mutate({ categoryId: 3, goalId: 7, amount: 50, transactionDate: "2026-10-20" }));

    await waitFor(() => expect(october()).toHaveLength(3));
    expect(october()?.[0]).toMatchObject({ amount: 50, transactionDate: "2026-10-20" });
    expect(october()?.[0].id).toBeLessThan(0);
    expect(goal()).toMatchObject({ saved: 350, remaining: 650 });

    response.resolve(ok(tx(10, "2026-10-20"), 201));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("se o servidor recusar, a transação some, a meta volta e um aviso diz o motivo", async () => {
    mocks.POST.mockResolvedValue(problem(409, "Esta categoria está arquivada."));
    renderToasts();
    const { result } = renderHook(() => useCreateTransaction(), { wrapper });

    act(() => result.current.mutate({ categoryId: 3, goalId: 7, amount: 50, transactionDate: "2026-10-20" }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(october()?.map((item) => item.id)).toEqual([9, 8]);
    expect(goal()).toMatchObject({ saved: 300, remaining: 700 });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível salvar a transação. Esta categoria está arquivada.",
    );
  });

  it("um mês que não está no cache não é criado do nada", async () => {
    mocks.POST.mockResolvedValue(ok(tx(10, "2026-12-01"), 201));
    const { result } = renderHook(() => useCreateTransaction(), { wrapper });

    act(() => result.current.mutate({ categoryId: 3, amount: 50, transactionDate: "2026-12-01" }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(["transactions", "2026-12"])).toBeUndefined();
  });

  it("depois da resposta, recarrega o que a transação afeta", async () => {
    queryClient.setQueryData(["dashboard", "monthly-totals", 1], {});
    mocks.POST.mockResolvedValue(ok(tx(10, "2026-10-20"), 201));
    const { result } = renderHook(() => useCreateTransaction(), { wrapper });

    act(() => result.current.mutate({ categoryId: 3, amount: 50, transactionDate: "2026-10-20" }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryState(["dashboard", "monthly-totals", 1])?.isInvalidated).toBe(true);
  });
});

describe("editar transação", () => {
  it("mudar a data para outro mês tira de um extrato e põe no outro, na hora", async () => {
    queryClient.setQueryData(["transactions", "2026-11"], [tx(20, "2026-11-02")]);
    mocks.PUT.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useUpdateTransaction(), { wrapper });

    act(() =>
      result.current.mutate({ id: 8, body: { categoryId: 1, amount: 100, transactionDate: "2026-11-05" } }),
    );

    await waitFor(() => expect(october()?.map((item) => item.id)).toEqual([9]));
    expect(november()?.map((item) => item.id)).toEqual([8, 20]);
  });

  it("trocar o valor de um aporte ajusta a meta pela diferença", async () => {
    queryClient.setQueryData(["transactions", "2026-10"], [tx(9, "2026-10-20", { goalId: 7, amount: 100 })]);
    mocks.PUT.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useUpdateTransaction(), { wrapper });

    act(() =>
      result.current.mutate({ id: 9, body: { categoryId: 1, goalId: 7, amount: 250, transactionDate: "2026-10-20" } }),
    );

    await waitFor(() => expect(goal()).toMatchObject({ saved: 450 }));
  });
});

describe("apagar transação", () => {
  it("some do extrato na hora e volta se o servidor recusar", async () => {
    const response = deferred<ReturnType<typeof problem>>();
    mocks.DELETE.mockReturnValue(response.promise);
    renderToasts();
    const { result } = renderHook(() => useDeleteTransaction(), { wrapper });

    act(() => result.current.mutate(9));
    await waitFor(() => expect(october()?.map((item) => item.id)).toEqual([8]));

    response.resolve(problem(404, "Transação não encontrada."));
    await waitFor(() => expect(october()?.map((item) => item.id)).toEqual([9, 8]));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível apagar a transação. Transação não encontrada.",
    );
  });
});

describe("microinterações", () => {
  it("salvar mostra o check de salvo, só depois que o servidor confirma", async () => {
    const response = deferred<ReturnType<typeof ok>>();
    mocks.POST.mockReturnValue(response.promise);
    renderToasts();
    const { result } = renderHook(() => useCreateTransaction(), { wrapper });

    act(() => result.current.mutate({ categoryId: 3, amount: 50, transactionDate: "2026-10-20" }));
    await waitFor(() => expect(october()).toHaveLength(3));
    expect(screen.queryByText("Transação salva.")).not.toBeInTheDocument();

    response.resolve(ok(tx(10, "2026-10-20"), 201));
    const toast = await screen.findByRole("status");
    expect(toast).toHaveTextContent("Transação salva.");
    expect(toast.querySelector("[data-check]")).not.toBeNull();
  });

  it("um aporte que conclui a meta solta confete e avisa", async () => {
    mocks.POST.mockResolvedValue(ok(tx(10, "2026-10-20", { goalId: 7, amount: 700 }), 201));
    renderToasts();
    const { result } = renderHook(() => useCreateTransaction(), { wrapper });

    act(() => result.current.mutate({ categoryId: 3, goalId: 7, amount: 700, transactionDate: "2026-10-20" }));

    expect(await screen.findByText("Você chegou à meta Viagem!")).toBeInTheDocument();
    expect(document.querySelector("[data-confetti]")).not.toBeNull();
  });

  it("um aporte que não conclui a meta não solta confete", async () => {
    mocks.POST.mockResolvedValue(ok(tx(10, "2026-10-20", { goalId: 7, amount: 50 }), 201));
    renderToasts();
    const { result } = renderHook(() => useCreateTransaction(), { wrapper });

    act(() => result.current.mutate({ categoryId: 3, goalId: 7, amount: 50, transactionDate: "2026-10-20" }));

    await screen.findByText("Transação salva.");
    expect(document.querySelector("[data-confetti]")).toBeNull();
  });

  it("se o servidor recusar, não há comemoração", async () => {
    mocks.POST.mockResolvedValue(problem(409, "Esta categoria está arquivada."));
    renderToasts();
    const { result } = renderHook(() => useCreateTransaction(), { wrapper });

    act(() => result.current.mutate({ categoryId: 3, goalId: 7, amount: 700, transactionDate: "2026-10-20" }));

    await screen.findByRole("alert");
    expect(screen.queryByText(/Você chegou à meta/)).not.toBeInTheDocument();
    expect(document.querySelector("[data-confetti]")).toBeNull();
  });
});
