import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { archiveIn, insertByName, useArchiveCategory, useCreateCategory, type Category } from "./categoriesApi";
import { ToastProvider } from "../../shared/toast/ToastProvider";

const mocks = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn() }));
vi.mock("../../shared/api/client", () => ({ api: mocks }));

const HOME: Category = { id: 1, name: "Moradia", type: "EXPENSE", archived: false, createdAt: "" } as Category;
const GYM: Category = { id: 2, name: "Academia", type: "EXPENSE", archived: false, createdAt: "" } as Category;

let queryClient: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <ToastProvider>{children}</ToastProvider>
  </QueryClientProvider>
);

const all = () => queryClient.getQueryData<Category[]>(["categories", { includeArchived: true }]);
const active = () => queryClient.getQueryData<Category[]>(["categories", { includeArchived: false }]);

beforeEach(() => {
  vi.clearAllMocks();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  queryClient.setQueryData(["categories", { includeArchived: true }], [HOME, GYM]);
  queryClient.setQueryData(["categories", { includeArchived: false }], [HOME, GYM]);
  mocks.GET.mockImplementation(() => new Promise(() => {}));
});

describe("archiveIn", () => {
  it("marca na lista completa e tira da lista de ativas", () => {
    expect(archiveIn([HOME, GYM], 2, true)).toEqual([HOME, { ...GYM, archived: true }]);
    expect(archiveIn([HOME, GYM], 2, false)).toEqual([HOME]);
  });
});

describe("arquivar categoria", () => {
  it("vai para as arquivadas antes de o servidor responder", async () => {
    mocks.POST.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useArchiveCategory(), { wrapper });

    act(() => result.current.mutate(2));

    await waitFor(() => expect(active()).toEqual([HOME]));
    expect(all()?.find((category) => category.id === 2)?.archived).toBe(true);
  });

  it("se o servidor recusar, volta para as ativas e um aviso diz o motivo", async () => {
    mocks.POST.mockResolvedValue({ error: { detail: "Categoria não encontrada." }, response: new Response(null, { status: 404 }) });
    render(<div />, { wrapper });
    const { result } = renderHook(() => useArchiveCategory(), { wrapper });

    act(() => result.current.mutate(2));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(active()).toEqual([HOME, GYM]);
    expect(all()).toEqual([HOME, GYM]);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível arquivar a categoria. Categoria não encontrada.",
    );
  });
});

describe("insertByName", () => {
  it("põe a categoria nova na ordem por nome, como a API devolve", () => {
    const fun = { ...HOME, id: 3, name: "Lazer" };
    expect(insertByName([GYM, HOME], fun).map((c) => c.name)).toEqual(["Academia", "Lazer", "Moradia"]);
  });

  it("não duplica uma categoria que a lista já tem", () => {
    expect(insertByName([GYM, HOME], GYM)).toEqual([GYM, HOME]);
  });
});

describe("criar categoria", () => {
  it("entra nas listas do cache assim que o servidor responde, sem esperar a nova busca", async () => {
    const fun = { ...HOME, id: 3, name: "Lazer" };
    mocks.POST.mockResolvedValue({ data: fun, response: new Response(null, { status: 201 }) });
    const { result } = renderHook(() => useCreateCategory(), { wrapper });

    act(() => result.current.mutate({ name: "Lazer", type: "EXPENSE" }));

    await waitFor(() => expect(active()?.map((c) => c.name)).toEqual(["Moradia", "Academia", "Lazer"].sort()));
    expect(all()?.map((c) => c.id)).toContain(3);
  });
});
